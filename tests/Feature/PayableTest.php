<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\JournalEntry;
use App\Models\Payable;
use App\Models\Supplier;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayableTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private Supplier $supplier;
    private TransactionCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Hutang'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->supplier = Supplier::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'PT Bahan Baku',
            'is_active'  => true,
        ]);

        $this->category = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'expense')
            ->first();
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_payable_list_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/transaksi/hutang')
            ->assertOk();
    }

    public function test_payable_create_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/transaksi/hutang/buat')
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/transaksi/hutang')->assertRedirect('/login');
        $this->post('/transaksi/hutang', $this->validPayload())->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Store – happy path
    // -----------------------------------------------------------------------

    public function test_valid_payable_is_stored_and_posted(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload())
            ->assertSessionHas('success');

        $this->assertDatabaseHas('payables', [
            'company_id'     => $this->companyId,
            'supplier_id'    => $this->supplier->id,
            'amount'         => 2000000,
            'paid_amount'    => 0,
            'status'         => TransactionStatus::Posted->value,
            'payment_status' => PaymentStatus::Unpaid->value,
            'description'    => 'Pembelian bahan baku',
        ]);
    }

    public function test_store_creates_balanced_journal_entry(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload());

        $payable = Payable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->assertDatabaseCount('journal_entries', 1);

        $entry = JournalEntry::withoutGlobalScope('company')
            ->where('source_type', Payable::class)
            ->where('source_id', $payable->id)
            ->with('lines')
            ->firstOrFail();

        $this->assertEquals(TransactionStatus::Posted, $entry->status);
        $this->assertCount(2, $entry->lines);
        $this->assertEquals(2000000, $entry->lines->sum('debit'));
        $this->assertEquals(2000000, $entry->lines->sum('credit'));
        $this->assertTrue($entry->isBalanced());
    }

    public function test_debit_line_targets_expense_account(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload());

        $payable = Payable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry     = $payable->journalEntries()->with('lines.account')->first();
        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);

        $this->assertNotNull($debitLine);
        $this->assertEquals($this->category->account_id, $debitLine->account_id);
        $this->assertEquals(2000000, (float) $debitLine->debit);
    }

    public function test_credit_line_targets_payable_ledger_account(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload());

        $payable = Payable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry      = $payable->journalEntries()->with('lines.account')->first();
        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);

        $this->assertNotNull($creditLine);
        $this->assertEquals('payable', $creditLine->account->subtype);
        $this->assertEquals(2000000, (float) $creditLine->credit);
    }

    public function test_payable_without_category_falls_back_to_operating_expense(): void
    {
        $payload = $this->validPayload();
        unset($payload['category_id']);

        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $payload);

        $payable = Payable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry     = $payable->journalEntries()->with('lines.account')->first();
        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);

        $this->assertEquals('operating_expense', $debitLine->account->subtype);
    }

    // -----------------------------------------------------------------------
    // Show
    // -----------------------------------------------------------------------

    public function test_show_page_loads(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload());

        $payable = Payable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->actingAs($this->user)
            ->get("/transaksi/hutang/{$payable->id}")
            ->assertOk();
    }

    public function test_cross_company_show_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload());

        $payable = Payable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Lain'], $otherUser);
        $otherUser->refresh();

        $this->actingAs($otherUser)
            ->get("/transaksi/hutang/{$payable->id}")
            ->assertNotFound();
    }

    // -----------------------------------------------------------------------
    // Void
    // -----------------------------------------------------------------------

    public function test_void_changes_status_to_voided(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload());

        $payable = Payable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->actingAs($this->user)
            ->post("/transaksi/hutang/{$payable->id}/batal", ['reason' => 'Batal test'])
            ->assertSessionHas('success');

        $this->assertDatabaseHas('payables', [
            'id'          => $payable->id,
            'status'      => TransactionStatus::Voided->value,
            'void_reason' => 'Batal test',
        ]);
    }

    public function test_void_without_reason_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload());

        $payable = Payable::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $this->actingAs($this->user)
            ->post("/transaksi/hutang/{$payable->id}/batal", [])
            ->assertSessionHasErrors('reason');
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_required_fields_are_validated(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', [])
            ->assertSessionHasErrors(['supplier_id', 'date', 'due_date', 'amount', 'description']);
    }

    public function test_amount_must_be_at_least_1(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload(['amount' => 0]))
            ->assertSessionHasErrors('amount');
    }

    public function test_date_cannot_be_in_the_future(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload([
                'date' => now()->addDay()->format('Y-m-d'),
            ]))
            ->assertSessionHasErrors('date');
    }

    public function test_due_date_cannot_be_before_date(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload([
                'date'     => now()->format('Y-m-d'),
                'due_date' => now()->subDay()->format('Y-m-d'),
            ]))
            ->assertSessionHasErrors('due_date');
    }

    public function test_supplier_from_other_company_is_rejected(): void
    {
        $otherSupplier = $this->createOtherCompanySupplier();

        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload([
                'supplier_id' => $otherSupplier->id,
            ]))
            ->assertSessionHasErrors('supplier_id');

        $this->assertDatabaseCount('payables', 0);
    }

    public function test_inactive_supplier_is_rejected(): void
    {
        $inactive = Supplier::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'Supplier Nonaktif',
            'is_active'  => false,
        ]);

        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload([
                'supplier_id' => $inactive->id,
            ]))
            ->assertSessionHasErrors('supplier_id');
    }

    public function test_category_from_other_company_is_rejected(): void
    {
        $otherCategory = $this->createOtherCompanyCategory();

        $this->actingAs($this->user)
            ->post('/transaksi/hutang', $this->validPayload([
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
            'supplier_id' => $this->supplier->id,
            'date'        => now()->format('Y-m-d'),
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => 2000000,
            'description' => 'Pembelian bahan baku',
            'category_id' => $this->category->id,
            'reference'   => 'PO-TEST-001',
        ], $overrides);
    }

    private function createOtherCompanySupplier(): Supplier
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Hutang'],
            $otherUser
        );

        return Supplier::withoutGlobalScope('company')->create([
            'company_id' => $otherCompany->id,
            'name'       => 'Supplier Asing',
            'is_active'  => true,
        ]);
    }

    private function createOtherCompanyCategory(): TransactionCategory
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Beda Hutang'],
            $otherUser
        );

        return TransactionCategory::where('company_id', $otherCompany->id)
            ->where('type', 'expense')
            ->first();
    }
}
