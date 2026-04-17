<?php

namespace Tests\Feature;

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

    public function test_unauthenticated_user_is_redirected_from_all_reports(): void
    {
        auth()->logout();

        $urls = [
            '/laporan/transaksi',
            '/laporan/piutang',
            '/laporan/hutang',
            '/laporan/laba-rugi',
            '/laporan/arus-kas',
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
