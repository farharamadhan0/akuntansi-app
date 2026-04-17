<?php

namespace App\Http\Controllers;

use App\Services\ReportService;
use Illuminate\Http\Request;
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

        $data = $this->reportService->transactionList(
            $companyId,
            $from,
            $to,
            $request->filled('type') ? $request->type : null,
        );

        return Inertia::render('Reports/TransactionList', [
            'rows'          => $data['rows'],
            'summary'       => [
                'total_income'  => $data['total_income'],
                'total_expense' => $data['total_expense'],
                'net'           => $data['net'],
            ],
            'filters' => [
                'from' => $from,
                'to'   => $to,
                'type' => $request->type ?? '',
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
