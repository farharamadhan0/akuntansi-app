<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaleRequest;
use App\Models\CashBankAccount;
use App\Models\Product;
use App\Models\Sale;
use App\Services\SaleService;
use App\Enums\TransactionStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(
        protected SaleService $saleService
    ) {}

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;
        $receiptSale = null;
        $receiptSaleId = session('pos_receipt_sale_id');

        if ($receiptSaleId) {
            $sale = Sale::where('company_id', $companyId)
                ->whereKey($receiptSaleId)
                ->with([
                    'cashBankAccount:id,name',
                    'partner:id,name,code',
                    'items.product' => fn ($query) => $query
                        ->withTrashed()
                        ->select('id', 'name', 'product_code', 'sku', 'unit', 'deleted_at'),
                ])
                ->first();

            if ($sale) {
                $receiptSale = $this->receiptPayload($sale);
            }
        }

        return Inertia::render('Sales/Pos', [
            'cashBankAccounts' => CashBankAccount::where('company_id', $companyId)
                ->active()
                ->orderBy('name')
                ->get(['id', 'name']),
            'products' => Product::where('company_id', $companyId)
                ->active()
                ->orderBy('name')
                ->get(['id', 'product_code', 'sku', 'name', 'product_type', 'unit', 'sales_price', 'is_stock_tracked', 'current_stock']),
            'receiptSale' => $receiptSale,
            'autoPrint' => (bool) session('pos_auto_print', false),
            'summary' => $this->todaySummary($companyId),
        ]);
    }

    public function store(SaleRequest $request): RedirectResponse
    {
        try {
            $shouldPrint = $request->boolean('print_receipt');

            $sale = DB::transaction(function () use ($request) {
                $sale = $this->saleService->create(array_merge($request->validated(), [
                    'source' => 'pos',
                ]));

                return $this->saleService->post($sale);
            });

            return redirect()->route('pos.create')
                ->with('success', 'Transaksi POS berhasil dicatat.')
                ->with('pos_receipt_sale_id', $sale->id)
                ->with('pos_auto_print', $shouldPrint);
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function receipt(Sale $sale): Response
    {
        $this->authorizeCompany($sale);

        $sale->load([
            'cashBankAccount:id,name',
            'partner:id,name,code',
            'items.product' => fn ($query) => $query
                ->withTrashed()
                ->select('id', 'name', 'product_code', 'sku', 'unit', 'deleted_at'),
        ]);

        return Inertia::render('Sales/Receipt', [
            'sale' => $this->receiptPayload($sale),
        ]);
    }

    protected function authorizeCompany(Sale $sale): void
    {
        if ($sale->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }

    protected function receiptPayload(Sale $sale): array
    {
        $companyName = auth()->user()->currentCompany?->name ?? 'Toko';

        return [
            'id' => $sale->id,
            'company_name' => $companyName,
            'sale_number' => $sale->sale_number,
            'date' => $sale->date->format('Y-m-d'),
            'posted_at' => $sale->posted_at?->format('Y-m-d H:i'),
            'payment_type' => $sale->payment_type,
            'source' => $sale->source,
            'subtotal' => (float) $sale->subtotal,
            'discount_amount' => (float) $sale->discount_amount,
            'tax_amount' => (float) $sale->tax_amount,
            'total_amount' => (float) $sale->total_amount,
            'reference' => $sale->reference,
            'notes' => $sale->notes,
            'cash_bank_account' => $sale->cashBankAccount ? [
                'name' => $sale->cashBankAccount->name,
            ] : null,
            'partner' => $sale->partner ? [
                'name' => $sale->partner->name,
                'code' => $sale->partner->code,
            ] : null,
            'items' => $sale->items->map(fn ($item) => [
                'id' => $item->id,
                'description' => $item->description,
                'quantity' => (float) $item->quantity,
                'unit' => $item->unit,
                'unit_price' => (float) $item->unit_price,
                'discount_amount' => (float) $item->discount_amount,
                'tax_amount' => (float) $item->tax_amount,
                'line_total' => (float) $item->line_total,
                'product' => $item->product ? [
                    'name' => $item->product->name,
                    'product_code' => $item->product->product_code,
                    'sku' => $item->product->sku,
                ] : null,
            ]),
        ];
    }

    protected function todaySummary(int $companyId): array
    {
        $query = Sale::where('company_id', $companyId)
            ->where('source', 'pos')
            ->where('created_by', auth()->id())
            ->where('status', TransactionStatus::Posted)
            ->whereDate('date', today());

        $lastSale = (clone $query)
            ->latest('posted_at')
            ->latest('id')
            ->first(['sale_number', 'total_amount']);

        return [
            'transaction_count' => (clone $query)->count(),
            'total_amount' => (float) (clone $query)->sum('total_amount'),
            'last_sale_number' => $lastSale?->sale_number,
            'last_sale_amount' => $lastSale ? (float) $lastSale->total_amount : null,
        ];
    }
}
