<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaleRequest;
use App\Models\CashBankAccount;
use App\Models\Partner;
use App\Models\Product;
use App\Models\Sale;
use App\Services\SaleService;
use App\Enums\TransactionStatus;
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

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $baseQuery = Sale::where('company_id', $companyId);

        $summary = [
            'total_posted' => (float) (clone $baseQuery)
                ->where('status', TransactionStatus::Posted)
                ->sum('total_amount'),
            'count_all' => (clone $baseQuery)->count(),
            'count_posted' => (clone $baseQuery)
                ->where('status', TransactionStatus::Posted)
                ->count(),
            'count_voided' => (clone $baseQuery)
                ->where('status', TransactionStatus::Voided)
                ->count(),
        ];

        $statusFilter = $request->query('status', TransactionStatus::Posted->value);
        $allowedStatuses = ['all', TransactionStatus::Posted->value, TransactionStatus::Voided->value];
        if (! in_array($statusFilter, $allowedStatuses, true)) {
            $statusFilter = TransactionStatus::Posted->value;
        }

        $perPage = (int) $request->query('per_page', 25);
        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $sales = (clone $baseQuery)
            ->with(['partner:id,name', 'cashBankAccount:id,name', 'receivable:id,payment_status'])
            ->when($statusFilter !== 'all', fn ($builder) => $builder->where('status', $statusFilter))
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Sale $sale) => [
                'id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'date' => $sale->date->format('Y-m-d'),
                'due_date' => $sale->due_date?->format('Y-m-d'),
                'payment_type' => $sale->payment_type,
                'source' => $sale->source ?? 'manual',
                'receivable_payment_status' => $sale->receivable?->payment_status?->value,
                'partner_name' => $sale->partner?->name,
                'cash_bank_name' => $sale->cashBankAccount?->name,
                'total_amount' => (float) $sale->total_amount,
                'status' => $sale->status->value,
                'status_label' => $sale->status->label(),
            ]);

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'summary' => $summary,
            'filters' => [
                'status' => $statusFilter,
                'per_page' => $perPage,
            ],
            'prerequisites' => [
                'hasProducts' => Product::where('company_id', $companyId)
                    ->active()
                    ->exists(),
            ],
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        return Inertia::render('Sales/Create', [
            'sale' => null,
            'partners' => Partner::where('company_id', $companyId)->active()->customer()->orderBy('name')->get(['id', 'name', 'code']),
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
            'partner:id,name,code',
            'cashBankAccount:id,name',
            'receivable:id,receivable_number,payment_status,amount,paid_amount',
            'items.product' => fn ($q) => $q->withTrashed()->select('id', 'name', 'product_code', 'sku', 'product_type', 'unit', 'deleted_at'),
            'journalEntries.lines.account:id,code,name',
            'correctedBy:id,sale_number',
            'corrects:id,sale_number',
        ]);

        return Inertia::render('Sales/Show', [
            'sale' => [
                'id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'date' => $sale->date->format('Y-m-d'),
                'due_date' => $sale->due_date?->format('Y-m-d'),
                'payment_type' => $sale->payment_type,
                'source' => $sale->source ?? 'manual',
                'total_amount' => (float) $sale->total_amount,
                'notes' => $sale->notes,
                'reference' => $sale->reference,
                'status' => $sale->status->value,
                'status_label' => $sale->status->label(),
                'posted_at' => $sale->posted_at?->format('Y-m-d H:i'),
                'voided_at' => $sale->voided_at?->format('Y-m-d H:i'),
                'void_reason' => $sale->void_reason,
                'corrected_at' => $sale->corrected_at?->format('Y-m-d H:i'),
                'partner' => $sale->partner ? [
                    'id' => $sale->partner->id,
                    'name' => $sale->partner->name,
                    'code' => $sale->partner->code,
                ] : null,
                'cash_bank_account' => $sale->cashBankAccount ? [
                    'name' => $sale->cashBankAccount->name,
                ] : null,
                'receivable' => $sale->receivable ? [
                    'id' => $sale->receivable->id,
                    'receivable_number' => $sale->receivable->receivable_number,
                    'payment_status' => $sale->receivable->payment_status->value,
                    'amount' => (float) $sale->receivable->amount,
                    'paid_amount' => (float) $sale->receivable->paid_amount,
                    'remaining_amount' => (float) $sale->receivable->remaining_amount,
                ] : null,
                'corrected_by' => $sale->correctedBy ? [
                    'id' => $sale->correctedBy->id,
                    'sale_number' => $sale->correctedBy->sale_number,
                ] : null,
                'corrects' => $sale->corrects ? [
                    'id' => $sale->corrects->id,
                    'sale_number' => $sale->corrects->sale_number,
                ] : null,
                'items' => $sale->items->map(fn ($item) => [
                    'id' => $item->id,
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->unit,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                    'unit_cost' => (float) $item->unit_cost,
                    'cost_amount' => (float) $item->cost_amount,
                    'product' => $item->product ? [
                        'name' => $item->product->name,
                        'product_code' => $item->product->product_code,
                        'deleted_at' => $item->product->deleted_at,
                    ] : null,
                ]),
            ],
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

    public function edit(Sale $sale): Response
    {
        $this->authorizeCompany($sale);

        if ($sale->status !== TransactionStatus::Posted) {
            abort(403, 'Hanya penjualan yang sudah diposting yang dapat dikoreksi.');
        }

        $companyId = auth()->user()->current_company_id;

        $sale->load([
            'items.product:id,product_code,name,unit,sales_price,is_stock_tracked,current_stock',
            'receivable:id,receivable_number,paid_amount',
            'receivable.paymentAllocations.payment:id,payment_number,date,status',
        ]);

        return Inertia::render('Sales/Edit', [
            'sale' => [
                'id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'date' => $sale->date->format('Y-m-d'),
                'due_date' => $sale->due_date?->format('Y-m-d'),
                'payment_type' => $sale->payment_type,
                'partner_id' => $sale->partner_id,
                'cash_bank_account_id' => $sale->cash_bank_account_id,
                'notes' => $sale->notes,
                'reference' => $sale->reference,
                'receivable' => $sale->receivable ? [
                    'id' => $sale->receivable->id,
                    'receivable_number' => $sale->receivable->receivable_number,
                    'paid_amount' => (float) $sale->receivable->paid_amount,
                    'payments' => $sale->receivable->paymentAllocations
                        ->filter(fn ($allocation) => $allocation->payment)
                        ->unique('payment_id')
                        ->values()
                        ->map(fn ($allocation) => [
                            'id' => $allocation->payment->id,
                            'payment_number' => $allocation->payment->payment_number,
                            'date' => $allocation->payment->date?->format('Y-m-d'),
                            'status' => $allocation->payment->status->value,
                        ]),
                ] : null,
                'items' => $sale->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'description' => $item->description,
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->unit,
                    'unit_price' => (float) $item->unit_price,
                    'discount_amount' => (float) $item->discount_amount,
                    'tax_amount' => (float) $item->tax_amount,
                ]),
            ],
            'partners' => Partner::where('company_id', $companyId)->active()->customer()->orderBy('name')->get(['id', 'name', 'code']),
            'cashBankAccounts' => CashBankAccount::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'product_code', 'sku', 'name', 'product_type', 'unit', 'sales_price', 'is_stock_tracked', 'current_stock']),
        ]);
    }

    public function correct(SaleRequest $request, Sale $sale): RedirectResponse
    {
        $this->authorizeCompany($sale);

        try {
            $newSale = $this->saleService->correct($sale, $request->validated());

            return redirect()->route('sales.show', $newSale)
                ->with('success', 'Penjualan berhasil dikoreksi.');
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
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
