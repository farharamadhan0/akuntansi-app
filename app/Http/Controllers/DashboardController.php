<?php

namespace App\Http\Controllers;

use App\Models\CashBankAccount;
use App\Models\DashboardPreference;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
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
    protected const DEFAULT_VISIBLE_WIDGETS = [
        'summary-cards',
        'sales-margin',
        'cash-runway',
        'cash-flow',
        'top-products',
        'trend-chart',
        'top-expense',
        'receivable',
        'payable',
        'cash-bank',
        'stock-attention',
        'recent-transactions',
    ];

    public function __construct(
        protected AccountBalanceService $balanceService
    ) {}

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;
        $preference = DashboardPreference::where('user_id', auth()->id())
            ->where('company_id', $companyId)
            ->first();
        $visibleWidgets = $this->resolveVisibleWidgets($preference?->layout);
        $needsSummaryCards = $this->hasVisibleWidget($visibleWidgets, 'summary-cards');
        $needsCashBank = $this->hasVisibleWidget($visibleWidgets, 'cash-bank');
        $needsReceivable = $this->hasVisibleWidget($visibleWidgets, 'receivable');
        $needsPayable = $this->hasVisibleWidget($visibleWidgets, 'payable');
        $needsSalesMargin = $this->hasVisibleWidget($visibleWidgets, 'sales-margin');
        $needsCashRunway = $this->hasVisibleWidget($visibleWidgets, 'cash-runway');
        $needsCashFlow = $this->hasVisibleWidget($visibleWidgets, 'cash-flow');
        $needsTopProducts = $this->hasVisibleWidget($visibleWidgets, 'top-products');

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

        $incomeThisMonth = 0.0;
        $incomeLastMonth = 0.0;
        $expenseThisMonth = 0.0;
        $expenseLastMonth = 0.0;
        $salesThisMonth = 0.0;
        $salesLastMonth = 0.0;
        $salesCostThisMonth = 0.0;
        $grossProfitThisMonth = 0.0;
        $grossMarginThisMonth = null;
        $averageExpenseLastMonth = null;
        $cashRunwayMonths = null;
        $cashRunwayDataDays = 0;
        $cashRunwayExpenseLabel = null;
        $netProfitThisMonth = 0.0;
        $netProfitLastMonth = 0.0;
        $cashBankAccounts = collect();
        $cashBankAccountCount = 0;
        $totalCashBank = 0.0;
        $receivableSummary = $this->emptySummary();
        $receivableOverdue = $this->emptySummary();
        $receivableDueSoon = $this->emptySummary();
        $receivableAging = $this->emptyAging();
        $payableSummary = $this->emptySummary();
        $payableOverdue = $this->emptySummary();
        $payableDueSoon = $this->emptySummary();
        $payableAging = $this->emptyAging();
        $trend = [];
        $topExpenseCategories = collect();
        $topSellingProducts = collect();
        $stockAttention = [
            'lowStockCount' => 0,
            'negativeStockCount' => 0,
            'unsoldThirtyDaysCount' => 0,
        ];
        $draftCount = 0;
        $recentTransactions = collect();

        if ($needsSummaryCards || $needsCashRunway || $needsCashFlow) {
            // Income & Expense this month (posted)
            if ($needsSummaryCards || $needsCashFlow) {
                $incomeThisMonth = (float) Transaction::where('company_id', $companyId)
                    ->where('type', TransactionType::Income)
                    ->where('status', TransactionStatus::Posted)
                    ->whereBetween('date', [$startOfMonth, $endOfMonth])
                    ->sum('amount');
            }

            $expenseThisMonth = (float) Transaction::where('company_id', $companyId)
                ->where('type', TransactionType::Expense)
                ->where('status', TransactionStatus::Posted)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->sum('amount');

            if ($needsSummaryCards || $needsCashFlow) {
                // Income & Expense last month (for MoM comparison)
                if ($needsSummaryCards) {
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
                }
            }
        }

        if ($needsSummaryCards || $needsSalesMargin) {
            $salesThisMonth = (float) Sale::where('company_id', $companyId)
                ->where('status', TransactionStatus::Posted)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->sum('total_amount');

        }

        if ($needsSummaryCards || $needsCashRunway) {
            $cashBankSummary = CashBankAccount::where('company_id', $companyId)
                ->active()
                ->orderBy('type')
                ->orderBy('name')
                ->get(['id']);

            $cashBankAccountCount = $cashBankSummary->count();
            $totalCashBank = (float) $cashBankSummary
                ->sum(fn(CashBankAccount $acc) => (float) $this->balanceService->getCashBankBalance($acc->id));
        }

        if ($needsSummaryCards) {
            $salesLastMonth = (float) Sale::where('company_id', $companyId)
                ->where('status', TransactionStatus::Posted)
                ->whereBetween('date', [$startOfLastMonth, $endOfLastMonth])
                ->sum('total_amount');

            $netProfitThisMonth = $incomeThisMonth - $expenseThisMonth;
            $netProfitLastMonth = $incomeLastMonth - $expenseLastMonth;
        }

        if ($needsSalesMargin) {
            $salesCostThisMonth = (float) SaleItem::query()
                ->selectRaw('COALESCE(SUM(sale_items.cost_amount), 0) as total_cost')
                ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->where('sales.company_id', $companyId)
                ->where('sales.status', TransactionStatus::Posted)
                ->whereBetween('sales.date', [$startOfMonth, $endOfMonth])
                ->value('total_cost');

            $grossProfitThisMonth = $salesThisMonth - $salesCostThisMonth;
            $grossMarginThisMonth = $salesThisMonth > 0
                ? ($grossProfitThisMonth / $salesThisMonth) * 100
                : null;
        }

        if ($needsCashRunway) {
            $firstExpenseDate = Transaction::where('company_id', $companyId)
                ->where('status', TransactionStatus::Posted)
                ->where('type', TransactionType::Expense)
                ->min('date');

            if ($firstExpenseDate !== null) {
                $todayCarbon = $now->copy()->startOfDay();
                $firstExpenseCarbon = Carbon::parse($firstExpenseDate)->startOfDay();
                $cashRunwayDataDays = max(1, ((int) $firstExpenseCarbon->diffInDays($todayCarbon, false)) + 1);

                if ($cashRunwayDataDays >= 7) {
                    $expenseStartDate = $cashRunwayDataDays >= 90
                        ? $todayCarbon->copy()->subDays(89)->toDateString()
                        : $firstExpenseCarbon->toDateString();
                    $expenseEndDate = $todayCarbon->toDateString();
                    $expenseDays = $cashRunwayDataDays >= 90 ? 90 : $cashRunwayDataDays;

                    $expenseTotal = (float) Transaction::where('company_id', $companyId)
                        ->where('status', TransactionStatus::Posted)
                        ->where('type', TransactionType::Expense)
                        ->whereBetween('date', [$expenseStartDate, $expenseEndDate])
                        ->sum('amount');

                    $averageExpenseLastMonth = $expenseTotal > 0
                        ? ($expenseTotal / $expenseDays) * 30
                        : null;

                    $cashRunwayExpenseLabel = match (true) {
                        $cashRunwayDataDays < 30 => 'Estimasi awal',
                        $cashRunwayDataDays < 90 => "Berdasarkan {$cashRunwayDataDays} hari data",
                        default => 'Berdasarkan rata-rata 90 hari terakhir',
                    };
                }
            }

            $cashRunwayMonths = $averageExpenseLastMonth !== null
                ? $totalCashBank / $averageExpenseLastMonth
                : null;
        }

        if ($needsCashBank) {
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

            if (! $needsSummaryCards) {
                $cashBankAccountCount = $cashBankAccounts->count();
                $totalCashBank = (float) $cashBankAccounts->sum('balance');
            }
        }

        // Receivable / Payable outstanding base scope
        $receivableBase = fn() => Receivable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid);

        $payableBase = fn() => Payable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid);

        if ($needsReceivable) {
            $receivableSummary = $this->summarize($receivableBase());
            $receivableOverdue = $this->summarize($receivableBase()->where('due_date', '<', $today));
            $receivableDueSoon = $this->summarize(
                $receivableBase()
                    ->whereBetween('due_date', [$today, $dueSoonCutoff])
            );
            $receivableAging = $this->aging($receivableBase(), $today);
        }

        if ($needsPayable) {
            $payableSummary = $this->summarize($payableBase());
            $payableOverdue = $this->summarize($payableBase()->where('due_date', '<', $today));
            $payableDueSoon = $this->summarize(
                $payableBase()
                    ->whereBetween('due_date', [$today, $dueSoonCutoff])
            );
            $payableAging = $this->aging($payableBase(), $today);
        }

        if ($this->hasVisibleWidget($visibleWidgets, 'trend-chart')) {
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
        }

        if ($this->hasVisibleWidget($visibleWidgets, 'top-expense')) {
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
        }

        if ($needsTopProducts) {
            $topSellingProducts = SaleItem::query()
                ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->join('products', 'products.id', '=', 'sale_items.product_id')
                ->where('sales.company_id', $companyId)
                ->where('sales.status', TransactionStatus::Posted)
                ->whereBetween('sales.date', [$startOfMonth, $endOfMonth])
                ->selectRaw('products.id as product_id, products.name as product_name, sale_items.unit as unit, SUM(sale_items.quantity) as total_quantity')
                ->groupBy('products.id', 'products.name', 'sale_items.unit')
                ->orderByDesc('total_quantity')
                ->limit(5)
                ->get()
                ->map(fn($row) => [
                    'id' => (int) $row->product_id,
                    'name' => (string) $row->product_name,
                    'unit' => (string) $row->unit,
                    'totalQuantity' => (float) $row->total_quantity,
                ])
                ->values();
        }

        if ($this->hasVisibleWidget($visibleWidgets, 'stock-attention')) {
            $stockProducts = Product::where('company_id', $companyId)
                ->active()
                ->goods()
                ->where('is_stock_tracked', true);

            $stockAttention = [
                'lowStockCount' => (clone $stockProducts)
                    ->where('current_stock', '>', 0)
                    ->where('current_stock', '<=', 5)
                    ->count(),
                'negativeStockCount' => (clone $stockProducts)
                    ->where('current_stock', '<', 0)
                    ->count(),
                'unsoldThirtyDaysCount' => (clone $stockProducts)
                    ->whereDoesntHave('saleItems.sale', function (Builder $query) use ($now) {
                        $query->where('status', TransactionStatus::Posted)
                            ->where('date', '>=', $now->copy()->subDays(30)->toDateString());
                    })
                    ->count(),
            ];
        }

        if ($needsSummaryCards) {
            // Draft transactions count (needs review)
            $draftCount = Transaction::where('company_id', $companyId)
                ->where('status', TransactionStatus::Draft)
                ->count();
        }

        if ($this->hasVisibleWidget($visibleWidgets, 'recent-transactions')) {
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
        }

        return Inertia::render('Dashboard/Index', [
            'layout' => $preference?->layout,
            'currentMonth' => $currentMonth,
            'stats' => [
                'incomeThisMonth'  => $incomeThisMonth,
                'incomeLastMonth'  => $incomeLastMonth,
                'expenseThisMonth' => $expenseThisMonth,
                'expenseLastMonth' => $expenseLastMonth,
                'salesThisMonth'   => $salesThisMonth,
                'salesLastMonth'   => $salesLastMonth,
                'salesCostThisMonth' => $salesCostThisMonth,
                'grossProfitThisMonth' => $grossProfitThisMonth,
                'grossMarginThisMonth' => $grossMarginThisMonth,
                'averageExpenseLastMonth' => $averageExpenseLastMonth,
                'cashRunwayMonths' => $cashRunwayMonths,
                'cashRunwayDataDays' => $cashRunwayDataDays,
                'cashRunwayExpenseLabel' => $cashRunwayExpenseLabel,
                'netProfit'        => $netProfitThisMonth,
                'netProfitLastMonth' => $netProfitLastMonth,
                'totalCashBank'    => $totalCashBank,
                'cashBankAccountCount' => $cashBankAccountCount,

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
            'topSellingProducts'  => $topSellingProducts,
            'stockAttention'      => $stockAttention,
            'cashBankAccounts'    => $cashBankAccounts,
            'recentTransactions'  => $recentTransactions,
        ]);
    }

    /**
     * @param array<int, array{widgetId?: string, visible?: bool}>|null $layout
     * @return array<string, bool>
     */
    protected function resolveVisibleWidgets(?array $layout): array
    {
        if (blank($layout)) {
            return array_fill_keys(self::DEFAULT_VISIBLE_WIDGETS, true);
        }

        $visibleWidgets = array_fill_keys(self::DEFAULT_VISIBLE_WIDGETS, true);

        foreach ($layout as $item) {
            $widgetId = $item['widgetId'] ?? null;

            if (! is_string($widgetId) || $widgetId === '') {
                continue;
            }

            $visibleWidgets[$widgetId] = (bool) ($item['visible'] ?? false);
        }

        return $visibleWidgets;
    }

    protected function hasVisibleWidget(array $visibleWidgets, string $widgetId): bool
    {
        return $visibleWidgets[$widgetId] ?? false;
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

    /**
     * @return array{total: float, count: int}
     */
    protected function emptySummary(): array
    {
        return [
            'total' => 0.0,
            'count' => 0,
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

        $buckets = $this->emptyAging();

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

    /**
     * @return array<string, array{total: float, count: int}>
     */
    protected function emptyAging(): array
    {
        return [
            'current' => ['total' => 0.0, 'count' => 0],
            'd1_30'   => ['total' => 0.0, 'count' => 0],
            'd31_60'  => ['total' => 0.0, 'count' => 0],
            'd61_90'  => ['total' => 0.0, 'count' => 0],
            'd90_plus' => ['total' => 0.0, 'count' => 0],
        ];
    }
}
