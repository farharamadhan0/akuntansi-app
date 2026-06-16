<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecipeRequest;
use App\Models\Product;
use App\Models\Recipe;
use App\Services\RecipeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class RecipeController extends Controller
{
    public function __construct(
        protected RecipeService $recipeService
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $companyId = auth()->user()->current_company_id;
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $recipes = Recipe::where('company_id', $companyId)
            ->with(['product:id,product_code,name,unit,sales_price,product_type,is_active', 'items.ingredient:id,name,unit,average_cost'])
            ->withCount(['items', 'productions'])
            ->orderByDesc('is_active')
            ->orderBy(Product::select('name')->whereColumn('products.id', 'recipes.product_id'))
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Recipe $recipe) => array_merge($this->recipePayload($recipe), [
                'items_count' => $recipe->items_count,
            ]));

        return Inertia::render('Fnb/Recipes/Index', [
            'recipes' => $recipes,
            'filters' => [
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Fnb/Recipes/Form', [
            'recipe' => null,
            'menuProducts' => $this->menuProductOptions(),
            'ingredientProducts' => $this->ingredientProductOptions(),
        ]);
    }

    public function store(RecipeRequest $request): RedirectResponse
    {
        $recipe = $this->recipeService->create($request->validated());

        return redirect()->route('recipes.edit', $recipe)
            ->with('success', 'Resep berhasil ditambahkan.');
    }

    public function edit(Recipe $recipe): InertiaResponse
    {
        $this->authorizeCompany($recipe);
        $recipe->load(['product', 'items.ingredient']);

        return Inertia::render('Fnb/Recipes/Form', [
            'recipe' => $this->recipePayload($recipe, includeItems: true),
            'menuProducts' => $this->menuProductOptions($recipe->product_id),
            'ingredientProducts' => $this->ingredientProductOptions(),
        ]);
    }

    public function update(RecipeRequest $request, Recipe $recipe): RedirectResponse
    {
        $this->authorizeCompany($recipe);
        $this->recipeService->update($recipe, $request->validated());

        return redirect()->route('recipes.edit', $recipe)
            ->with('success', 'Resep berhasil diperbarui.');
    }

    public function destroy(Recipe $recipe): RedirectResponse
    {
        $this->authorizeCompany($recipe);

        try {
            $recipe->delete();
        } catch (QueryException $e) {
            return redirect()->route('recipes.index')
                ->with('error', 'Resep tidak dapat dihapus karena masih dipakai oleh transaksi lain. Nonaktifkan resep jika sudah tidak dipakai.');
        }

        return redirect()->route('recipes.index')
            ->with('success', 'Resep berhasil dihapus.');
    }

    protected function authorizeCompany(Recipe $recipe): void
    {
        if ($recipe->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }

    protected function recipePayload(Recipe $recipe, bool $includeItems = false): array
    {
        $cost = $this->recipeService->estimateCost($recipe);

        $payload = [
            'id' => $recipe->id,
            'product_id' => $recipe->product_id,
            'yield_quantity' => (float) $recipe->yield_quantity,
            'yield_unit' => $recipe->yield_unit,
            'notes' => $recipe->notes,
            'is_active' => $recipe->is_active,
            'product' => [
                'id' => $recipe->product->id,
                'product_code' => $recipe->product->product_code,
                'name' => $recipe->product->name,
                'unit' => $recipe->product->unit,
                'sales_price' => (float) $recipe->product->sales_price,
                'product_type' => $recipe->product->product_type,
                'is_active' => $recipe->product->is_active,
            ],
            'estimated_cost' => $cost,
            'productions_count' => (int) ($recipe->productions_count ?? 0),
        ];

        if ($includeItems) {
            $payload['items'] = $recipe->items->map(fn ($item) => [
                'id' => $item->id,
                'ingredient_product_id' => $item->ingredient_product_id,
                'quantity' => (float) $item->quantity,
                'unit' => $item->unit,
                'waste_percentage' => (float) $item->waste_percentage,
                'ingredient' => [
                    'id' => $item->ingredient->id,
                    'name' => $item->ingredient->name,
                    'unit' => $item->ingredient->unit,
                    'average_cost' => (float) $item->ingredient->average_cost,
                ],
            ])->values();
        }

        return $payload;
    }

    protected function menuProductOptions(?int $currentProductId = null): array
    {
        $companyId = auth()->user()->current_company_id;
        $usedProductIds = Recipe::where('company_id', $companyId)
            ->when($currentProductId, fn ($query) => $query->where('product_id', '!=', $currentProductId))
            ->pluck('product_id');

        return Product::where('company_id', $companyId)
            ->where('is_active', true)
            ->whereIn('product_type', ['menu_item', 'semi_finished'])
            ->whereNotIn('id', $usedProductIds)
            ->orderBy('name')
            ->get(['id', 'product_code', 'name', 'unit', 'sales_price', 'product_type'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'product_code' => $product->product_code,
                'name' => $product->name,
                'unit' => $product->unit,
                'sales_price' => (float) $product->sales_price,
                'product_type' => $product->product_type,
            ])
            ->toArray();
    }

    protected function ingredientProductOptions(): array
    {
        return Product::where('company_id', auth()->user()->current_company_id)
            ->where('is_active', true)
            ->where('is_stock_tracked', true)
            ->orderBy('name')
            ->get(['id', 'product_code', 'name', 'unit', 'average_cost', 'current_stock', 'product_type'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'product_code' => $product->product_code,
                'name' => $product->name,
                'unit' => $product->unit,
                'average_cost' => (float) $product->average_cost,
                'current_stock' => (float) $product->current_stock,
                'product_type' => $product->product_type,
            ])
            ->toArray();
    }
}
