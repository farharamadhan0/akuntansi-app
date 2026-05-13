<?php

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\CashBankAccount;
use App\Models\JournalEntry;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseTransactionTest extends TestCase
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

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Keluar'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->cashBank = $this->createDefaultCashBankAccount($this->companyId);
        $this->category = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'expense')
            ->first();
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_expense_list_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/transaksi/uang-keluar')
            ->assertOk();
    }

    public function test_expense_create_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/transaksi/uang-keluar/catat')
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected_to_login(): void
    {
        $this->get('/transaksi/uang-keluar')->assertRedirect('/login');
        $this->post('/transaksi/uang-keluar', $this->validPayload())->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    public function test_valid_expense_transaction_creates_posted_transaction(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload())
            ->assertRedirect('/transaksi/uang-keluar')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('transactions', [
            'company_id'           => $this->companyId,
            'type'                 => TransactionType::Expense->value,
            'status'               => TransactionStatus::Posted->value,
            'amount'               => 300000,
            'cash_bank_account_id' => $this->cashBank->id,
            'description'          => 'Pembelian alat tulis kantor',
        ]);
    }

    public function test_valid_expense_transaction_creates_balanced_journal_entry(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload());

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('type', TransactionType::Expense->value)
            ->firstOrFail();

        $this->assertDatabaseCount('journal_entries', 1);

        $entry = JournalEntry::withoutGlobalScope('company')
            ->where('source_type', Transaction::class)
            ->where('source_id', $transaction->id)
            ->with('lines')
            ->firstOrFail();

        $this->assertEquals(TransactionStatus::Posted, $entry->status);
        $this->assertCount(2, $entry->lines);
        $this->assertEquals(300000, $entry->lines->sum('debit'));
        $this->assertEquals(300000, $entry->lines->sum('credit'));
        $this->assertTrue($entry->isBalanced());
    }

    public function test_debit_line_targets_expense_account(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload());

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry = $transaction->journalEntries()->first();
        $entry->load('lines');

        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);
        $this->assertNotNull($debitLine);
        $this->assertEquals($this->category->account_id, $debitLine->account_id);
        $this->assertEquals(300000, (float) $debitLine->debit);
        $this->assertEquals(0, (float) $debitLine->credit);
    }

    public function test_credit_line_targets_cash_bank_account(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload());

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry = $transaction->journalEntries()->first();
        $entry->load('lines');

        $creditLine = $entry->lines->first(fn($l) => $l->credit > 0);
        $this->assertNotNull($creditLine);
        $this->assertEquals($this->cashBank->account_id, $creditLine->account_id);
        $this->assertEquals(300000, (float) $creditLine->credit);
        $this->assertEquals(0, (float) $creditLine->debit);
    }

    public function test_expense_without_category_falls_back_to_operating_expense(): void
    {
        $payload = $this->validPayload();
        unset($payload['category_id']);

        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $payload);

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $entry = $transaction->journalEntries()->first();
        $entry->load('lines.account');

        $debitLine = $entry->lines->first(fn($l) => $l->debit > 0);
        $this->assertEquals('operating_expense', $debitLine->account->subtype);
    }

    // -----------------------------------------------------------------------
    // Company isolation – cash/bank account
    // -----------------------------------------------------------------------

    public function test_cash_bank_account_from_other_company_is_rejected(): void
    {
        $otherCashBank = $this->createOtherCompanyCashBank();

        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload([
                'cash_bank_account_id' => $otherCashBank->id,
            ]))
            ->assertSessionHasErrors('cash_bank_account_id');

        $this->assertDatabaseCount('transactions', 0);
    }

    // -----------------------------------------------------------------------
    // Company isolation – category
    // -----------------------------------------------------------------------

    public function test_category_from_other_company_is_rejected(): void
    {
        $otherCategory = $this->createOtherCompanyExpenseCategory();

        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload([
                'category_id' => $otherCategory->id,
            ]))
            ->assertSessionHasErrors('category_id');

        $this->assertDatabaseCount('transactions', 0);
    }

    // -----------------------------------------------------------------------
    // Cross-company access
    // -----------------------------------------------------------------------

    public function test_cross_company_transaction_show_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload());

        $transaction = Transaction::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Lain'], $otherUser);
        $otherUser->refresh();

        $this->actingAs($otherUser)
            ->get("/transaksi/uang-keluar/{$transaction->id}")
            ->assertNotFound();
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_required_fields_are_validated(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', [])
            ->assertSessionHasErrors(['date', 'amount', 'cash_bank_account_id', 'description']);
    }

    public function test_amount_must_be_at_least_1(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload(['amount' => 0]))
            ->assertSessionHasErrors('amount');
    }

    public function test_date_cannot_be_in_the_future(): void
    {
        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload([
                'date' => now()->addDay()->format('Y-m-d'),
            ]))
            ->assertSessionHasErrors('date');
    }

    public function test_income_category_is_rejected_for_expense(): void
    {
        $incomeCategory = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'income')
            ->first();

        $this->actingAs($this->user)
            ->post('/transaksi/uang-keluar', $this->validPayload([
                'category_id' => $incomeCategory->id,
            ]))
            ->assertSessionHasErrors('category_id');
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'date'                 => now()->format('Y-m-d'),
            'amount'               => 300000,
            'cash_bank_account_id' => $this->cashBank->id,
            'category_id'          => $this->category->id,
            'description'          => 'Pembelian alat tulis kantor',
            'reference'            => 'NOTA-TEST-001',
        ], $overrides);
    }

    private function createOtherCompanyCashBank(): CashBankAccount
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Keluar'],
            $otherUser
        );

        return $this->createDefaultCashBankAccount($otherCompany->id);
    }

    private function createOtherCompanyExpenseCategory(): TransactionCategory
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Beda Keluar'],
            $otherUser
        );

        return TransactionCategory::where('company_id', $otherCompany->id)
            ->where('type', 'expense')
            ->first();
    }
}
