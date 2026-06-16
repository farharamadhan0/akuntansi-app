<?php

namespace App\Http\Controllers;

use App\Enums\TransactionStatus;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\SaleItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class FnbAnalyticsController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $companyId = auth()->user()->current_company_id;
        $from = $request->query('from')
            ? Carbon::parse($request->query('from'))->toDateString()
            : now()->startOfMonth()->toDateString();
        $to = $request->query('to')
            ? Carbon::parse($request->query('to'))->toDateString()
            : now()->endOfMonth()->toDateString();

        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }

        $menuPerformance = $this->menuPerformance($companyId, $from, $to);
        $summary = [
            'revenue' => (float) $menuPerformance->sum('revenue'),
            'cogs' => (float) $menuPerformance->sum('cogs'),
            'gross_profit' => (float) $menuPerformance->sum('gross_profit'),
            'quantity' => (float) $menuPerformance->sum('quantity'),
            'menu_count' => $menuPerformance->count(),
        ];
        $summary['margin_percentage'] = $summary['revenue'] > 0
            ? round(($summary['gross_profit'] / $summary['revenue']) * 100, 2)
            : null;

        return Inertia::render('Fnb/Analytics/Index', [
            'filters' => [
                'from' => $from,
                'to' => $to,
            ],
            'summary' => $summary,
            'menuPerformance' => $menuPerformance->values(),
            'recipeAvailability' => $this->recipeAvailability($companyId),
            'stockAttention' => $this->stockAttention($companyId),
        ]);
    }

    protected function menuPerformance(int $companyId, string $from, string $to)
    {
        return SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.company_id', $companyId)
            ->where('sales.status', TransactionStatus::Posted)
            ->whereBetween('sales.date', [$from, $to])
            ->whereIn('products.product_type', ['menu_item', 'semi_finished'])
            ->selectRaw('products.id as product_id, products.product_code, products.name as product_name, sale_items.unit')
            ->selectRaw('SUM(sale_items.quantity) as quantity')
            ->selectRaw('SUM(sale_items.line_total) as revenue')
            ->selectRaw('SUM(sale_items.cost_amount) as cogs')
            ->groupBy('products.id', 'products.product_code', 'products.name', 'sale_items.unit')
            ->orderByDesc('revenue')
            ->limit(25)
            ->get()
            ->map(function ($row) {
                $revenue = (float) $row->revenue;
                $cogs = (float) $row->cogs;
                $grossProfit = $revenue - $cogs;

                return [
                    'product_id' => (int) $row->product_id,
                    'product_code' => (string) $row->product_code,
                    'product_name' => (string) $row->product_name,
                    'unit' => (string) $row->unit,
                    'quantity' => (float) $row->quantity,
                    'revenue' => $revenue,
                    'cogs' => $cogs,
                    'gross_profit' => $grossProfit,
                    'margin_percentage' => $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : null,
                ];
            });
    }

    protected function recipeAvailability(int $companyId)
    {
        return Recipe::where('company_id', $companyId)
            ->where('is_active', true)
            ->with(['product:id,product_code,name,unit,product_type', 'items.ingredient:id,name,unit,current_stock'])
            ->orderBy(Product::select('name')->whereColumn('products.id', 'recipes.product_id'))
            ->get()
            ->map(function (Recipe $recipe) {
                $availableUnits = null;
                $limitingIngredient = null;
                $yieldQuantity = max((float) $recipe->yield_quantity, 0.00001);

                foreach ($recipe->items as $item) {
                    $requiredPerUnit = ((float) $item->quantity / $yieldQuantity) * (1 + ((float) $item->waste_percentage / 100));

                    if ($requiredPerUnit <= 0) {
                        continue;
                    }

                    $ingredientAvailableUnits = floor((float) $item->ingredient->current_stock / $requiredPerUnit);

                    if ($availableUnits === null || $ingredientAvailableUnits < $availableUnits) {
                        $availableUnits = $ingredientAvailableUnits;
                        $limitingIngredient = [
                            'id' => $item->ingredient->id,
                            'name' => $item->ingredient->name,
                            'stock' => (float) $item->ingredient->current_stock,
                            'unit' => $item->ingredient->unit,
                            'required_per_unit' => round($requiredPerUnit, 2),
                        ];
                    }
                }

                return [
                    'recipe_id' => $recipe->id,
                    'product_id' => $recipe->product->id,
                    'product_code' => $recipe->product->product_code,
                    'product_name' => $recipe->product->name,
                    'yield_unit' => $recipe->yield_unit,
                    'available_units' => $availableUnits ?? 0,
                    'limiting_ingredient' => $limitingIngredient,
                ];
            })
            ->sortBy('available_units')
            ->values()
            ->take(25);
    }

    protected function stockAttention(int $companyId)
    {
        return Product::where('company_id', $companyId)
            ->where('is_active', true)
            ->where('is_stock_tracked', true)
            ->whereIn('product_type', ['raw_material', 'semi_finished', 'goods'])
            ->where('current_stock', '<=', 5)
            ->orderBy('current_stock')
            ->orderBy('name')
            ->limit(25)
            ->get(['id', 'product_code', 'name', 'unit', 'current_stock', 'average_cost', 'product_type'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'product_code' => $product->product_code,
                'name' => $product->name,
                'unit' => $product->unit,
                'current_stock' => (float) $product->current_stock,
                'average_cost' => (float) $product->average_cost,
                'product_type' => $product->product_type,
            ]);
    }
}
