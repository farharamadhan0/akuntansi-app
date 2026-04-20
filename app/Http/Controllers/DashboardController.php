<?php

namespace App\Http\Controllers;

use App\Models\CashBankAccount;
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

        // Income & Expense this month (from posted transactions)
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

        // Cash/Bank balances (ledger-safe)
        $cashBankAccounts = CashBankAccount::where('company_id', $companyId)
            ->active()
            ->with('account:id,code,name')
            ->orderBy('type')
            ->orderBy('name')
            ->get()
            ->map(fn(CashBankAccount $acc) => [
                'id'      => $acc->id,
                'name'    => $acc->name,
                'type'    => $acc->type->value,
                'balance' => $this->balanceService->getCashBankBalance($acc->id),
            ]);

        $totalCashBank = $cashBankAccounts->sum('balance');

        // Receivable summary (outstanding)
        $receivableOutstanding = Receivable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total_remaining')
            ->selectRaw('COUNT(*) as total_count')
            ->first();

        $receivableOverdue = Receivable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->where('due_date', '<', now()->toDateString())
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total_remaining')
            ->selectRaw('COUNT(*) as total_count')
            ->first();

        // Payable summary (outstanding)
        $payableOutstanding = Payable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total_remaining')
            ->selectRaw('COUNT(*) as total_count')
            ->first();

        $payableOverdue = Payable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->where('due_date', '<', now()->toDateString())
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total_remaining')
            ->selectRaw('COUNT(*) as total_count')
            ->first();

        // Recent transactions (last 5 posted)
        $recentTransactions = Transaction::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->with(['cashBankAccount:id,name,type', 'category:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn(Transaction $t) => [
                'id'                 => $t->id,
                'transaction_number' => $t->transaction_number,
                'type'               => $t->type->value,
                'date'               => $t->date->format('Y-m-d'),
                'amount'             => (float) $t->amount,
                'description'        => $t->description,
                'cash_bank_name'     => $t->cashBankAccount->name,
                'category_name'      => $t->category?->name,
            ]);

        return Inertia::render('Dashboard/Index', [
            'stats' => [
                'incomeThisMonth'  => (float) $incomeThisMonth,
                'expenseThisMonth' => (float) $expenseThisMonth,
                'netProfit'        => (float) ($incomeThisMonth - $expenseThisMonth),
                'totalCashBank'    => (float) $totalCashBank,
                'receivableOutstanding' => (float) $receivableOutstanding->total_remaining,
                'receivableOutstandingCount' => (int) $receivableOutstanding->total_count,
                'receivableOverdue' => (float) $receivableOverdue->total_remaining,
                'receivableOverdueCount' => (int) $receivableOverdue->total_count,
                'payableOutstanding' => (float) $payableOutstanding->total_remaining,
                'payableOutstandingCount' => (int) $payableOutstanding->total_count,
                'payableOverdue' => (float) $payableOverdue->total_remaining,
                'payableOverdueCount' => (int) $payableOverdue->total_count,
            ],
            'cashBankAccounts'    => $cashBankAccounts,
            'recentTransactions'  => $recentTransactions,
        ]);
    }
}
