<?php

namespace Tests\Unit;

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
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportServiceTest extends TestCase
{
    use RefreshDatabase;

    private ReportService $service;
    private IncomeService $incomeService;
    private ExpenseService $expenseService;
    private ReceivableService $receivableService;
    private PayableService $payableService;

    private User $user;
    private int $companyId;
    private CashBankAccount $cashBank;
    private Customer $customer;
    private Supplier $supplier;
    private TransactionCategory $incomeCategory;
    private TransactionCategory $expenseCategory;

    private string $today;
    private string $yesterday;
    private string $nextMonth;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service           = app(ReportService::class);
        $this->incomeService     = app(IncomeService::class);
        $this->expenseService    = app(ExpenseService::class);
        $this->receivableService = app(ReceivableService::class);
        $this->payableService    = app(PayableService::class);

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Unit Test Laporan'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->actingAs($this->user);

        $this->cashBank = CashBankAccount::where('company_id', $this->companyId)->first();

        $this->customer = Customer::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'Pelanggan Laporan',
            'is_active'  => true,
        ]);

        $this->supplier = Supplier::withoutGlobalScope('company')->create([
            'company_id' => $this->companyId,
            'name'       => 'Supplier Laporan',
            'is_active'  => true,
        ]);

        $this->incomeCategory = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'income')
            ->first();

        $this->expenseCategory = TransactionCategory::where('company_id', $this->companyId)
            ->where('type', 'expense')
            ->first();

        $this->today     = now()->format('Y-m-d');
        $this->yesterday = now()->subDay()->format('Y-m-d');
        $this->nextMonth = now()->addMonthNoOverflow()->format('Y-m-d');
    }

    // -----------------------------------------------------------------------
    // transactionList()
    // -----------------------------------------------------------------------

    public function test_transaction_list_returns_posted_transactions(): void
    {
        $this->postIncome(500000);
        $this->postExpense(200000);

        $result = $this->service->transactionList($this->companyId, $this->today, $this->today);

        $this->assertCount(2, $result['rows']);
    }

    public function test_transaction_list_calculates_totals(): void
    {
        $this->postIncome(1000000);
        $this->postExpense(400000);

        $result = $this->service->transactionList($this->companyId, $this->today, $this->today);

        $this->assertEquals(1000000, $result['total_income']);
        $this->assertEquals(400000, $result['total_expense']);
        $this->assertEquals(600000, $result['net']);
    }

    public function test_transaction_list_filters_by_type(): void
    {
        $this->postIncome(1000000);
        $this->postExpense(400000);

        $result = $this->service->transactionList($this->companyId, $this->today, $this->today, 'income');

        $this->assertCount(1, $result['rows']);
        $this->assertEquals('income', $result['rows'][0]['type']);
    }

    public function test_transaction_list_excludes_out_of_range_dates(): void
    {
        $this->postIncome(500000);

        $result = $this->service->transactionList($this->companyId, $this->nextMonth, $this->nextMonth);

        $this->assertCount(0, $result['rows']);
        $this->assertEquals(0, $result['total_income']);
    }

    public function test_transaction_list_excludes_other_company_data(): void
    {
        $this->postIncome(500000);

        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(['name' => 'PT Lain'], $otherUser);

        $result = $this->service->transactionList($otherCompany->id, $this->today, $this->today);

        $this->assertCount(0, $result['rows']);
    }

    // -----------------------------------------------------------------------
    // receivableList()
    // -----------------------------------------------------------------------

    public function test_receivable_list_returns_posted_receivables(): void
    {
        $this->postReceivable(2000000);

        $result = $this->service->receivableList($this->companyId, $this->today, $this->today);

        $this->assertCount(1, $result['rows']);
        $this->assertEquals(2000000, $result['rows'][0]['amount']);
    }

    public function test_receivable_list_summary_totals_are_correct(): void
    {
        $this->postReceivable(1500000);
        $this->postReceivable(500000);

        $result = $this->service->receivableList($this->companyId, $this->today, $this->today);

        $this->assertEquals(2000000, $result['total_amount']);
        $this->assertEquals(0, $result['total_paid']);
        $this->assertEquals(2000000, $result['total_remaining']);
    }

    public function test_receivable_list_filters_by_payment_status(): void
    {
        $receivable = $this->postReceivable(1000000);
        $receivable->update(['paid_amount' => 1000000]);
        $this->receivableService->updatePaymentStatus($receivable->fresh());

        $this->postReceivable(500000);

        $result = $this->service->receivableList($this->companyId, $this->today, $this->today, 'paid');

        $this->assertCount(1, $result['rows']);
        $this->assertEquals('paid', $result['rows'][0]['payment_status']);
    }

    public function test_receivable_list_excludes_out_of_range_dates(): void
    {
        $this->postReceivable(1000000);

        $result = $this->service->receivableList($this->companyId, $this->nextMonth, $this->nextMonth);

        $this->assertCount(0, $result['rows']);
    }

    // -----------------------------------------------------------------------
    // payableList()
    // -----------------------------------------------------------------------

    public function test_payable_list_returns_posted_payables(): void
    {
        $this->postPayable(3000000);

        $result = $this->service->payableList($this->companyId, $this->today, $this->today);

        $this->assertCount(1, $result['rows']);
        $this->assertEquals(3000000, $result['rows'][0]['amount']);
        $this->assertEquals(3000000, $result['rows'][0]['remaining']);
    }

    public function test_payable_list_summary_totals_are_correct(): void
    {
        $this->postPayable(1000000);
        $this->postPayable(2000000);

        $result = $this->service->payableList($this->companyId, $this->today, $this->today);

        $this->assertEquals(3000000, $result['total_amount']);
        $this->assertEquals(0, $result['total_paid']);
        $this->assertEquals(3000000, $result['total_remaining']);
    }

    public function test_payable_list_filters_by_payment_status(): void
    {
        $payable = $this->postPayable(1000000);
        $payable->update(['paid_amount' => 1000000]);
        $this->payableService->updatePaymentStatus($payable->fresh());

        $this->postPayable(500000);

        $result = $this->service->payableList($this->companyId, $this->today, $this->today, 'paid');

        $this->assertCount(1, $result['rows']);
        $this->assertEquals('paid', $result['rows'][0]['payment_status']);
    }

    public function test_payable_list_excludes_out_of_range_dates(): void
    {
        $this->postPayable(1000000);

        $result = $this->service->payableList($this->companyId, $this->nextMonth, $this->nextMonth);

        $this->assertCount(0, $result['rows']);
    }

    // -----------------------------------------------------------------------
    // incomeStatement()
    // -----------------------------------------------------------------------

    public function test_income_statement_calculates_revenue(): void
    {
        $this->postIncome(3000000);

        $result = $this->service->incomeStatement($this->companyId, $this->today, $this->today);

        $this->assertGreaterThan(0, count($result['revenue']));
        $this->assertEquals(3000000, $result['total_revenue']);
    }

    public function test_income_statement_calculates_expense(): void
    {
        $this->postExpense(1200000);

        $result = $this->service->incomeStatement($this->companyId, $this->today, $this->today);

        $this->assertGreaterThan(0, count($result['expense']));
        $this->assertEquals(1200000, $result['total_expense']);
    }

    public function test_income_statement_net_income_is_revenue_minus_expense(): void
    {
        $this->postIncome(5000000);
        $this->postExpense(2000000);

        $result = $this->service->incomeStatement($this->companyId, $this->today, $this->today);

        $this->assertEquals(5000000, $result['total_revenue']);
        $this->assertEquals(2000000, $result['total_expense']);
        $this->assertEquals(3000000, $result['net_income']);
    }

    public function test_income_statement_net_loss_when_expense_exceeds_revenue(): void
    {
        $this->postIncome(1000000);
        $this->postExpense(3000000);

        $result = $this->service->incomeStatement($this->companyId, $this->today, $this->today);

        $this->assertEquals(-2000000, $result['net_income']);
    }

    public function test_income_statement_empty_when_no_transactions(): void
    {
        $result = $this->service->incomeStatement($this->companyId, $this->today, $this->today);

        $this->assertCount(0, $result['revenue']);
        $this->assertCount(0, $result['expense']);
        $this->assertEquals(0, $result['net_income']);
    }

    public function test_income_statement_excludes_out_of_range(): void
    {
        $this->postIncome(5000000);
        $this->postExpense(2000000);

        $result = $this->service->incomeStatement($this->companyId, $this->nextMonth, $this->nextMonth);

        $this->assertEquals(0, $result['total_revenue']);
        $this->assertEquals(0, $result['total_expense']);
        $this->assertEquals(0, $result['net_income']);
    }

    // -----------------------------------------------------------------------
    // cashFlow()
    // -----------------------------------------------------------------------

    public function test_cash_flow_records_income_as_inflow(): void
    {
        $this->postIncome(2000000);

        $result = $this->service->cashFlow($this->companyId, $this->today, $this->today);

        $this->assertGreaterThan(0, count($result['inflows']));
        $this->assertEquals(2000000, $result['total_in']);
    }

    public function test_cash_flow_records_expense_as_outflow(): void
    {
        $this->postExpense(800000);

        $result = $this->service->cashFlow($this->companyId, $this->today, $this->today);

        $this->assertGreaterThan(0, count($result['outflows']));
        $this->assertEquals(800000, $result['total_out']);
    }

    public function test_cash_flow_net_is_inflow_minus_outflow(): void
    {
        $this->postIncome(4000000);
        $this->postExpense(1500000);

        $result = $this->service->cashFlow($this->companyId, $this->today, $this->today);

        $this->assertEquals(4000000, $result['total_in']);
        $this->assertEquals(1500000, $result['total_out']);
        $this->assertEquals(2500000, $result['net_flow']);
    }

    public function test_cash_flow_empty_when_no_transactions(): void
    {
        $result = $this->service->cashFlow($this->companyId, $this->today, $this->today);

        $this->assertCount(0, $result['inflows']);
        $this->assertCount(0, $result['outflows']);
        $this->assertEquals(0, $result['net_flow']);
    }

    public function test_cash_flow_excludes_out_of_range(): void
    {
        $this->postIncome(2000000);

        $result = $this->service->cashFlow($this->companyId, $this->nextMonth, $this->nextMonth);

        $this->assertEquals(0, $result['total_in']);
        $this->assertEquals(0, $result['total_out']);
        $this->assertEquals(0, $result['net_flow']);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function postIncome(float $amount)
    {
        $t = $this->incomeService->create([
            'company_id'          => $this->companyId,
            'cash_bank_account_id' => $this->cashBank->id,
            'category_id'          => $this->incomeCategory->id,
            'date'                 => $this->today,
            'amount'               => $amount,
            'description'          => 'Pendapatan test',
        ]);
        return $this->incomeService->post($t);
    }

    private function postExpense(float $amount)
    {
        $t = $this->expenseService->create([
            'company_id'          => $this->companyId,
            'cash_bank_account_id' => $this->cashBank->id,
            'category_id'          => $this->expenseCategory->id,
            'date'                 => $this->today,
            'amount'               => $amount,
            'description'          => 'Beban test',
        ]);
        return $this->expenseService->post($t);
    }

    private function postReceivable(float $amount)
    {
        $r = $this->receivableService->create([
            'company_id'  => $this->companyId,
            'customer_id' => $this->customer->id,
            'category_id' => $this->incomeCategory->id,
            'date'        => $this->today,
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => $amount,
            'description' => 'Piutang test',
        ]);
        return $this->receivableService->post($r);
    }

    private function postPayable(float $amount)
    {
        $p = $this->payableService->create([
            'company_id'  => $this->companyId,
            'supplier_id' => $this->supplier->id,
            'category_id' => $this->expenseCategory->id,
            'date'        => $this->today,
            'due_date'    => now()->addDays(30)->format('Y-m-d'),
            'amount'      => $amount,
            'description' => 'Hutang test',
        ]);
        return $this->payableService->post($p);
    }
}
