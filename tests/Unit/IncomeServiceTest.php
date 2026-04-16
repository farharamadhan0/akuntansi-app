<?php

namespace Tests\Unit;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\JournalEntry;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\IncomeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncomeServiceTest extends TestCase
{
    use RefreshDatabase;

    private IncomeService $service;
    private User $user;
    private int $companyId;
    private CashBankAccount $cashBank;
    private TransactionCategory $category;
    private Account $revenueAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(IncomeService::class);
        $this->user    = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Unit Test'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        // Fetch seeded data (no auth → global scope inactive)
        $this->cashBank = CashBankAccount::where('company_id', $this->companyId)->first();

        $this->category = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'income')
            ->first();

        $this->revenueAccount = Account::where('company_id', $this->companyId)
            ->where('subtype', 'operating_revenue')
            ->first();

        // Authenticate so auth()->id() and current_company_id resolve correctly
        $this->actingAs($this->user);
    }

    // -----------------------------------------------------------------------
    // create()
    // -----------------------------------------------------------------------

    public function test_create_returns_draft_transaction(): void
    {
        $transaction = $this->service->create($this->payload());

        $this->assertInstanceOf(Transaction::class, $transaction);
        $this->assertEquals(TransactionStatus::Draft, $transaction->status);
        $this->assertEquals(TransactionType::Income, $transaction->type);
        $this->assertEquals(750000, (float) $transaction->amount);
    }

    public function test_create_assigns_transaction_number(): void
    {
        $transaction = $this->service->create($this->payload());

        $this->assertNotEmpty($transaction->transaction_number);
        $this->assertStringStartsWith('IN-', $transaction->transaction_number);
    }

    public function test_create_does_not_create_journal_entry(): void
    {
        $this->service->create($this->payload());

        $this->assertDatabaseCount('journal_entries', 0);
    }

    // -----------------------------------------------------------------------
    // post()
    // -----------------------------------------------------------------------

    public function test_post_updates_status_to_posted(): void
    {
        $transaction = $this->service->create($this->payload());
        $posted      = $this->service->post($transaction);

        $this->assertEquals(TransactionStatus::Posted, $posted->status);
        $this->assertNotNull($posted->posted_at);
    }

    public function test_post_creates_exactly_one_journal_entry(): void
    {
        $transaction = $this->service->create($this->payload());
        $this->service->post($transaction);

        $this->assertDatabaseCount('journal_entries', 1);
    }

    public function test_post_creates_exactly_two_journal_lines(): void
    {
        $transaction = $this->service->create($this->payload());
        $this->service->post($transaction);

        $this->assertDatabaseCount('journal_lines', 2);
    }

    public function test_journal_entry_is_balanced(): void
    {
        $transaction = $this->service->create($this->payload());
        $this->service->post($transaction);

        $entry = JournalEntry::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->with('lines')
            ->first();

        $this->assertTrue($entry->isBalanced());
        $this->assertEquals((float) $transaction->amount, $entry->lines->sum('debit'));
        $this->assertEquals((float) $transaction->amount, $entry->lines->sum('credit'));
    }

    public function test_debit_line_is_the_cash_bank_ledger_account(): void
    {
        $transaction = $this->service->create($this->payload());
        $this->service->post($transaction);

        $entry    = JournalEntry::withoutGlobalScope('company')->first();
        $debitLine = $entry->lines()->where('debit', '>', 0)->first();

        $this->assertEquals($this->cashBank->account_id, $debitLine->account_id);
        $this->assertEquals(750000, (float) $debitLine->debit);
        $this->assertEquals(0, (float) $debitLine->credit);
    }

    public function test_credit_line_uses_category_account(): void
    {
        $transaction = $this->service->create($this->payload());
        $this->service->post($transaction);

        $entry      = JournalEntry::withoutGlobalScope('company')->first();
        $creditLine = $entry->lines()->where('credit', '>', 0)->first();

        $this->assertEquals($this->category->account_id, $creditLine->account_id);
        $this->assertEquals(750000, (float) $creditLine->credit);
        $this->assertEquals(0, (float) $creditLine->debit);
    }

    public function test_credit_line_falls_back_to_operating_revenue_without_category(): void
    {
        $payload = $this->payload();
        unset($payload['category_id']);

        $transaction = $this->service->create($payload);
        $this->service->post($transaction);

        $entry      = JournalEntry::withoutGlobalScope('company')->with('lines.account')->first();
        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);

        $this->assertEquals($this->revenueAccount->id, $creditLine->account_id);
        $this->assertEquals('operating_revenue', $creditLine->account->subtype);
    }

    public function test_journal_entry_is_linked_to_source_transaction(): void
    {
        $transaction = $this->service->create($this->payload());
        $this->service->post($transaction);

        $entry = JournalEntry::withoutGlobalScope('company')->first();

        $this->assertEquals(Transaction::class, $entry->source_type);
        $this->assertEquals($transaction->id, $entry->source_id);
    }

    public function test_posting_twice_throws_exception(): void
    {
        $transaction = $this->service->create($this->payload());
        $this->service->post($transaction);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Hanya transaksi draft yang dapat diposting.');

        $this->service->post($transaction->fresh());
    }

    public function test_posting_non_income_transaction_throws_exception(): void
    {
        // Manually create an expense transaction to pass to income post()
        $transaction = $this->service->create($this->payload());

        // Forcefully change type to simulate wrong type
        $transaction->forceFill(['type' => TransactionType::Expense])->save();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Transaksi bukan tipe uang masuk.');

        $this->service->post($transaction->fresh());
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'company_id'           => $this->companyId,
            'date'                 => now()->format('Y-m-d'),
            'amount'               => 750000,
            'cash_bank_account_id' => $this->cashBank->id,
            'category_id'          => $this->category->id,
            'description'          => 'Uang masuk dari klien',
            'reference'            => 'INV-UNIT-001',
        ], $overrides);
    }
}
