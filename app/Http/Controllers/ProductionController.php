<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductionRequest;
use App\Models\Production;
use App\Models\Recipe;
use App\Services\ProductionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ProductionController extends Controller
{
    public function __construct(
        protected ProductionService $productionService
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $companyId = auth()->user()->current_company_id;
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $productions = Production::where('company_id', $companyId)
            ->with('product:id,product_code,name,unit')
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Production $production) => [
                'id' => $production->id,
                'production_number' => $production->production_number,
                'date' => $production->date->format('Y-m-d'),
                'product' => [
                    'id' => $production->product->id,
                    'product_code' => $production->product->product_code,
                    'name' => $production->product->name,
                    'unit' => $production->product->unit,
                ],
                'actual_yield_quantity' => (float) $production->actual_yield_quantity,
                'unit' => $production->unit,
                'total_input_cost' => (float) $production->total_input_cost,
                'unit_cost' => (float) $production->unit_cost,
                'status' => $production->status->value,
                'status_label' => $production->status->label(),
            ]);

        return Inertia::render('Fnb/Productions/Index', [
            'productions' => $productions,
            'filters' => ['per_page' => $perPage],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Fnb/Productions/Create', [
            'recipes' => $this->recipeOptions(),
        ]);
    }

    public function store(ProductionRequest $request): RedirectResponse
    {
        try {
            $production = $this->productionService->create($request->validated());
            $this->productionService->post($production);

            return redirect()->route('productions.show', $production)
                ->with('success', 'Produksi/prep berhasil diposting.');
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(Production $production): InertiaResponse
    {
        $this->authorizeCompany($production);
        $production->load([
            'product:id,product_code,name,unit',
            'recipe:id,product_id,yield_quantity,yield_unit',
            'inputs.product' => fn ($query) => $query->withTrashed()->select('id', 'product_code', 'name', 'unit', 'deleted_at'),
            'journalEntries.lines.account:id,code,name',
        ]);

        return Inertia::render('Fnb/Productions/Show', [
            'production' => [
                'id' => $production->id,
                'production_number' => $production->production_number,
                'date' => $production->date->format('Y-m-d'),
                'product' => [
                    'id' => $production->product->id,
                    'product_code' => $production->product->product_code,
                    'name' => $production->product->name,
                    'unit' => $production->product->unit,
                ],
                'recipe_yield_quantity' => (float) $production->recipe_yield_quantity,
                'actual_yield_quantity' => (float) $production->actual_yield_quantity,
                'unit' => $production->unit,
                'total_input_cost' => (float) $production->total_input_cost,
                'unit_cost' => (float) $production->unit_cost,
                'notes' => $production->notes,
                'status' => $production->status->value,
                'status_label' => $production->status->label(),
                'void_reason' => $production->void_reason,
                'inputs' => $production->inputs->map(fn ($input) => [
                    'id' => $input->id,
                    'product' => [
                        'id' => $input->product->id,
                        'product_code' => $input->product->product_code,
                        'name' => $input->product->name,
                        'unit' => $input->product->unit,
                    ],
                    'planned_quantity' => (float) $input->planned_quantity,
                    'actual_quantity' => (float) $input->actual_quantity,
                    'unit' => $input->unit,
                    'unit_cost' => (float) $input->unit_cost,
                    'total_cost' => (float) $input->total_cost,
                ]),
            ],
            'journalEntries' => $production->journalEntries->map(fn ($entry) => [
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

    public function void(Request $request, Production $production): RedirectResponse
    {
        $this->authorizeCompany($production);

        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->productionService->void($production, $request->reason);

            return redirect()->route('productions.show', $production)
                ->with('success', 'Produksi/prep berhasil dibatalkan.');
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    protected function authorizeCompany(Production $production): void
    {
        if ($production->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }

    protected function recipeOptions(): array
    {
        return Recipe::where('company_id', auth()->user()->current_company_id)
            ->where('is_active', true)
            ->whereHas('product', fn ($query) => $query
                ->where('is_active', true)
                ->where('is_stock_tracked', true)
                ->whereIn('product_type', ['semi_finished', 'menu_item', 'goods']))
            ->with([
                'product:id,product_code,name,unit,current_stock,average_cost,product_type',
                'items.ingredient:id,product_code,name,unit,current_stock,average_cost,product_type',
            ])
            ->orderBy('id')
            ->get()
            ->map(fn (Recipe $recipe) => [
                'id' => $recipe->id,
                'product' => [
                    'id' => $recipe->product->id,
                    'product_code' => $recipe->product->product_code,
                    'name' => $recipe->product->name,
                    'unit' => $recipe->product->unit,
                    'current_stock' => (float) $recipe->product->current_stock,
                    'average_cost' => (float) $recipe->product->average_cost,
                    'product_type' => $recipe->product->product_type,
                ],
                'yield_quantity' => (float) $recipe->yield_quantity,
                'yield_unit' => $recipe->yield_unit,
                'items' => $recipe->items->map(fn ($item) => [
                    'ingredient_product_id' => $item->ingredient_product_id,
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->unit,
                    'waste_percentage' => (float) $item->waste_percentage,
                    'ingredient' => [
                        'id' => $item->ingredient->id,
                        'product_code' => $item->ingredient->product_code,
                        'name' => $item->ingredient->name,
                        'unit' => $item->ingredient->unit,
                        'current_stock' => (float) $item->ingredient->current_stock,
                        'average_cost' => (float) $item->ingredient->average_cost,
                        'product_type' => $item->ingredient->product_type,
                    ],
                ])->values(),
            ])
            ->toArray();
    }
}
