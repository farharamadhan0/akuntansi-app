<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaleRequest;
use App\Models\CashBankAccount;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Services\SaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function __construct(
        protected SaleService $saleService
    ) {}

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $sales = Sale::where('company_id', $companyId)
            ->with(['customer:id,name', 'cashBankAccount:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Sale $sale) => [
                'id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'date' => $sale->date->format('Y-m-d'),
                'due_date' => $sale->due_date?->format('Y-m-d'),
                'payment_type' => $sale->payment_type,
                'customer_name' => $sale->customer?->name,
                'cash_bank_name' => $sale->cashBankAccount?->name,
                'total_amount' => (float) $sale->total_amount,
            ]);

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        return Inertia::render('Sales/Create', [
            'sale' => null,
            'customers' => Customer::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'name', 'code']),
            'cashBankAccounts' => CashBankAccount::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'product_code', 'sku', 'name', 'product_type', 'unit', 'sales_price', 'is_stock_tracked', 'current_stock']),
        ]);
    }

    public function store(SaleRequest $request): RedirectResponse
    {
        try {
            $sale = DB::transaction(function () use ($request) {
                $sale = $this->saleService->create($request->validated());
                return $this->saleService->post($sale);
            });

            return redirect()->route('sales.show', $sale)
                ->with('success', 'Penjualan berhasil dicatat.');
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(Sale $sale): Response
    {
        $this->authorizeCompany($sale);

        $sale->load([
            'customer:id,name,code',
            'cashBankAccount:id,name',
            'receivable:id,receivable_number,payment_status,amount,paid_amount',
            'items.product:id,name,product_code,sku,product_type,unit',
            'journalEntries.lines.account:id,code,name',
        ]);

        return Inertia::render('Sales/Show', [
            'sale' => $sale,
            'journalEntries' => $sale->journalEntries->map(fn ($entry) => [
                'entry_number' => $entry->entry_number,
                'date' => $entry->date->format('Y-m-d'),
                'description' => $entry->description,
                'status' => $entry->status->value,
                'lines' => $entry->lines->map(fn ($line) => [
                    'account_code' => $line->account->code,
                    'account_name' => $line->account->name,
                    'debit' => (float) $line->debit,
                    'credit' => (float) $line->credit,
                ]),
            ]),
        ]);
    }

    public function void(Request $request, Sale $sale): RedirectResponse
    {
        $this->authorizeCompany($sale);

        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->saleService->void($sale, $request->reason);

            return redirect()->route('sales.show', $sale)
                ->with('success', 'Penjualan berhasil dibatalkan.');
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    protected function authorizeCompany(Sale $sale): void
    {
        if ($sale->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }
}
