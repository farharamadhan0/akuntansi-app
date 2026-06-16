<?php

namespace App\Services;

use App\Models\Recipe;
use Illuminate\Support\Facades\DB;

class RecipeService
{
    public function create(array $data): Recipe
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;
            $recipe = Recipe::onlyTrashed()
                ->where('company_id', $companyId)
                ->where('product_id', $data['product_id'])
                ->first();

            $attributes = [
                'company_id' => $companyId,
                'product_id' => $data['product_id'],
                'yield_quantity' => $data['yield_quantity'],
                'yield_unit' => $data['yield_unit'],
                'notes' => $data['notes'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ];

            if ($recipe) {
                $recipe->restore();
                $recipe->update($attributes);
            } else {
                $recipe = Recipe::create([
                    ...$attributes,
                    'created_by' => auth()->id(),
                ]);
            }

            $this->syncItems($recipe, $data['items'] ?? []);

            return $recipe->fresh(['product', 'items.ingredient']);
        });
    }

    public function update(Recipe $recipe, array $data): Recipe
    {
        return DB::transaction(function () use ($recipe, $data) {
            $recipe->update([
                'product_id' => $data['product_id'],
                'yield_quantity' => $data['yield_quantity'],
                'yield_unit' => $data['yield_unit'],
                'notes' => $data['notes'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            $this->syncItems($recipe, $data['items'] ?? []);

            return $recipe->fresh(['product', 'items.ingredient']);
        });
    }

    public function estimateCost(Recipe $recipe): array
    {
        $recipe->loadMissing('items.ingredient', 'product');
        $totalCost = 0;

        foreach ($recipe->items as $item) {
            $quantityWithWaste = (float) $item->quantity * (1 + ((float) $item->waste_percentage / 100));
            $totalCost += $quantityWithWaste * (float) $item->ingredient->average_cost;
        }

        $yieldQuantity = max((float) $recipe->yield_quantity, 0.00001);
        $costPerYield = round($totalCost / $yieldQuantity, 2);
        $salesPrice = (float) $recipe->product->sales_price;
        $grossProfit = round($salesPrice - $costPerYield, 2);
        $marginPercentage = $salesPrice > 0 ? round(($grossProfit / $salesPrice) * 100, 2) : 0;

        return [
            'total_cost' => round($totalCost, 2),
            'cost_per_yield' => $costPerYield,
            'gross_profit' => $grossProfit,
            'margin_percentage' => $marginPercentage,
        ];
    }

    protected function syncItems(Recipe $recipe, array $items): void
    {
        $recipe->items()->delete();

        foreach ($items as $item) {
            $recipe->items()->create([
                'ingredient_product_id' => $item['ingredient_product_id'],
                'quantity' => $item['quantity'],
                'unit' => $item['unit'],
                'waste_percentage' => $item['waste_percentage'] ?? 0,
            ]);
        }
    }
}
