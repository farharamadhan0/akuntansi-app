<?php

namespace App\Services;

use App\Enums\AccountType;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\Product;
use App\Models\Production;
use App\Models\ProductionInput;
use Illuminate\Support\Facades\DB;

class ProductionService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator,
        protected InventoryService $inventoryService
    ) {}

    public function create(array $data): Production
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;
            $product = Product::with('activeRecipe')->findOrFail($data['product_id']);
            $recipe = $product->activeRecipe;

            if (! $recipe) {
                throw new \Exception('Produk hasil harus memiliki resep aktif.');
            }

            $production = Production::create([
                'company_id' => $companyId,
                'production_number' => $this->numberGenerator->generateProductionNumber($companyId),
                'date' => $data['date'],
                'product_id' => $product->id,
                'recipe_id' => $recipe->id,
                'recipe_yield_quantity' => $recipe->yield_quantity,
                'actual_yield_quantity' => $data['actual_yield_quantity'],
                'unit' => $recipe->yield_unit,
                'inventory_account_id' => $product->inventory_account_id,
                'notes' => $data['notes'] ?? null,
                'status' => TransactionStatus::Draft,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['inputs'] as $inputData) {
                $inputProduct = Product::findOrFail($inputData['product_id']);

                ProductionInput::create([
                    'production_id' => $production->id,
                    'product_id' => $inputProduct->id,
                    'planned_quantity' => $inputData['planned_quantity'],
                    'actual_quantity' => $inputData['actual_quantity'],
                    'unit' => $inputData['unit'],
                    'unit_cost' => 0,
                    'total_cost' => 0,
                    'inventory_account_id' => $inputProduct->inventory_account_id,
                ]);
            }

            return $production->load('product', 'inputs.product');
        });
    }

    public function post(Production $production): Production
    {
        if ($production->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya produksi draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($production) {
            $production->load('product', 'inputs.product');

            if ($production->inputs->isEmpty()) {
                throw new \Exception('Produksi harus memiliki minimal satu bahan.');
            }

            $journalLines = [];
            $totalInputCost = 0;

            foreach ($production->inputs as $input) {
                $movement = $this->inventoryService->issue(
                    $input->product,
                    $production->date->toDateString(),
                    (float) $input->actual_quantity,
                    'production_input',
                    $production,
                    $input,
                    'Input produksi: ' . $production->product->name
                );

                $input->update([
                    'unit_cost' => $movement->unit_cost,
                    'total_cost' => $movement->total_cost,
                ]);

                $totalInputCost += (float) $movement->total_cost;
                $inventoryAccountId = $input->inventory_account_id ?: $input->product->inventory_account_id ?: $this->getInventoryAccountId($production->company_id);
                if ((float) $movement->total_cost > 0) {
                    $this->pushLine($journalLines, $inventoryAccountId, 0, (float) $movement->total_cost);
                }
            }

            $actualYield = (float) $production->actual_yield_quantity;
            $unitCost = $actualYield > 0 ? round($totalInputCost / $actualYield, 2) : 0;

            $outputMovement = $this->inventoryService->receive(
                $production->product,
                $production->date->toDateString(),
                $actualYield,
                $unitCost,
                'production_output',
                $production,
                null,
                'Output produksi'
            );

            if ($totalInputCost > 0) {
                $outputInventoryAccountId = $production->inventory_account_id ?: $production->product->inventory_account_id ?: $this->getInventoryAccountId($production->company_id);
                $this->pushLine($journalLines, $outputInventoryAccountId, round($totalInputCost, 2), 0);
            }

            $production->update([
                'total_input_cost' => round($totalInputCost, 2),
                'unit_cost' => $unitCost,
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            if ($totalInputCost > 0) {
                $this->journalService->createEntry(
                    $production->company_id,
                    $production->date->toDateString(),
                    'Produksi/Prep: ' . $production->production_number,
                    array_values($journalLines),
                    $production,
                    false,
                    true
                );
            }

            return $production->fresh()->load('product', 'inputs.product', 'journalEntries.lines.account');
        });
    }

    public function void(Production $production, string $reason): Production
    {
        if ($production->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya produksi yang sudah diposting yang dapat dibatalkan.');
        }

        return DB::transaction(function () use ($production, $reason) {
            $this->inventoryService->reverseSourceMovements($production);

            $journalEntry = $production->journalEntries()->where('status', TransactionStatus::Posted)->first();
            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, $reason);
            }

            $production->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $production->fresh();
        });
    }

    protected function pushLine(array &$lines, int $accountId, float $debit, float $credit): void
    {
        $side = $debit > 0 ? 'debit' : 'credit';
        $key = $accountId . ':' . $side;

        if (! isset($lines[$key])) {
            $lines[$key] = [
                'account_id' => $accountId,
                'debit' => 0,
                'credit' => 0,
            ];
        }

        $lines[$key]['debit'] += $debit;
        $lines[$key]['credit'] += $credit;
    }

    protected function getInventoryAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Asset)
            ->where('subtype', 'inventory')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }
}
