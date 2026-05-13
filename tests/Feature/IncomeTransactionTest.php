<?php

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\CashBankAccount;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncomeTransactionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private CashBankAccount $cashBank;
    private TransactionCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        // CompanySetupService seeds full COA + default cash account + default categories
        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Sejahtera'],
            $this->user
        );

        $this->user->refresh(); // pick up current_company_id
        $this->companyId = $company->id;

        $this->cashBank = $this->createDefaultCashBankAccount($this->companyId);
        $this->category = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'income')
            ->first();
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_income_list_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/transaksi/uang-masuk')
            ->assertOk();
    }

    public function test_income_create_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/transaksi/uang-masuk/catat')
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected_to_login(): void
    {
        $this->get('/transaksi/uang-masuk')->assertRedirect('/login');
        $this->post('/transaksi/uang-masuk', $this->validPayload())->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    public function test_valid_income_transaction_creates_posted_transaction(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $this->validPayload())
            ->assertRedirect('/transaksi/uang-masuk')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('transactions', [
            'company_id'           => $this->companyId,
            'type'                 => TransactionType::Income->value,
            'status'               => TransactionStatus::Posted->value,
            'amount'               => 500000,
            'cash_bank_account_id' => $this->cashBank->id,
            'description'          => 'Pembayaran jasa konsultasi',
        ]);
    }

    public function test_valid_income_transaction_creates_balanced_journal_entry(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $this->validPayload());

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('type', TransactionType::Income->value)
            ->firstOrFail();

        // Exactly one journal entry linked to this transaction
        $this->assertDatabaseCount('journal_entries', 1);

        $entry = JournalEntry::withoutGlobalScope('company')
            ->where('source_type', Transaction::class)
            ->where('source_id', $transaction->id)
            ->with('lines')
            ->firstOrFail();

        $this->assertEquals(TransactionStatus::Posted, $entry->status);

        // Exactly 2 lines
        $this->assertCount(2, $entry->lines);

        // Balanced
        $totalDebit  = $entry->lines->sum('debit');
        $totalCredit = $entry->lines->sum('credit');
        $this->assertEquals(500000, $totalDebit);
        $this->assertEquals(500000, $totalCredit);
        $this->assertTrue($entry->isBalanced());
    }

    public function test_debit_line_targets_cash_bank_ledger_account(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $this->validPayload());

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry = $transaction->journalEntries()->first();
        $entry->load('lines');

        $cashLedgerAccountId = $this->cashBank->account_id;

        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);
        $this->assertNotNull($debitLine);
        $this->assertEquals($cashLedgerAccountId, $debitLine->account_id);
        $this->assertEquals(500000, (float) $debitLine->debit);
        $this->assertEquals(0, (float) $debitLine->credit);
    }

    public function test_credit_line_targets_revenue_account(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $this->validPayload());

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry  = $transaction->journalEntries()->first();
        $entry->load('lines');

        $expectedRevenueAccountId = $this->category->account_id;

        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);
        $this->assertNotNull($creditLine);
        $this->assertEquals($expectedRevenueAccountId, $creditLine->account_id);
        $this->assertEquals(500000, (float) $creditLine->credit);
        $this->assertEquals(0, (float) $creditLine->debit);
    }

    public function test_income_without_category_falls_back_to_operating_revenue(): void
    {
        $payload = $this->validPayload();
        unset($payload['category_id']);

        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $payload);

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry = $transaction->journalEntries()->first();
        $entry->load('lines.account');

        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);
        $this->assertEquals('operating_revenue', $creditLine->account->subtype);
    }

    // -----------------------------------------------------------------------
    // Company isolation – cash/bank account
    // -----------------------------------------------------------------------

    public function test_cash_bank_account_from_other_company_is_rejected(): void
    {
        $otherCashBank = $this->createOtherCompanyCashBank();

        $payload = $this->validPayload(['cash_bank_account_id' => $otherCashBank->id]);

        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $payload)
            ->assertSessionHasErrors('cash_bank_account_id');

        $this->assertDatabaseCount('transactions', 0);
    }

    // -----------------------------------------------------------------------
    // Company isolation – category
    // -----------------------------------------------------------------------

    public function test_category_from_other_company_is_rejected(): void
    {
        $otherCategory = $this->createOtherCompanyCategory();

        $payload = $this->validPayload(['category_id' => $otherCategory->id]);

        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $payload)
            ->assertSessionHasErrors('category_id');

        $this->assertDatabaseCount('transactions', 0);
    }

    // -----------------------------------------------------------------------
    // Cross-company transaction access
    // -----------------------------------------------------------------------

    public function test_cross_company_transaction_show_is_rejected(): void
    {
        // Create a posted transaction for company A (our user)
        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $this->validPayload());

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        // Create a second user with their own company
        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Lain'], $otherUser);
        $otherUser->refresh();

        // Other user tries to access company A's transaction
        $this->actingAs($otherUser)
            ->get("/transaksi/uang-masuk/{$transaction->id}")
            ->assertNotFound();
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_required_fields_are_validated(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', [])
            ->assertSessionHasErrors(['date', 'amount', 'cash_bank_account_id', 'description']);
    }

    public function test_amount_must_be_at_least_1(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $this->validPayload(['amount' => 0]))
            ->assertSessionHasErrors('amount');
    }

    public function test_date_cannot_be_in_the_future(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-masuk', $this->validPayload(['date' => now()->addDay()->format('Y-m-d')]))
            ->assertSessionHasErrors('date');
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'date'                 => now()->format('Y-m-d'),
            'amount'               => 500000,
            'cash_bank_account_id' => $this->cashBank->id,
            'category_id'          => $this->category->id,
            'description'          => 'Pembayaran jasa konsultasi',
            'reference'            => 'INV-TEST-001',
        ], $overrides);
    }

    private function createOtherCompanyCashBank(): CashBankAccount
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing'],
            $otherUser
        );

        return $this->createDefaultCashBankAccount($otherCompany->id);
    }

    private function createOtherCompanyCategory(): TransactionCategory
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Beda'],
            $otherUser
        );

        return TransactionCategory::where('company_id', $otherCompany->id)
            ->where('type', 'income')
            ->first();
    }
}
