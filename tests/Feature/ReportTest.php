<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\ExpenseService;
use App\Services\IncomeService;
use App\Services\PayableService;
use App\Services\ReceivableService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private CashBankAccount $cashBank;
    private Customer $customer;
    private Supplier $supplier;
    private TransactionCategory $incomeCategory;
    private TransactionCategory $expenseCategory;

    private string $today;
    private string $nextMonth;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Feature Test Laporan'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->actingAs($this->user);

        $this->cashBank = CashBankAccount::where('company_id', $this->companyId)->first();

        $this->customer = Customer::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'Pelanggan Feature',
            'is_active'  => true,
        ]);

        $this->supplier = Supplier::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'Supplier Feature',
            'is_active'  => true,
        ]);

        $this->incomeCategory = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'income')->first();

        $this->expenseCategory = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'expense')->first();

        $this->today     = now()->format('Y-m-d');
        $this->nextMonth = now()->addMonthNoOverflow()->format('Y-m-d');
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_transaction_list_page_loads(): void
    {
        $this->get('/laporan/transaksi')->assertOk();
    }

    public function test_receivable_list_page_loads(): void
    {
        $this->get('/laporan/piutang')->assertOk();
    }

    public function test_payable_list_page_loads(): void
    {
        $this->get('/laporan/hutang')->assertOk();
    }

    public function test_income_statement_page_loads(): void
    {
        $this->get('/laporan/laba-rugi')->assertOk();
    }

    public function test_cash_flow_page_loads(): void
    {
        $this->get('/laporan/arus-kas')->assertOk();
    }

    public function test_balance_sheet_page_loads(): void
    {
        $this->get('/laporan/neraca')->assertOk();
    }

    public function test_general_ledger_page_loads(): void
    {
        $this->get('/laporan/buku-besar')->assertOk();
    }

    public function test_unauthenticated_user_is_redirected_from_all_reports(): void
    {
        auth()->logout();

        $urls = [
            '/laporan/transaksi',
            '/laporan/piutang',
            '/laporan/hutang',
            '/laporan/laba-rugi',
            '/laporan/neraca',
            '/laporan/arus-kas',
            '/laporan/buku-besar',
        ];

        foreach ($urls as $url) {
            $this->get($url)->assertRedirect('/login');
        }
    }

    // -----------------------------------------------------------------------
    // Transaction list
    // -----------------------------------------------------------------------

    public function test_transaction_list_contains_posted_income(): void
    {
        $this->postIncome(750000);

        $response = $this->get("/laporan/transaksi?from={$this->today}&to={$this->today}");
        $response->assertOk();

        $rows = $response->original->getData()['page']['props']['rows'];
        $this->assertCount(1, $rows);
        $this->assertEquals('income', $rows[0]['type']);
        $this->assertEquals(750000, $rows[0]['amount']);
    }

    public function test_transaction_list_contains_posted_expense(): void
    {
        $this->postExpense(300000);

        $response = $this->get("/laporan/transaksi?from={$this->today}&to={$this->today}");
        $rows = $response->original->getData()['page']['props']['rows'];

        $this->assertCount(1, $rows);
        $this->assertEquals('expense', $rows[0]['type']);
    }

    public function test_transaction_list_date_filter_excludes_future(): void
    {
        $this->postIncome(500000);

        $response = $this->get("/laporan/transaksi?from={$this->nextMonth}&to={$this->nextMonth}");
        $rows = $response->original->getData()['page']['props']['rows'];

        $this->assertCount(0, collect($rows)->all());
    }

    public function test_transaction_list_type_filter_income_only(): void
    {
        $this->postIncome(500000);
        $this->postExpense(200000);

        $response = $this->get("/laporan/transaksi?from={$this->today}&to={$this->today}&type=income");
        $rows = $response->original->getData()['page']['props']['rows'];

        $this->assertCount(1, $rows);
        $this->assertEquals('income', $rows[0]['type']);
    }

    public function test_transaction_list_summary_is_correct(): void
    {
        $this->postIncome(1000000);
        $this->postExpense(400000);

        $response = $this->get("/laporan/transaksi?from={$this->today}&to={$this->today}");
        $summary  = $response->original->getData()['page']['props']['summary'];

        $this->assertEquals(1000000, $summary['total_income']);
        $this->assertEquals(400000, $summary['total_expense']);
        $this->assertEquals(600000, $summary['net']);
    }

    // -----------------------------------------------------------------------
    // Receivable list
    // -----------------------------------------------------------------------

    public function test_receivable_list_contains_posted_receivable(): void
    {
        $this->postReceivable(2500000);

        $response = $this->get("/laporan/piutang?from={$this->today}&to={$this->today}");
        $rows = $response->original->getData()['page']['props']['rows'];

        $this->assertCount(1, $rows);
        $this->assertEquals(2500000, $rows[0]['amount']);
    }

    public function test_receivable_list_summary_is_correct(): void
    {
        $this->postReceivable(1000000);
        $this->postReceivable(500000);

        $response = $this->get("/laporan/piutang?from={$this->today}&to={$this->today}");
        $summary  = $response->original->getData()['page']['props']['summary'];

        $this->assertEquals(1500000, $summary['total_amount']);
        $this->assertEquals(1500000, $summary['total_remaining']);
        $this->assertEquals(0, $summary['total_paid']);
    }

    public function test_receivable_list_date_filter_excludes_future(): void
    {
        $this->postReceivable(1000000);

        $response = $this->get("/laporan/piutang?from={$this->nextMonth}&to={$this->nextMonth}");
        $rows = $response->original->getData()['page']['props']['rows'];

        $this->assertCount(0, collect($rows)->all());
    }

    // -----------------------------------------------------------------------
    // Payable list
    // -----------------------------------------------------------------------

    public function test_payable_list_contains_posted_payable(): void
    {
        $this->postPayable(1800000);

        $response = $this->get("/laporan/hutang?from={$this->today}&to={$this->today}");
        $rows = $response->original->getData()['page']['props']['rows'];

        $this->assertCount(1, $rows);
        $this->assertEquals(1800000, $rows[0]['amount']);
    }

    public function test_payable_list_summary_is_correct(): void
    {
        $this->postPayable(2000000);

        $response = $this->get("/laporan/hutang?from={$this->today}&to={$this->today}");
        $summary  = $response->original->getData()['page']['props']['summary'];

        $this->assertEquals(2000000, $summary['total_amount']);
        $this->assertEquals(2000000, $summary['total_remaining']);
        $this->assertEquals(0, $summary['total_paid']);
    }

    public function test_payable_list_date_filter_excludes_future(): void
    {
        $this->postPayable(1000000);

        $response = $this->get("/laporan/hutang?from={$this->nextMonth}&to={$this->nextMonth}");
        $rows = $response->original->getData()['page']['props']['rows'];

        $this->assertCount(0, collect($rows)->all());
    }

    // -----------------------------------------------------------------------
    // Income Statement
    // -----------------------------------------------------------------------

    public function test_income_statement_shows_revenue_and_expense(): void
    {
        $this->postIncome(5000000);
        $this->postExpense(2000000);

        $response = $this->get("/laporan/laba-rugi?from={$this->today}&to={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(5000000, $props['total_revenue']);
        $this->assertEquals(2000000, $props['total_expense']);
        $this->assertEquals(3000000, $props['net_income']);
    }

    public function test_income_statement_empty_for_out_of_range(): void
    {
        $this->postIncome(5000000);
        $this->postExpense(2000000);

        $response = $this->get("/laporan/laba-rugi?from={$this->nextMonth}&to={$this->nextMonth}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(0, $props['total_revenue']);
        $this->assertEquals(0, $props['total_expense']);
        $this->assertEquals(0, $props['net_income']);
    }

    public function test_income_statement_net_loss(): void
    {
        $this->postExpense(3000000);

        $response = $this->get("/laporan/laba-rugi?from={$this->today}&to={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertLessThan(0, $props['net_income']);
    }

    // -----------------------------------------------------------------------
    // Cash Flow
    // -----------------------------------------------------------------------

    public function test_cash_flow_shows_inflow_from_income(): void
    {
        $this->postIncome(4000000);

        $response = $this->get("/laporan/arus-kas?from={$this->today}&to={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(4000000, $props['total_in']);
        $this->assertEquals(4000000, $props['net_flow']);
    }

    public function test_cash_flow_shows_outflow_from_expense(): void
    {
        $this->postExpense(1500000);

        $response = $this->get("/laporan/arus-kas?from={$this->today}&to={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(1500000, $props['total_out']);
        $this->assertEquals(-1500000, $props['net_flow']);
    }

    public function test_cash_flow_net_flow_is_correct(): void
    {
        $this->postIncome(6000000);
        $this->postExpense(2000000);

        $response = $this->get("/laporan/arus-kas?from={$this->today}&to={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(6000000, $props['total_in']);
        $this->assertEquals(2000000, $props['total_out']);
        $this->assertEquals(4000000, $props['net_flow']);
    }

    public function test_cash_flow_empty_for_out_of_range(): void
    {
        $this->postIncome(3000000);

        $response = $this->get("/laporan/arus-kas?from={$this->nextMonth}&to={$this->nextMonth}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(0, $props['total_in']);
        $this->assertEquals(0, $props['total_out']);
        $this->assertEquals(0, $props['net_flow']);
    }

    // -----------------------------------------------------------------------
    // Balance Sheet (Neraca)
    // -----------------------------------------------------------------------

    public function test_balance_sheet_is_balanced_after_income(): void
    {
        $this->postIncome(5000000);

        $response = $this->get("/laporan/neraca?as_of={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertTrue($props['is_balanced']);
        $this->assertEquals($props['total_asset'], $props['total_liab_equity']);
    }

    public function test_balance_sheet_income_increases_asset_and_current_earnings(): void
    {
        $this->postIncome(5000000);

        $response = $this->get("/laporan/neraca?as_of={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        // Cash (asset) naik sebesar pendapatan
        $this->assertEquals(5000000, $props['total_asset']);
        // Laba periode berjalan = pendapatan - beban = 5.000.000
        $this->assertEquals(5000000, $props['current_earnings']);
        $this->assertEquals(5000000, $props['total_equity']);
    }

    public function test_balance_sheet_expense_creates_loss(): void
    {
        $this->postIncome(3000000);
        $this->postExpense(1000000);

        $response = $this->get("/laporan/neraca?as_of={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(2000000, $props['total_asset']);
        $this->assertEquals(2000000, $props['current_earnings']);
        $this->assertTrue($props['is_balanced']);
    }

    public function test_balance_sheet_payable_increases_liability(): void
    {
        $this->postPayable(1800000);

        $response = $this->get("/laporan/neraca?as_of={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(1800000, $props['total_liability']);
        $this->assertTrue($props['is_balanced']);
    }

    public function test_balance_sheet_receivable_increases_asset(): void
    {
        $this->postReceivable(2500000);

        $response = $this->get("/laporan/neraca?as_of={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        // Piutang adalah aset → total_asset naik sebesar piutang
        $this->assertEquals(2500000, $props['total_asset']);
        $this->assertTrue($props['is_balanced']);
    }

    public function test_balance_sheet_excludes_entries_after_as_of(): void
    {
        $this->postIncome(5000000);

        // Gunakan tanggal kemarin sebagai as_of → transaksi hari ini belum masuk
        $yesterday = now()->subDay()->format('Y-m-d');
        $response  = $this->get("/laporan/neraca?as_of={$yesterday}");
        $props     = $response->original->getData()['page']['props'];

        $this->assertEquals(0, $props['total_asset']);
        $this->assertEquals(0, $props['total_liability']);
        $this->assertEquals(0, $props['current_earnings']);
    }

    public function test_balance_sheet_empty_when_no_transactions(): void
    {
        $response = $this->get("/laporan/neraca?as_of={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(0, $props['total_asset']);
        $this->assertEquals(0, $props['total_liability']);
        $this->assertEquals(0, $props['total_equity']);
        $this->assertEquals(0, $props['current_earnings']);
        $this->assertTrue($props['is_balanced']);
    }

    // -----------------------------------------------------------------------
    // General Ledger (Buku Besar)
    // -----------------------------------------------------------------------

    public function test_general_ledger_without_account_id_shows_no_ledger(): void
    {
        $response = $this->get('/laporan/buku-besar');
        $response->assertOk();

        $props = $response->original->getData()['page']['props'];
        $this->assertNull($props['ledger']);
        $this->assertNotEmpty($props['accounts']);
    }

    public function test_general_ledger_shows_mutations_for_cash_account(): void
    {
        $this->postIncome(1_000_000);
        $this->postExpense(400_000);

        $cashAccount = $this->cashBank->account;

        $response = $this->get(
            "/laporan/buku-besar?account_id={$cashAccount->id}&from={$this->today}&to={$this->today}"
        );
        $response->assertOk();

        $ledger = $response->original->getData()['page']['props']['ledger'];

        $this->assertNotNull($ledger);
        $this->assertEquals($cashAccount->id, $ledger['account']['id']);
        $this->assertCount(2, $ledger['lines']);
        $this->assertEquals(1_000_000, $ledger['total_debit']);
        $this->assertEquals(400_000, $ledger['total_credit']);
        $this->assertEquals(600_000, $ledger['closing_balance']);
    }

    public function test_general_ledger_running_balance_is_cumulative(): void
    {
        $this->postIncome(500_000);
        $this->postIncome(300_000);

        $cashAccount = $this->cashBank->account;

        $response = $this->get(
            "/laporan/buku-besar?account_id={$cashAccount->id}&from={$this->today}&to={$this->today}"
        );
        $ledger = $response->original->getData()['page']['props']['ledger'];

        $this->assertEquals(500_000, $ledger['lines'][0]['running_balance']);
        $this->assertEquals(800_000, $ledger['lines'][1]['running_balance']);
        $this->assertEquals(800_000, $ledger['closing_balance']);
    }

    public function test_general_ledger_opening_balance_reflects_prior_activity(): void
    {
        // Simulasi aktivitas di masa lalu dengan menggeser tanggal entry.
        $this->postIncome(1_000_000);

        $cashAccount = $this->cashBank->account;

        $tomorrow = now()->addDay()->format('Y-m-d');
        $response = $this->get(
            "/laporan/buku-besar?account_id={$cashAccount->id}&from={$tomorrow}&to={$tomorrow}"
        );
        $ledger = $response->original->getData()['page']['props']['ledger'];

        // Aktivitas hari ini seharusnya masuk sebagai opening balance
        $this->assertEquals(1_000_000, $ledger['opening_balance']);
        $this->assertCount(0, $ledger['lines']);
        $this->assertEquals(1_000_000, $ledger['closing_balance']);
    }

    public function test_general_ledger_excludes_other_company(): void
    {
        $this->postIncome(1_000_000);
        $cashAccountId = $this->cashBank->account->id;

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Beda Buku Besar'], $otherUser);
        $otherUser->refresh();

        $this->actingAs($otherUser);

        // Akun perusahaan lain tidak boleh bisa diakses
        $response = $this->get(
            "/laporan/buku-besar?account_id={$cashAccountId}&from={$this->today}&to={$this->today}"
        );

        $response->assertNotFound();
    }

    // -----------------------------------------------------------------------
    // Cross-company isolation
    // -----------------------------------------------------------------------

    public function test_report_does_not_show_other_company_transactions(): void
    {
        $this->postIncome(999000);

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Beda Laporan'], $otherUser);
        $otherUser->refresh();

        $this->actingAs($otherUser);

        $response = $this->get("/laporan/transaksi?from={$this->today}&to={$this->today}");
        $rows = $response->original->getData()['page']['props']['rows'];

        $this->assertCount(0, collect($rows)->all());
    }

    public function test_income_statement_does_not_include_other_company_data(): void
    {
        $this->postIncome(5000000);

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Beda Laba'], $otherUser);
        $otherUser->refresh();

        $this->actingAs($otherUser);

        $response = $this->get("/laporan/laba-rugi?from={$this->today}&to={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(0, $props['total_revenue']);
    }

    public function test_balance_sheet_does_not_include_other_company_data(): void
    {
        $this->postIncome(5000000);

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Beda Neraca'], $otherUser);
        $otherUser->refresh();

        $this->actingAs($otherUser);

        $response = $this->get("/laporan/neraca?as_of={$this->today}");
        $props    = $response->original->getData()['page']['props'];

        $this->assertEquals(0, $props['total_asset']);
        $this->assertEquals(0, $props['current_earnings']);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function postIncome(float $amount): void
    {
        $t = app(IncomeService::class)->create([
            'company_id'           => $this->companyId,
            'cash_bank_account_id' => $this->cashBank->id,
            'category_id'          => $this->incomeCategory->id,
            'date'                 => $this->today,
            'amount'               => $amount,
            'description'          => 'Pendapatan feature test',
        ]);
        app(IncomeService::class)->post($t);
    }

    private function postExpense(float $amount): void
    {
        $t = app(ExpenseService::class)->create([
            'company_id'           => $this->companyId,
            'cash_bank_account_id' => $this->cashBank->id,
            'category_id'          => $this->expenseCategory->id,
            'date'                 => $this->today,
            'amount'               => $amount,
            'description'          => 'Beban feature test',
        ]);
        app(ExpenseService::class)->post($t);
    }

    private function postReceivable(float $amount): void
    {
        $r = app(ReceivableService::class)->create([
            'company_id'  => $this->companyId,
            'customer_id' => $this->customer->id,
            'category_id' => $this->incomeCategory->id,
            'date'        => $this->today,
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => $amount,
            'description' => 'Piutang feature test',
        ]);
        app(ReceivableService::class)->post($r);
    }

    private function postPayable(float $amount): void
    {
        $p = app(PayableService::class)->create([
            'company_id'  => $this->companyId,
            'supplier_id' => $this->supplier->id,
            'category_id' => $this->expenseCategory->id,
            'date'        => $this->today,
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => $amount,
            'description' => 'Hutang feature test',
        ]);
        app(PayableService::class)->post($p);
    }
}
