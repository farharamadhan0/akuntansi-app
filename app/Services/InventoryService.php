<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class InventoryService
{
    public function receive(
        Product $product,
        string $date,
        float $quantity,
        float $unitCost,
        string $movementType,
        ?Model $source = null,
        ?Model $sourceItem = null,
        ?string $notes = null
    ): StockMovement {
        $this->ensureStockTracked($product);

        if ($quantity <= 0) {
            throw new \InvalidArgumentException('Jumlah stok masuk harus lebih dari 0.');
        }

        if ($unitCost < 0) {
            throw new \InvalidArgumentException('Biaya per unit tidak boleh negatif.');
        }

        $currentQty = (float) $product->current_stock;
        $currentAvg = (float) $product->average_cost;
        $totalCost = $quantity * $unitCost;
        $newQty = $currentQty + $quantity;
        $newAvg = $newQty > 0
            ? ((($currentQty * $currentAvg) + $totalCost) / $newQty)
            : 0;

        $product->update([
            'current_stock' => $newQty,
            'average_cost' => round($newAvg, 2),
        ]);

        return StockMovement::create([
            'company_id' => $product->company_id,
            'product_id' => $product->id,
            'date' => $date,
            'source_type' => $source ? get_class($source) : null,
            'source_id' => $source?->id,
            'source_item_type' => $sourceItem ? get_class($sourceItem) : null,
            'source_item_id' => $sourceItem?->id,
            'movement_type' => $movementType,
            'quantity_in' => $quantity,
            'quantity_out' => 0,
            'unit_cost' => round($unitCost, 2),
            'total_cost' => round($totalCost, 2),
            'balance_quantity' => round($newQty, 2),
            'balance_average_cost' => round($newAvg, 2),
            'notes' => $notes,
            'created_by' => auth()->id(),
        ]);
    }

    public function issue(
        Product $product,
        string $date,
        float $quantity,
        string $movementType,
        ?Model $source = null,
        ?Model $sourceItem = null,
        ?string $notes = null
    ): StockMovement {
        $this->ensureStockTracked($product);

        if ($quantity <= 0) {
            throw new \InvalidArgumentException('Jumlah stok keluar harus lebih dari 0.');
        }

        $currentQty = (float) $product->current_stock;
        $currentAvg = (float) $product->average_cost;

        if ($quantity > $currentQty) {
            throw new \Exception("Stok produk {$product->name} tidak mencukupi.");
        }

        $totalCost = $quantity * $currentAvg;
        $newQty = $currentQty - $quantity;
        $newAvg = $newQty > 0 ? $currentAvg : 0;

        $product->update([
            'current_stock' => $newQty,
            'average_cost' => round($newAvg, 2),
        ]);

        return StockMovement::create([
            'company_id' => $product->company_id,
            'product_id' => $product->id,
            'date' => $date,
            'source_type' => $source ? get_class($source) : null,
            'source_id' => $source?->id,
            'source_item_type' => $sourceItem ? get_class($sourceItem) : null,
            'source_item_id' => $sourceItem?->id,
            'movement_type' => $movementType,
            'quantity_in' => 0,
            'quantity_out' => $quantity,
            'unit_cost' => round($currentAvg, 2),
            'total_cost' => round($totalCost, 2),
            'balance_quantity' => round($newQty, 2),
            'balance_average_cost' => round($newAvg, 2),
            'notes' => $notes,
            'created_by' => auth()->id(),
        ]);
    }

    public function reverseSourceMovements(Model $source, ?string $date = null): Collection
    {
        $movements = StockMovement::where('source_type', get_class($source))
            ->where('source_id', $source->id)
            ->orderByDesc('id')
            ->get();

        if ($movements->isEmpty()) {
            return collect();
        }

        foreach ($movements as $movement) {
            $latest = StockMovement::where('product_id', $movement->product_id)
                ->latest('id')
                ->first();

            if (! $latest || $latest->id !== $movement->id) {
                throw new \Exception(
                    "Dokumen tidak dapat dibatalkan karena stok produk {$movement->product->name} sudah memiliki mutasi yang lebih baru."
                );
            }
        }

        return $movements->map(function (StockMovement $movement) use ($source, $date) {
            $product = $movement->product;
            $reverseDate = $date ?? now()->toDateString();

            if ((float) $movement->quantity_in > 0) {
                return $this->issue(
                    $product,
                    $reverseDate,
                    (float) $movement->quantity_in,
                    'void',
                    $source,
                    null,
                    'Pembalikan stok'
                );
            }

            return $this->receive(
                $product,
                $reverseDate,
                (float) $movement->quantity_out,
                (float) $movement->unit_cost,
                'void',
                $source,
                null,
                'Pembalikan stok'
            );
        });
    }

    protected function ensureStockTracked(Product $product): void
    {
        if (! $product->is_stock_tracked) {
            throw new \Exception("Produk {$product->name} tidak menggunakan pelacakan stok.");
        }
    }
}
