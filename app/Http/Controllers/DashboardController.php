<?php

namespace App\Http\Controllers;

use App\Models\CashBankAccount;
use App\Models\DashboardPreference;
use App\Models\Transaction;
use App\Models\Receivable;
use App\Models\Payable;
use App\Enums\TransactionType;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Services\AccountBalanceService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $now = now();
        $today = $now->toDateString();
        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $endOfMonth = $now->copy()->endOfMonth()->toDateString();
        $startOfLastMonth = $now->copy()->subMonthNoOverflow()->startOfMonth()->toDateString();
        $endOfLastMonth = $now->copy()->subMonthNoOverflow()->endOfMonth()->toDateString();
        $dueSoonCutoff = $now->copy()->addDays(7)->toDateString();

        // Period label (Indonesian)
        $monthsId = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
        ];
        $currentMonth = $monthsId[(int) $now->format('n')] . ' ' . $now->format('Y');

        // Income & Expense this month (posted)
        $incomeThisMonth = (float) Transaction::where('company_id', $companyId)
            ->where('type', TransactionType::Income)
            ->where('status', TransactionStatus::Posted)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $expenseThisMonth = (float) Transaction::where('company_id', $companyId)
            ->where('type', TransactionType::Expense)
            ->where('status', TransactionStatus::Posted)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        // Income & Expense last month (for MoM comparison)
        $incomeLastMonth = (float) Transaction::where('company_id', $companyId)
            ->where('type', TransactionType::Income)
            ->where('status', TransactionStatus::Posted)
            ->whereBetween('date', [$startOfLastMonth, $endOfLastMonth])
            ->sum('amount');

        $expenseLastMonth = (float) Transaction::where('company_id', $companyId)
            ->where('type', TransactionType::Expense)
            ->where('status', TransactionStatus::Posted)
            ->whereBetween('date', [$startOfLastMonth, $endOfLastMonth])
            ->sum('amount');

        $netProfitThisMonth = $incomeThisMonth - $expenseThisMonth;
        $netProfitLastMonth = $incomeLastMonth - $expenseLastMonth;

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
                'balance' => (float) $this->balanceService->getCashBankBalance($acc->id),
            ]);

        $totalCashBank = (float) $cashBankAccounts->sum('balance');

        // Receivable / Payable outstanding base scope
        $receivableBase = fn() => Receivable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid);

        $payableBase = fn() => Payable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid);

        $receivableSummary = $this->summarize($receivableBase());
        $receivableOverdue = $this->summarize($receivableBase()->where('due_date', '<', $today));
        $receivableDueSoon = $this->summarize(
            $receivableBase()
                ->whereBetween('due_date', [$today, $dueSoonCutoff])
        );
        $receivableAging = $this->aging($receivableBase(), $today);

        $payableSummary = $this->summarize($payableBase());
        $payableOverdue = $this->summarize($payableBase()->where('due_date', '<', $today));
        $payableDueSoon = $this->summarize(
            $payableBase()
                ->whereBetween('due_date', [$today, $dueSoonCutoff])
        );
        $payableAging = $this->aging($payableBase(), $today);

        // 6-month income vs expense trend (current month included)
        $trendStart = $now->copy()->subMonths(5)->startOfMonth()->toDateString();
        $driver = config('database.default');
        $monthExpr = match ($driver) {
            'sqlite' => "strftime('%Y-%m', date)",
            'pgsql'  => "to_char(date, 'YYYY-MM')",
            default  => "DATE_FORMAT(date, '%Y-%m')",
        };

        $trendRows = Transaction::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->whereIn('type', [TransactionType::Income, TransactionType::Expense])
            ->where('date', '>=', $trendStart)
            ->selectRaw("$monthExpr as period, type, SUM(amount) as total")
            ->groupBy('period', 'type')
            ->get();

        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = $now->copy()->subMonths($i);
            $key = $m->format('Y-m');
            $trend[] = [
                'period'  => $key,
                'label'   => substr($monthsId[(int) $m->format('n')], 0, 3) . ' ' . $m->format('y'),
                'income'  => (float) $trendRows->where('period', $key)
                    ->where('type', TransactionType::Income)
                    ->sum('total'),
                'expense' => (float) $trendRows->where('period', $key)
                    ->where('type', TransactionType::Expense)
                    ->sum('total'),
            ];
        }

        // Top expense categories this month
        $topExpenseCategories = Transaction::where('transactions.company_id', $companyId)
            ->where('transactions.status', TransactionStatus::Posted)
            ->where('transactions.type', TransactionType::Expense)
            ->whereBetween('transactions.date', [$startOfMonth, $endOfMonth])
            ->leftJoin('transaction_categories', 'transactions.category_id', '=', 'transaction_categories.id')
            ->selectRaw('COALESCE(transaction_categories.name, ?) as category_name, SUM(transactions.amount) as total', ['Tanpa Kategori'])
            ->groupBy('category_name')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'name'  => (string) $r->category_name,
                'total' => (float) $r->total,
            ])
            ->values();

        // Draft transactions count (needs review)
        $draftCount = Transaction::where('company_id', $companyId)
            ->where('status', TransactionStatus::Draft)
            ->count();

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

        // Load user dashboard layout preference
        $preference = DashboardPreference::where('user_id', auth()->id())
            ->where('company_id', $companyId)
            ->first();

        return Inertia::render('Dashboard/Index', [
            'layout' => $preference?->layout,
            'currentMonth' => $currentMonth,
            'stats' => [
                'incomeThisMonth'  => $incomeThisMonth,
                'incomeLastMonth'  => $incomeLastMonth,
                'expenseThisMonth' => $expenseThisMonth,
                'expenseLastMonth' => $expenseLastMonth,
                'netProfit'        => $netProfitThisMonth,
                'netProfitLastMonth' => $netProfitLastMonth,
                'totalCashBank'    => $totalCashBank,

                'receivableOutstanding'      => $receivableSummary['total'],
                'receivableOutstandingCount' => $receivableSummary['count'],
                'receivableOverdue'          => $receivableOverdue['total'],
                'receivableOverdueCount'     => $receivableOverdue['count'],
                'receivableDueSoon'          => $receivableDueSoon['total'],
                'receivableDueSoonCount'     => $receivableDueSoon['count'],

                'payableOutstanding'      => $payableSummary['total'],
                'payableOutstandingCount' => $payableSummary['count'],
                'payableOverdue'          => $payableOverdue['total'],
                'payableOverdueCount'     => $payableOverdue['count'],
                'payableDueSoon'          => $payableDueSoon['total'],
                'payableDueSoonCount'     => $payableDueSoon['count'],

                'draftCount' => $draftCount,
            ],
            'receivableAging'     => $receivableAging,
            'payableAging'        => $payableAging,
            'trend'               => $trend,
            'topExpenseCategories' => $topExpenseCategories,
            'cashBankAccounts'    => $cashBankAccounts,
            'recentTransactions'  => $recentTransactions,
        ]);
    }

    /**
     * Summarize an outstanding receivable/payable query into total remaining and count.
     *
     * @param Builder $query
     * @return array{total: float, count: int}
     */
    protected function summarize(Builder $query): array
    {
        $row = $query
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total_remaining')
            ->selectRaw('COUNT(*) as total_count')
            ->first();

        return [
            'total' => (float) ($row->total_remaining ?? 0),
            'count' => (int) ($row->total_count ?? 0),
        ];
    }

    public function savePreferences(Request $request): RedirectResponse
    {
        $request->validate([
            'layout' => 'required|array',
            'layout.*.widgetId' => 'required|string',
            'layout.*.visible' => 'required|boolean',
            'layout.*.order' => 'required|integer|min:1',
            'layout.*.size' => 'required|string|in:full,2/3,1/3,1/2',
        ]);

        DashboardPreference::updateOrCreate(
            [
                'user_id' => auth()->id(),
                'company_id' => auth()->user()->current_company_id,
            ],
            [
                'layout' => $request->layout,
            ]
        );

        return back();
    }

    /**
     * Build aging buckets (current, 1-30, 31-60, 61-90, >90) for a Receivable/Payable query.
     * "current" = not yet due; overdue buckets are days past due.
     *
     * @param Builder $query
     * @param string $today
     * @return array<string, array{total: float, count: int}>
     */
    protected function aging(Builder $query, string $today): array
    {
        $rows = (clone $query)
            ->selectRaw('due_date, amount - paid_amount as remaining')
            ->get();

        $buckets = [
            'current' => ['total' => 0.0, 'count' => 0],
            'd1_30'   => ['total' => 0.0, 'count' => 0],
            'd31_60'  => ['total' => 0.0, 'count' => 0],
            'd61_90'  => ['total' => 0.0, 'count' => 0],
            'd90_plus' => ['total' => 0.0, 'count' => 0],
        ];

        $todayCarbon = Carbon::parse($today);

        foreach ($rows as $r) {
            $due = Carbon::parse($r->due_date);
            $remaining = (float) $r->remaining;
            if ($remaining <= 0) {
                continue;
            }
            $daysOverdue = $todayCarbon->diffInDays($due, false);
            // diffInDays(false) returns positive if $due is in future; we want days past due:
            $past = -$daysOverdue;

            $key = match (true) {
                $past <= 0      => 'current',
                $past <= 30     => 'd1_30',
                $past <= 60     => 'd31_60',
                $past <= 90     => 'd61_90',
                default         => 'd90_plus',
            };
            $buckets[$key]['total'] += $remaining;
            $buckets[$key]['count'] += 1;
        }

        return $buckets;
    }
}
