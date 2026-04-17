<?php

namespace Tests\Unit;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\Payable;
use App\Models\Supplier;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\PayableService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayableServiceTest extends TestCase
{
    use RefreshDatabase;

    private PayableService $service;
    private User $user;
    private int $companyId;
    private Supplier $supplier;
    private TransactionCategory $category;
    private Account $payableAccount;
    private Account $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(PayableService::class);
        $this->user    = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Unit Test Hutang'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->supplier = Supplier::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'Supplier Unit Test',
            'is_active'  => true,
        ]);

        $this->category = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'expense')
            ->first();

        $this->payableAccount = Account::where('company_id', $this->companyId)
            ->where('subtype', 'payable')
            ->first();

        $this->expenseAccount = Account::where('company_id', $this->companyId)
            ->where('subtype', 'operating_expense')
            ->first();

        $this->actingAs($this->user);
    }

    // -----------------------------------------------------------------------
    // create()
    // -----------------------------------------------------------------------

    public function test_create_returns_draft_payable(): void
    {
        $payable = $this->service->create($this->payload());

        $this->assertInstanceOf(Payable::class, $payable);
        $this->assertEquals(TransactionStatus::Draft, $payable->status);
        $this->assertEquals(PaymentStatus::Unpaid, $payable->payment_status);
        $this->assertEquals(1000000, (float) $payable->amount);
        $this->assertEquals(0, (float) $payable->paid_amount);
    }

    public function test_create_assigns_payable_number(): void
    {
        $payable = $this->service->create($this->payload());

        $this->assertNotEmpty($payable->payable_number);
        $this->assertStringStartsWith('AP-', $payable->payable_number);
    }

    public function test_create_does_not_post_journal_entry(): void
    {
        $this->service->create($this->payload());

        $this->assertDatabaseCount('journal_entries', 0);
    }

    public function test_create_links_supplier(): void
    {
        $payable = $this->service->create($this->payload());

        $this->assertEquals($this->supplier->id, $payable->supplier_id);
    }

    // -----------------------------------------------------------------------
    // post()
    // -----------------------------------------------------------------------

    public function test_post_updates_status_to_posted(): void
    {
        $payable = $this->service->create($this->payload());
        $posted  = $this->service->post($payable);

        $this->assertEquals(TransactionStatus::Posted, $posted->status);
        $this->assertNotNull($posted->posted_at);
    }

    public function test_post_creates_exactly_one_journal_entry(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $this->assertDatabaseCount('journal_entries', 1);
    }

    public function test_post_creates_exactly_two_journal_lines(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $this->assertDatabaseCount('journal_lines', 2);
    }

    public function test_journal_entry_is_balanced(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $entry = JournalEntry::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->with('lines')
            ->first();

        $this->assertTrue($entry->isBalanced());
        $this->assertEquals(1000000, $entry->lines->sum('debit'));
        $this->assertEquals(1000000, $entry->lines->sum('credit'));
    }

    public function test_debit_line_targets_expense_account(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $entry     = JournalEntry::withoutGlobalScope('company')->first();
        $debitLine = $entry->lines()->where('debit', '>', 0)->first();

        $this->assertEquals($this->category->account_id, $debitLine->account_id);
        $this->assertEquals(1000000, (float) $debitLine->debit);
        $this->assertEquals(0, (float) $debitLine->credit);
    }

    public function test_credit_line_targets_payable_account(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $entry      = JournalEntry::withoutGlobalScope('company')->first();
        $creditLine = $entry->lines()->where('credit', '>', 0)->first();

        $this->assertEquals($this->payableAccount->id, $creditLine->account_id);
        $this->assertEquals(1000000, (float) $creditLine->credit);
        $this->assertEquals(0, (float) $creditLine->debit);
    }

    public function test_debit_line_falls_back_to_operating_expense_without_category(): void
    {
        $payload = $this->payload();
        unset($payload['category_id']);

        $payable = $this->service->create($payload);
        $this->service->post($payable);

        $entry     = JournalEntry::withoutGlobalScope('company')->with('lines.account')->first();
        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);

        $this->assertEquals($this->expenseAccount->id, $debitLine->account_id);
        $this->assertEquals('operating_expense', $debitLine->account->subtype);
    }

    public function test_journal_entry_is_linked_to_source_payable(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $entry = JournalEntry::withoutGlobalScope('company')->first();

        $this->assertEquals(Payable::class, $entry->source_type);
        $this->assertEquals($payable->id, $entry->source_id);
    }

    public function test_posting_draft_twice_throws_exception(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Hanya hutang draft yang dapat diposting.');

        $this->service->post($payable->fresh());
    }

    // -----------------------------------------------------------------------
    // void()
    // -----------------------------------------------------------------------

    public function test_void_updates_status_to_voided(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $voided = $this->service->void($payable->fresh(), 'Kesalahan input');

        $this->assertEquals(TransactionStatus::Voided, $voided->status);
        $this->assertNotNull($voided->voided_at);
        $this->assertEquals('Kesalahan input', $voided->void_reason);
    }

    public function test_void_reverses_journal_entry(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $this->service->void($payable->fresh(), 'Batal');

        $entries = JournalEntry::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->get();

        $this->assertGreaterThanOrEqual(1, $entries->count());

        $voidedEntry = $entries->first(fn($e) => $e->status === TransactionStatus::Voided);
        $this->assertNotNull($voidedEntry);
    }

    public function test_void_draft_throws_exception(): void
    {
        $payable = $this->service->create($this->payload());

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Hanya hutang yang sudah diposting yang dapat dibatalkan.');

        $this->service->void($payable, 'Batal');
    }

    public function test_void_with_paid_amount_throws_exception(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $payable->update(['paid_amount' => 100000]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Hutang yang sudah ada pembayaran tidak dapat dibatalkan.');

        $this->service->void($payable->fresh(), 'Batal');
    }

    // -----------------------------------------------------------------------
    // updatePaymentStatus()
    // -----------------------------------------------------------------------

    public function test_update_payment_status_sets_unpaid_when_zero_paid(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $payable->update(['paid_amount' => 0]);
        $this->service->updatePaymentStatus($payable->fresh());

        $this->assertDatabaseHas('payables', [
            'id'             => $payable->id,
            'payment_status' => PaymentStatus::Unpaid->value,
        ]);
    }

    public function test_update_payment_status_sets_partial_when_partly_paid(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $payable->update(['paid_amount' => 400000]);
        $this->service->updatePaymentStatus($payable->fresh());

        $this->assertDatabaseHas('payables', [
            'id'             => $payable->id,
            'payment_status' => PaymentStatus::Partial->value,
        ]);
    }

    public function test_update_payment_status_sets_paid_when_fully_paid(): void
    {
        $payable = $this->service->create($this->payload());
        $this->service->post($payable);

        $payable->update(['paid_amount' => 1000000]);
        $this->service->updatePaymentStatus($payable->fresh());

        $this->assertDatabaseHas('payables', [
            'id'             => $payable->id,
            'payment_status' => PaymentStatus::Paid->value,
        ]);
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'company_id'  => $this->companyId,
            'supplier_id' => $this->supplier->id,
            'date'        => now()->format('Y-m-d'),
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => 1000000,
            'description' => 'Pembelian bahan baku',
            'category_id' => $this->category->id,
            'reference'   => 'PO-UNIT-001',
        ], $overrides);
    }
}
