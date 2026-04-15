<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Receivable;
use App\Models\Payable;
use App\Enums\TransactionType;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Services\AccountBalanceService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected AccountBalanceService $balanceService
    ) {}

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;
        $startOfMonth = now()->startOfMonth()->toDateString();
        $endOfMonth = now()->endOfMonth()->toDateString();

        $incomeThisMonth = Transaction::where('company_id', $companyId)
            ->where('type', TransactionType::Income)
            ->where('status', TransactionStatus::Posted)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $expenseThisMonth = Transaction::where('company_id', $companyId)
            ->where('type', TransactionType::Expense)
            ->where('status', TransactionStatus::Posted)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $totalReceivables = Receivable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total')
            ->value('total');

        $totalPayables = Payable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total')
            ->value('total');

        return Inertia::render('Dashboard/Index', [
            'stats' => [
                'incomeThisMonth' => (float) $incomeThisMonth,
                'expenseThisMonth' => (float) $expenseThisMonth,
                'totalReceivables' => (float) $totalReceivables,
                'totalPayables' => (float) $totalPayables,
            ],
            'company' => auth()->user()->currentCompany,
        ]);
    }
}
