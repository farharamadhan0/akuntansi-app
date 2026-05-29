<?php

namespace App\Http\Controllers;

use App\Http\Requests\StockAdjustmentRequest;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Services\StockAdjustmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockAdjustmentController extends Controller
{
    public function __construct(
        protected StockAdjustmentService $stockAdjustmentService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $adjustments = StockAdjustment::where('company_id', $companyId)
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (StockAdjustment $adjustment) => [
                'id' => $adjustment->id,
                'adjustment_number' => $adjustment->adjustment_number,
                'date' => $adjustment->date->format('Y-m-d'),
                'notes' => $adjustment->notes,
                'status' => $adjustment->status->value,
                'status_label' => $adjustment->status->label(),
            ]);

        return Inertia::render('Inventory/Adjustments/Index', [
            'adjustments' => $adjustments,
            'filters' => [
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        return Inertia::render('Inventory/Adjustments/Create', [
            'adjustment' => null,
            'products' => Product::where('company_id', $companyId)
                ->active()
                ->goods()
                ->where('is_stock_tracked', true)
                ->orderBy('name')
                ->get(['id', 'product_code', 'sku', 'name', 'unit', 'current_stock', 'average_cost']),
        ]);
    }

    public function store(StockAdjustmentRequest $request): RedirectResponse
    {
        try {
            $adjustment = $this->stockAdjustmentService->create($request->validated());
            $this->stockAdjustmentService->post($adjustment);

            return redirect()->route('stock-adjustments.show', $adjustment)
                ->with('success', 'Penyesuaian stok berhasil dicatat.');
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(StockAdjustment $stockAdjustment): Response
    {
        $this->authorizeCompany($stockAdjustment);

        $stockAdjustment->load([
            'items.product' => fn ($q) => $q->withTrashed()->select('id', 'name', 'product_code', 'sku', 'unit', 'deleted_at'),
            'journalEntries.lines.account:id,code,name',
        ]);

        return Inertia::render('Inventory/Adjustments/Show', [
            'stock_adjustment' => $stockAdjustment,
            'journalEntries' => $stockAdjustment->journalEntries->map(fn ($entry) => [
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

    public function void(Request $request, StockAdjustment $stockAdjustment): RedirectResponse
    {
        $this->authorizeCompany($stockAdjustment);

        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->stockAdjustmentService->void($stockAdjustment, $request->reason);

            return redirect()->route('stock-adjustments.show', $stockAdjustment)
                ->with('success', 'Penyesuaian stok berhasil dibatalkan.');
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    protected function authorizeCompany(StockAdjustment $stockAdjustment): void
    {
        if ($stockAdjustment->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }
}
