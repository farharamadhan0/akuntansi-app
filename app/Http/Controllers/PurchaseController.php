<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseRequest;
use App\Models\CashBankAccount;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
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

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $purchases = Purchase::where('company_id', $companyId)
            ->with(['supplier:id,name', 'cashBankAccount:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Purchase $purchase) => [
                'id' => $purchase->id,
                'purchase_number' => $purchase->purchase_number,
                'date' => $purchase->date->format('Y-m-d'),
                'due_date' => $purchase->due_date?->format('Y-m-d'),
                'payment_type' => $purchase->payment_type,
                'supplier_name' => $purchase->supplier?->name,
                'cash_bank_name' => $purchase->cashBankAccount?->name,
                'total_amount' => (float) $purchase->total_amount,
                'status' => $purchase->status->value,
                'status_label' => $purchase->status->label(),
            ]);

        return Inertia::render('Purchases/Index', [
            'purchases' => $purchases,
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        return Inertia::render('Purchases/Create', [
            'purchase' => null,
            'suppliers' => Supplier::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'name', 'code']),
            'cashBankAccounts' => CashBankAccount::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('company_id', $companyId)->active()->orderBy('name')->get(['id', 'product_code', 'sku', 'name', 'product_type', 'unit', 'purchase_price', 'is_stock_tracked']),
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
            'supplier:id,name,code',
            'cashBankAccount:id,name',
            'payable:id,payable_number,payment_status,amount,paid_amount',
            'items.product:id,name,product_code,sku,product_type,unit',
            'journalEntries.lines.account:id,code,name',
        ]);

        return Inertia::render('Purchases/Show', [
            'purchase' => $purchase,
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
