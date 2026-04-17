<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Customer;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\Receivable;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceivableTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private Customer $customer;
    private TransactionCategory $category;
    private CashBankAccount $cashBank;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Piutang'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->customer = Customer::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'PT Maju Bersama',
            'is_active'  => true,
        ]);

        $this->category = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'income')
            ->first();

        $this->cashBank = CashBankAccount::where('company_id', $this->companyId)->first();
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_receivable_list_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/transaksi/piutang')
            ->assertOk();
    }

    public function test_receivable_create_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/transaksi/piutang/buat')
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/transaksi/piutang')->assertRedirect('/login');
        $this->post('/transaksi/piutang', $this->validPayload())->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Store – happy path
    // -----------------------------------------------------------------------

    public function test_valid_receivable_is_stored_and_posted(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload())
            ->assertSessionHas('success');

        $this->assertDatabaseHas('receivables', [
            'company_id'     => $this->companyId,
            'customer_id'    => $this->customer->id,
            'amount'         => 2000000,
            'paid_amount'    => 0,
            'status'         => TransactionStatus::Posted->value,
            'payment_status' => PaymentStatus::Unpaid->value,
            'description'    => 'Invoice jasa desain',
        ]);
    }

    public function test_store_creates_balanced_journal_entry(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload());

        $receivable = Receivable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->assertDatabaseCount('journal_entries', 1);

        $entry = JournalEntry::withoutGlobalScope('company')
            ->where('source_type', Receivable::class)
            ->where('source_id', $receivable->id)
            ->with('lines')
            ->firstOrFail();

        $this->assertEquals(TransactionStatus::Posted, $entry->status);
        $this->assertCount(2, $entry->lines);
        $this->assertEquals(2000000, $entry->lines->sum('debit'));
        $this->assertEquals(2000000, $entry->lines->sum('credit'));
        $this->assertTrue($entry->isBalanced());
    }

    public function test_debit_line_targets_receivable_ledger_account(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload());

        $receivable = Receivable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry     = $receivable->journalEntries()->with('lines.account')->first();
        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);

        $this->assertNotNull($debitLine);
        $this->assertEquals('receivable', $debitLine->account->subtype);
        $this->assertEquals(2000000, (float) $debitLine->debit);
    }

    public function test_credit_line_targets_revenue_account(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload());

        $receivable = Receivable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry      = $receivable->journalEntries()->with('lines.account')->first();
        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);

        $this->assertNotNull($creditLine);
        $this->assertEquals($this->category->account_id, $creditLine->account_id);
    }

    public function test_receivable_without_category_falls_back_to_operating_revenue(): void
    {
        $payload = $this->validPayload();
        unset($payload['category_id']);

        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $payload);

        $receivable = Receivable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry      = $receivable->journalEntries()->with('lines.account')->first();
        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);

        $this->assertEquals('operating_revenue', $creditLine->account->subtype);
    }

    // -----------------------------------------------------------------------
    // Show
    // -----------------------------------------------------------------------

    public function test_show_page_loads(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload());

        $receivable = Receivable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->actingAs($this->user)
            ->get("/transaksi/piutang/{$receivable->id}")
            ->assertOk();
    }

    public function test_cross_company_show_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload());

        $receivable = Receivable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Lain'], $otherUser);
        $otherUser->refresh();

        $this->actingAs($otherUser)
            ->get("/transaksi/piutang/{$receivable->id}")
            ->assertNotFound();
    }

    // -----------------------------------------------------------------------
    // Void
    // -----------------------------------------------------------------------

    public function test_void_changes_status_to_voided(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload());

        $receivable = Receivable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->actingAs($this->user)
            ->post("/transaksi/piutang/{$receivable->id}/batal", ['reason' => 'Batal test'])
            ->assertSessionHas('success');

        $this->assertDatabaseHas('receivables', [
            'id'         => $receivable->id,
            'status'     => TransactionStatus::Voided->value,
            'void_reason' => 'Batal test',
        ]);
    }

    public function test_void_without_reason_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload());

        $receivable = Receivable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->actingAs($this->user)
            ->post("/transaksi/piutang/{$receivable->id}/batal", [])
            ->assertSessionHasErrors('reason');
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_required_fields_are_validated(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', [])
            ->assertSessionHasErrors(['customer_id', 'date', 'due_date', 'amount', 'description']);
    }

    public function test_amount_must_be_at_least_1(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload(['amount' => 0]))
            ->assertSessionHasErrors('amount');
    }

    public function test_date_cannot_be_in_the_future(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload([
                'date' => now()->addDay()->format('Y-m-d'),
            ]))
            ->assertSessionHasErrors('date');
    }

    public function test_due_date_cannot_be_before_date(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload([
                'date'     => now()->format('Y-m-d'),
                'due_date' => now()->subDay()->format('Y-m-d'),
            ]))
            ->assertSessionHasErrors('due_date');
    }

    public function test_customer_from_other_company_is_rejected(): void
    {
        $otherCustomer = $this->createOtherCompanyCustomer();

        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload([
                'customer_id' => $otherCustomer->id,
            ]))
            ->assertSessionHasErrors('customer_id');

        $this->assertDatabaseCount('receivables', 0);
    }

    public function test_inactive_customer_is_rejected(): void
    {
        $inactive = Customer::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'Nonaktif',
            'is_active'  => false,
        ]);

        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload([
                'customer_id' => $inactive->id,
            ]))
            ->assertSessionHasErrors('customer_id');
    }

    public function test_category_from_other_company_is_rejected(): void
    {
        $otherCategory = $this->createOtherCompanyCategory();

        $this->actingAs($this->user)
            ->post('/transaksi/piutang', $this->validPayload([
                'category_id' => $otherCategory->id,
            ]))
            ->assertSessionHasErrors('category_id');
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'customer_id' => $this->customer->id,
            'date'        => now()->format('Y-m-d'),
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => 2000000,
            'description' => 'Invoice jasa desain',
            'category_id' => $this->category->id,
            'reference'   => 'INV-TEST-001',
        ], $overrides);
    }

    private function createOtherCompanyCustomer(): Customer
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Piutang'],
            $otherUser
        );

        return Customer::withoutGlobalScope('company')->create([
            'company_id' => $otherCompany->id,
            'name'       => 'Pelanggan Asing',
            'is_active'  => true,
        ]);
    }

    private function createOtherCompanyCategory(): TransactionCategory
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Beda Piutang'],
            $otherUser
        );

        return TransactionCategory::where('company_id', $otherCompany->id)
            ->where('type', 'income')
            ->first();
    }
}
