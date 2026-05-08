<?php

namespace App\Services;

use App\Enums\AccountType;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use Illuminate\Support\Facades\DB;

class StockAdjustmentService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator,
        protected InventoryService $inventoryService
    ) {}

    public function create(array $data): StockAdjustment
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;

            $adjustment = StockAdjustment::create([
                'company_id' => $companyId,
                'adjustment_number' => $this->numberGenerator->generateStockAdjustmentNumber($companyId),
                'date' => $data['date'],
                'notes' => $data['notes'] ?? null,
                'status' => TransactionStatus::Draft,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['items'] as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);

                StockAdjustmentItem::create([
                    'stock_adjustment_id' => $adjustment->id,
                    'product_id' => $product->id,
                    'adjustment_type' => $itemData['adjustment_type'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost' => $itemData['unit_cost'] ?? null,
                    'total_cost' => 0,
                    'inventory_account_id' => $itemData['inventory_account_id'] ?? $product->inventory_account_id,
                    'adjustment_account_id' => $itemData['adjustment_account_id'] ?? $this->getAdjustmentAccountId($companyId),
                    'reason' => $itemData['reason'] ?? null,
                ]);
            }

            return $adjustment->load('items.product');
        });
    }

    public function post(StockAdjustment $adjustment): StockAdjustment
    {
        if ($adjustment->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya penyesuaian stok draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($adjustment) {
            $adjustment->load('items.product');

            if ($adjustment->items->isEmpty()) {
                throw new \Exception('Penyesuaian stok harus memiliki minimal satu item.');
            }

            $journalLines = [];

            foreach ($adjustment->items as $item) {
                $inventoryAccountId = $item->inventory_account_id ?: $item->product->inventory_account_id ?: $this->getInventoryAccountId($adjustment->company_id);
                $adjustmentAccountId = $item->adjustment_account_id ?: $this->getAdjustmentAccountId($adjustment->company_id);

                if ($item->adjustment_type === 'in') {
                    if ($item->unit_cost === null) {
                        throw new \Exception("Penyesuaian masuk untuk produk {$item->product->name} harus memiliki unit cost.");
                    }

                    $movement = $this->inventoryService->receive(
                        $item->product,
                        $adjustment->date->toDateString(),
                        (float) $item->quantity,
                        (float) $item->unit_cost,
                        'adjustment_in',
                        $adjustment,
                        $item,
                        $item->reason
                    );

                    $item->update(['total_cost' => $movement->total_cost]);

                    $this->pushLine($journalLines, $inventoryAccountId, (float) $movement->total_cost, 0);
                    $this->pushLine($journalLines, $adjustmentAccountId, 0, (float) $movement->total_cost);
                } else {
                    $movement = $this->inventoryService->issue(
                        $item->product,
                        $adjustment->date->toDateString(),
                        (float) $item->quantity,
                        'adjustment_out',
                        $adjustment,
                        $item,
                        $item->reason
                    );

                    $item->update([
                        'unit_cost' => $movement->unit_cost,
                        'total_cost' => $movement->total_cost,
                    ]);

                    $this->pushLine($journalLines, $adjustmentAccountId, (float) $movement->total_cost, 0);
                    $this->pushLine($journalLines, $inventoryAccountId, 0, (float) $movement->total_cost);
                }
            }

            $this->journalService->createEntry(
                $adjustment->company_id,
                $adjustment->date->toDateString(),
                'Penyesuaian Stok: ' . $adjustment->adjustment_number,
                array_values($journalLines),
                $adjustment,
                false,
                true
            );

            $adjustment->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            return $adjustment->fresh()->load('items.product');
        });
    }

    public function void(StockAdjustment $adjustment, string $reason): StockAdjustment
    {
        if ($adjustment->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya penyesuaian stok yang sudah diposting yang dapat dibatalkan.');
        }

        return DB::transaction(function () use ($adjustment, $reason) {
            $this->inventoryService->reverseSourceMovements($adjustment);

            $journalEntry = $adjustment->journalEntries()->where('status', TransactionStatus::Posted)->first();
            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, $reason);
            }

            $adjustment->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $adjustment->fresh();
        });
    }

    protected function pushLine(array &$lines, int $accountId, float $debit, float $credit): void
    {
        if (! isset($lines[$accountId])) {
            $lines[$accountId] = [
                'account_id' => $accountId,
                'debit' => 0,
                'credit' => 0,
            ];
        }

        $lines[$accountId]['debit'] += $debit;
        $lines[$accountId]['credit'] += $credit;
    }

    protected function getInventoryAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Asset)
            ->where('subtype', 'inventory')
            ->firstOrFail()
            ->id;
    }

    protected function getAdjustmentAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Expense)
            ->where('subtype', 'inventory_adjustment')
            ->firstOrFail()
            ->id;
    }
}
