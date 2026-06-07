<?php

namespace App\Http\Controllers;

use App\Enums\TransactionStatus;
use App\Http\Requests\PurchaseRequest;
use App\Models\CashBankAccount;
use App\Models\Partner;
use App\Models\Product;
use App\Models\Purchase;
use App\Services\PurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function __construct(
        protected PurchaseService $purchaseService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $baseQuery = Purchase::where('company_id', $companyId);

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

        $query = (clone $baseQuery)
            ->with(['partner:id,name', 'cashBankAccount:id,name', 'payable:id,payment_status'])

            ->when($statusFilter !== 'all', fn ($builder) => $builder->where('status', $statusFilter))
            ->orderByDesc('date')
            ->orderByDesc('created_at');

        $purchases = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Purchase $purchase) => [
                'id' => $purchase->id,
                'purchase_number' => $purchase->purchase_number,
                'date' => $purchase->date->format('Y-m-d'),
                'due_date' => $purchase->due_date?->format('Y-m-d'),
                'payment_type' => $purchase->payment_type,
                'payable_payment_status' => $purchase->payable?->payment_status?->value,
                'partner_name' => $purchase->partner?->name,
                'cash_bank_name' => $purchase->cashBankAccount?->name,
                'total_amount' => (float) $purchase->total_amount,
                'status' => $purchase->status->value,
                'status_label' => $purchase->status->label(),
            ]);

        return Inertia::render('Purchases/Index', [
            'purchases' => $purchases,
            'summary' => $summary,
            'filters' => [
                'status' => $statusFilter,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        return Inertia::render('Purchases/Create', [
            'purchase' => null,
            'partners' => Partner::where('company_id', $companyId)->active()->supplier()->orderBy('name')->get(['id', 'name', 'code']),
            'cashBankAccounts' => CashBankAccount::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'product_code', 'sku', 'name', 'product_type', 'unit', 'purchase_price', 'is_stock_tracked', 'current_stock']),
        ]);
    }

    public function store(PurchaseRequest $request): RedirectResponse
    {
        try {
            $purchase = $this->purchaseService->create($request->validated());
            $this->purchaseService->post($purchase);

            return redirect()->route('purchases.show', $purchase)
                ->with('success', 'Pembelian berhasil dicatat.');
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(Purchase $purchase): Response
    {
        $this->authorizeCompany($purchase);

        $purchase->load([
            'partner:id,name,code',
            'cashBankAccount:id,name',
            'payable:id,payable_number,payment_status,amount,paid_amount',
            'items.product' => fn ($q) => $q->withTrashed()->select('id', 'name', 'product_code', 'sku', 'product_type', 'unit', 'deleted_at'),
            'journalEntries.lines.account:id,code,name',
            'correctedBy:id,purchase_number',
            'corrects:id,purchase_number',
        ]);

        return Inertia::render('Purchases/Show', [
            'purchase' => [
                'id' => $purchase->id,
                'purchase_number' => $purchase->purchase_number,
                'date' => $purchase->date->format('Y-m-d'),
                'due_date' => $purchase->due_date?->format('Y-m-d'),
                'payment_type' => $purchase->payment_type,
                'total_amount' => (float) $purchase->total_amount,
                'notes' => $purchase->notes,
                'reference' => $purchase->reference,
                'status' => $purchase->status->value,
                'status_label' => $purchase->status->label(),
                'posted_at' => $purchase->posted_at?->format('Y-m-d H:i'),
                'voided_at' => $purchase->voided_at?->format('Y-m-d H:i'),
                'void_reason' => $purchase->void_reason,
                'corrected_at' => $purchase->corrected_at?->format('Y-m-d H:i'),
                'corrected_by' => $purchase->correctedBy ? [
                    'id' => $purchase->correctedBy->id,
                    'purchase_number' => $purchase->correctedBy->purchase_number,
                ] : null,
                'corrects' => $purchase->corrects ? [
                    'id' => $purchase->corrects->id,
                    'purchase_number' => $purchase->corrects->purchase_number,
                ] : null,
                'partner' => $purchase->partner ? [
                    'id' => $purchase->partner->id,
                    'name' => $purchase->partner->name,
                    'code' => $purchase->partner->code,
                ] : null,
                'cash_bank_account' => $purchase->cashBankAccount ? [
                    'name' => $purchase->cashBankAccount->name,
                ] : null,
                'payable' => $purchase->payable ? [
                    'id' => $purchase->payable->id,
                    'payable_number' => $purchase->payable->payable_number,
                    'payment_status' => $purchase->payable->payment_status->value,
                    'amount' => (float) $purchase->payable->amount,
                    'paid_amount' => (float) $purchase->payable->paid_amount,
                    'remaining_amount' => (float) $purchase->payable->remaining_amount,
                ] : null,
                'items' => $purchase->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'description' => $item->description,
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->unit,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                    'product' => $item->product ? [
                        'name' => $item->product->name,
                        'product_code' => $item->product->product_code,
                        'deleted_at' => $item->product->deleted_at,
                    ] : null,
                ]),
            ],
            'journalEntries' => $purchase->journalEntries->map(fn ($entry) => [
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

    public function edit(Purchase $purchase): Response
    {
        $this->authorizeCompany($purchase);

        if ($purchase->status !== TransactionStatus::Posted) {
            abort(403, 'Hanya pembelian yang sudah diposting yang dapat dikoreksi.');
        }

        $companyId = auth()->user()->current_company_id;

        $purchase->load([
            'items.product:id,product_code,name,unit,purchase_price,is_stock_tracked,current_stock',
            'payable:id,payable_number,paid_amount',
            'payable.paymentAllocations.payment:id,payment_number,date,status',
        ]);

        return Inertia::render('Purchases/Edit', [
            'purchase' => [
                'id' => $purchase->id,
                'purchase_number' => $purchase->purchase_number,
                'date' => $purchase->date->format('Y-m-d'),
                'due_date' => $purchase->due_date?->format('Y-m-d'),
                'payment_type' => $purchase->payment_type,
                'partner_id' => $purchase->partner_id,
                'cash_bank_account_id' => $purchase->cash_bank_account_id,
                'notes' => $purchase->notes,
                'reference' => $purchase->reference,
                'payable' => $purchase->payable ? [
                    'id' => $purchase->payable->id,
                    'payable_number' => $purchase->payable->payable_number,
                    'paid_amount' => (float) $purchase->payable->paid_amount,
                    'payments' => $purchase->payable->paymentAllocations
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
                'items' => $purchase->items->map(fn ($item) => [
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
            'partners' => Partner::where('company_id', $companyId)->active()->supplier()->orderBy('name')->get(['id', 'name', 'code']),
            'cashBankAccounts' => CashBankAccount::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'product_code', 'sku', 'name', 'product_type', 'unit', 'purchase_price', 'is_stock_tracked', 'current_stock']),
        ]);
    }

    public function correct(PurchaseRequest $request, Purchase $purchase): RedirectResponse
    {
        $this->authorizeCompany($purchase);

        try {
            $newPurchase = $this->purchaseService->correct($purchase, $request->validated());

            return redirect()->route('purchases.show', $newPurchase)
                ->with('success', 'Pembelian berhasil dikoreksi.');
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function void(Request $request, Purchase $purchase): RedirectResponse
    {
        $this->authorizeCompany($purchase);

        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->purchaseService->void($purchase, $request->reason);

            return redirect()->route('purchases.show', $purchase)
                ->with('success', 'Pembelian berhasil dibatalkan.');
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    protected function authorizeCompany(Purchase $purchase): void
    {
        if ($purchase->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }
}
