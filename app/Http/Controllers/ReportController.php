<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Services\GeneralLedgerService;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    public function transactionList(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        [$from, $to] = $this->dateRange($request);
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $data = $this->reportService->transactionList(
            $companyId,
            $from,
            $to,
            $request->filled('type') ? $request->type : null,
        );

        $rows = $data['rows'];
        $currentPage = LengthAwarePaginator::resolveCurrentPage();
        $offset = ($currentPage - 1) * $perPage;
        $paginatedRows = new LengthAwarePaginator(
            $rows->slice($offset, $perPage)->values(),
            $rows->count(),
            $perPage,
            $currentPage,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ],
        );

        return Inertia::render('Reports/TransactionList', [
            'rows'          => $paginatedRows,
            'summary'       => [
                'total_income'  => $data['total_income'],
                'total_expense' => $data['total_expense'],
                'net'           => $data['net'],
            ],
            'filters' => [
                'from' => $from,
                'to'   => $to,
                'type' => $request->type ?? '',
                'per_page' => $perPage,
            ],
        ]);
    }

    public function receivableList(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        [$from, $to] = $this->dateRange($request);

        $data = $this->reportService->receivableList(
            $companyId,
            $from,
            $to,
            $request->filled('payment_status') ? $request->payment_status : null,
        );

        return Inertia::render('Reports/ReceivableList', [
            'rows'    => $data['rows'],
            'summary' => [
                'total_amount'    => $data['total_amount'],
                'total_paid'      => $data['total_paid'],
                'total_remaining' => $data['total_remaining'],
                'total_overdue'   => $data['total_overdue'],
            ],
            'filters' => [
                'from'           => $from,
                'to'             => $to,
                'payment_status' => $request->payment_status ?? '',
            ],
        ]);
    }

    public function payableList(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        [$from, $to] = $this->dateRange($request);

        $data = $this->reportService->payableList(
            $companyId,
            $from,
            $to,
            $request->filled('payment_status') ? $request->payment_status : null,
        );

        return Inertia::render('Reports/PayableList', [
            'rows'    => $data['rows'],
            'summary' => [
                'total_amount'    => $data['total_amount'],
                'total_paid'      => $data['total_paid'],
                'total_remaining' => $data['total_remaining'],
                'total_overdue'   => $data['total_overdue'],
            ],
            'filters' => [
                'from'           => $from,
                'to'             => $to,
                'payment_status' => $request->payment_status ?? '',
            ],
        ]);
    }

    public function incomeStatement(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        [$from, $to] = $this->dateRange($request);

        $data = $this->reportService->incomeStatement($companyId, $from, $to);

        return Inertia::render('Reports/IncomeStatement', [
            'revenue'       => $data['revenue'],
            'expense'       => $data['expense'],
            'total_revenue' => $data['total_revenue'],
            'total_expense' => $data['total_expense'],
            'net_income'    => $data['net_income'],
            'filters'       => ['from' => $from, 'to' => $to],
        ]);
    }

    public function balanceSheet(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        $asOf = $request->filled('as_of')
            ? $request->as_of
            : now()->endOfMonth()->format('Y-m-d');

        $data = $this->reportService->balanceSheet($companyId, $asOf);

        return Inertia::render('Reports/BalanceSheet', [
            'asset'             => $data['asset'],
            'liability'         => $data['liability'],
            'equity'            => $data['equity'],
            'current_earnings'  => $data['current_earnings'],
            'total_asset'       => $data['total_asset'],
            'total_liability'   => $data['total_liability'],
            'total_equity'      => $data['total_equity'],
            'total_liab_equity' => $data['total_liab_equity'],
            'is_balanced'       => $data['is_balanced'],
            'filters'           => ['as_of' => $asOf],
        ]);
    }

    public function cashFlow(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        [$from, $to] = $this->dateRange($request);

        $data = $this->reportService->cashFlow($companyId, $from, $to);

        return Inertia::render('Reports/CashFlow', [
            'inflows'   => $data['inflows'],
            'outflows'  => $data['outflows'],
            'total_in'  => $data['total_in'],
            'total_out' => $data['total_out'],
            'net_flow'  => $data['net_flow'],
            'filters'   => ['from' => $from, 'to' => $to],
        ]);
    }

    public function generalLedger(Request $request, GeneralLedgerService $service): Response
    {
        $companyId = auth()->user()->current_company_id;
        [$from, $to] = $this->dateRange($request);
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $accounts = Account::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'type'])
            ->map(fn (Account $a) => [
                'id'    => $a->id,
                'code'  => $a->code,
                'name'  => $a->name,
                'type'  => $a->type->value,
                'label' => $a->code . ' — ' . $a->name,
            ])
            ->values();

        $ledger = null;
        if ($request->filled('account_id')) {
            $ledger = $service->getLedger(
                $companyId,
                (int) $request->account_id,
                $from,
                $to,
                (bool) $request->boolean('include_voided'),
            );

            $lines = collect($ledger['lines']);
            $currentPage = LengthAwarePaginator::resolveCurrentPage();
            $offset = ($currentPage - 1) * $perPage;
            $ledger['lines'] = new LengthAwarePaginator(
                $lines->slice($offset, $perPage)->values(),
                $lines->count(),
                $perPage,
                $currentPage,
                [
                    'path' => $request->url(),
                    'query' => $request->query(),
                ],
            );
        }

        return Inertia::render('Reports/GeneralLedger', [
            'accounts' => $accounts,
            'ledger'   => $ledger,
            'filters'  => [
                'from'           => $from,
                'to'             => $to,
                'account_id'     => $request->filled('account_id') ? (int) $request->account_id : null,
                'include_voided' => (bool) $request->boolean('include_voided'),
                'per_page'       => $perPage,
            ],
        ]);
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private function dateRange(Request $request): array
    {
        $from = $request->filled('from')
            ? $request->from
            : now()->startOfMonth()->format('Y-m-d');

        $to = $request->filled('to')
            ? $request->to
            : now()->endOfMonth()->format('Y-m-d');

        return [$from, $to];
    }
}
