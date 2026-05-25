<?php

namespace App\Services;

use App\Enums\AccountType;
use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\Product;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator,
        protected InventoryService $inventoryService
    ) {}

    public function create(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;
            $totals = $this->calculateTotals($data['items'] ?? []);

            $sale = Sale::create([
                'company_id' => $companyId,
                'sale_number' => $this->numberGenerator->generateSaleNumber($companyId),
                'partner_id' => $data['partner_id'] ?? null,
                'date' => $data['date'],
                'due_date' => $data['due_date'] ?? null,
                'payment_type' => $data['payment_type'],
                'cash_bank_account_id' => $data['cash_bank_account_id'] ?? null,
                'subtotal' => $totals['subtotal'],
                'discount_amount' => $totals['discount_amount'],
                'tax_amount' => $totals['tax_amount'],
                'total_amount' => $totals['total_amount'],
                'notes' => $data['notes'] ?? null,
                'status' => TransactionStatus::Draft,
                'corrects_id' => $data['corrects_id'] ?? null,
                'reference' => $data['reference'] ?? null,
                'attachments' => $data['attachments'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['items'] as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);
                $line = $this->normalizeLine($product, $itemData);

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit' => $line['unit'],
                    'unit_price' => $line['unit_price'],
                    'discount_amount' => $line['discount_amount'],
                    'tax_amount' => $line['tax_amount'],
                    'line_total' => $line['line_total'],
                    'is_stock_tracked' => $product->is_stock_tracked,
                    'revenue_account_id' => $itemData['revenue_account_id'] ?? $product->revenue_account_id,
                    'cogs_account_id' => $itemData['cogs_account_id'] ?? $product->cogs_account_id,
                    'inventory_account_id' => $itemData['inventory_account_id'] ?? $product->inventory_account_id,
                    'unit_cost' => 0,
                    'cost_amount' => 0,
                ]);
            }

            return $sale->load('items.product');
        });
    }

    public function post(Sale $sale): Sale
    {
        if ($sale->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya penjualan draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($sale) {
            $sale->load('items.product', 'cashBankAccount.account', 'partner');
            $this->validatePaymentData($sale);

            $this->applyPostedStock($sale);
            $this->createSaleJournalEntry($sale);

            if ($sale->payment_type === 'credit') {
                $receivable = $this->createLinkedReceivable($sale);
                $sale->update(['receivable_id' => $receivable->id]);
            }

            $sale->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            return $sale->fresh()->load('items.product', 'receivable');
        });
    }

    public function correct(Sale $oldSale, array $newData): Sale
    {
        if ($oldSale->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya penjualan yang sudah diposting yang dapat dikoreksi.');
        }

        return DB::transaction(function () use ($oldSale, $newData) {
            $oldSale->load('items.product', 'receivable.paymentAllocations');

            $existingAllocations = $oldSale->receivable?->paymentAllocations()->get() ?? collect();
            $totalPaid = (float) $existingAllocations->sum('amount');

            $newSale = $this->create(array_merge($newData, [
                'company_id' => $oldSale->company_id,
                'corrects_id' => $oldSale->id,
            ]));

            $newSale->load('items.product', 'cashBankAccount.account', 'partner');
            $this->validatePaymentData($newSale);

            if ($totalPaid > 0 && $newSale->payment_type !== 'credit') {
                throw new \Exception('Penjualan koreksi dengan pembayaran piutang yang sudah ada harus tetap menggunakan pembayaran kredit.');
            }

            if ($totalPaid > 0 && bccomp((string) $newSale->total_amount, (string) $totalPaid, 2) < 0) {
                throw new \Exception('Nilai koreksi penjualan tidak boleh lebih kecil dari total pembayaran yang sudah ada.');
            }

            $this->ensureStockSufficientForCorrection($oldSale, $newSale);

            $journalEntry = $oldSale->journalEntries()
                ->where('status', TransactionStatus::Posted)
                ->first();

            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, 'Koreksi penjualan: ' . $oldSale->sale_number);
            }

            $this->applyCorrectionStock($oldSale, $newSale);
            $this->createSaleJournalEntry($newSale);

            $newReceivable = null;

            if ($newSale->payment_type === 'credit') {
                $newReceivable = $this->createLinkedReceivable($newSale, $oldSale->receivable?->id);
                $newSale->update(['receivable_id' => $newReceivable->id]);
            }

            $newSale->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            if ($oldSale->receivable) {
                if ($newReceivable) {
                    foreach ($existingAllocations as $allocation) {
                        $allocation->update([
                            'allocatable_id' => $newReceivable->id,
                        ]);
                    }

                    if ($totalPaid > 0) {
                        $newReceivable->update(['paid_amount' => $totalPaid]);
                        $this->updateReceivablePaymentStatus($newReceivable->fresh());
                    }

                    $oldSale->receivable->update([
                        'paid_amount' => 0,
                        'payment_status' => PaymentStatus::Unpaid,
                        'status' => TransactionStatus::Corrected,
                        'corrected_at' => now(),
                        'corrected_by_id' => $newReceivable->id,
                    ]);
                } else {
                    $oldSale->receivable->update([
                        'status' => TransactionStatus::Voided,
                        'voided_at' => now(),
                        'void_reason' => 'Dikoreksi oleh penjualan ' . $newSale->sale_number,
                    ]);
                }
            }

            $oldSale->update([
                'status' => TransactionStatus::Corrected,
                'corrected_at' => now(),
                'corrected_by_id' => $newSale->id,
            ]);

            return $newSale->fresh()->load('items.product', 'receivable');
        });
    }

    public function void(Sale $sale, string $reason): Sale
    {
        if ($sale->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya penjualan yang sudah diposting yang dapat dibatalkan.');
        }

        return DB::transaction(function () use ($sale, $reason) {
            $sale->load('receivable');

            if ($sale->receivable && (float) $sale->receivable->paid_amount > 0) {
                throw new \Exception('Penjualan kredit yang sudah dibayar tidak dapat dibatalkan.');
            }

            $this->inventoryService->reverseSourceMovements($sale);

            $journalEntry = $sale->journalEntries()->where('status', TransactionStatus::Posted)->first();
            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, $reason);
            }

            if ($sale->receivable) {
                $sale->receivable->update([
                    'status' => TransactionStatus::Voided,
                    'voided_at' => now(),
                    'void_reason' => $reason,
                ]);
            }

            $sale->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $sale->fresh();
        });
    }

    protected function createLinkedReceivable(Sale $sale, ?int $correctsId = null): Receivable
    {
        return Receivable::create([
            'company_id' => $sale->company_id,
            'receivable_number' => $this->numberGenerator->generateReceivableNumber($sale->company_id),
            'partner_id' => $sale->partner_id,
            'date' => $sale->date,
            'due_date' => $sale->due_date,
            'amount' => $sale->total_amount,
            'paid_amount' => 0,
            'description' => 'Dari penjualan ' . $sale->sale_number,
            'status' => TransactionStatus::Posted,
            'payment_status' => PaymentStatus::Unpaid,
            'corrects_id' => $correctsId,
            'reference' => $sale->reference,
            'created_by' => auth()->id(),
            'posted_at' => now(),
        ]);
    }

    protected function applyPostedStock(Sale $sale): void
    {
        foreach ($sale->items as $item) {
            if (! $item->is_stock_tracked) {
                continue;
            }

            $movement = $this->inventoryService->issue(
                $item->product,
                $sale->date->toDateString(),
                (float) $item->quantity,
                'sale',
                $sale,
                $item,
                'Penjualan barang'
            );

            $item->update([
                'unit_cost' => $movement->unit_cost,
                'cost_amount' => $movement->total_cost,
            ]);
        }

        $sale->load('items.product', 'cashBankAccount.account');
    }

    protected function createSaleJournalEntry(Sale $sale): void
    {
        $this->journalService->createEntry(
            $sale->company_id,
            $sale->date->toDateString(),
            'Penjualan: ' . $sale->sale_number,
            $this->buildJournalLines($sale),
            $sale
        );
    }

    protected function buildJournalLines(Sale $sale): array
    {
        $journalLines = [];
        $debitAccountId = $sale->payment_type === 'cash'
            ? $sale->cashBankAccount->account_id
            : $this->getReceivableAccountId($sale->company_id);

        $this->pushLine($journalLines, $debitAccountId, (float) $sale->total_amount, 0);

        foreach ($sale->items as $item) {
            $revenueAccountId = $item->revenue_account_id ?: $item->product->revenue_account_id ?: $this->getDefaultRevenueAccountId($sale->company_id);
            $this->pushLine($journalLines, $revenueAccountId, 0, (float) $item->line_total);

            if (! $item->is_stock_tracked) {
                continue;
            }

            $cogsAccountId = $item->cogs_account_id ?: $item->product->cogs_account_id ?: $this->getDefaultCogsAccountId($sale->company_id);
            $inventoryAccountId = $item->inventory_account_id ?: $item->product->inventory_account_id ?: $this->getDefaultInventoryAccountId($sale->company_id);

            $this->pushLine($journalLines, $cogsAccountId, (float) $item->cost_amount, 0);
            $this->pushLine($journalLines, $inventoryAccountId, 0, (float) $item->cost_amount);
        }

        return array_values($journalLines);
    }

    protected function ensureStockSufficientForCorrection(Sale $oldSale, Sale $newSale): void
    {
        $oldItems = $this->summarizeTrackedItems($oldSale);
        $newItems = $this->summarizeTrackedItems($newSale);
        $productIds = array_unique(array_merge(array_keys($oldItems), array_keys($newItems)));

        foreach ($productIds as $productId) {
            $oldQuantity = $oldItems[$productId]['quantity'] ?? 0;
            $newQuantity = $newItems[$productId]['quantity'] ?? 0;
            $deltaQuantity = round($newQuantity - $oldQuantity, 2);

            if ($deltaQuantity <= 0) {
                continue;
            }

            $product = $newItems[$productId]['product'] ?? $oldItems[$productId]['product'];
            $availableStock = (float) $product->current_stock;

            if ($deltaQuantity - $availableStock > 0.00001) {
                throw new \Exception("Stok produk {$product->name} tidak cukup untuk tambahan koreksi penjualan. Tersedia {$availableStock}, membutuhkan {$deltaQuantity}.");
            }
        }
    }

    protected function applyCorrectionStock(Sale $oldSale, Sale $newSale): void
    {
        $oldItems = $this->summarizeTrackedItems($oldSale);
        $newItems = $this->summarizeTrackedItems($newSale);
        $productIds = array_unique(array_merge(array_keys($oldItems), array_keys($newItems)));
        $costsByProduct = [];

        foreach ($productIds as $productId) {
            $oldQuantity = $oldItems[$productId]['quantity'] ?? 0;
            $newQuantity = $newItems[$productId]['quantity'] ?? 0;
            $oldCostAmount = $oldItems[$productId]['cost_amount'] ?? 0;
            $deltaQuantity = round($newQuantity - $oldQuantity, 2);
            $product = $newItems[$productId]['product'] ?? $oldItems[$productId]['product'];
            $newCostAmount = $oldCostAmount;

            if (abs($deltaQuantity) >= 0.00001) {
                if ($deltaQuantity > 0) {
                    $movement = $this->inventoryService->issue(
                        $product,
                        $newSale->date->toDateString(),
                        $deltaQuantity,
                        'sale_correction',
                        $newSale,
                        null,
                        'Selisih koreksi penjualan'
                    );

                    $newCostAmount += (float) $movement->total_cost;
                } else {
                    $reverseQuantity = abs($deltaQuantity);
                    $reverseUnitCost = $oldQuantity > 0
                        ? round($oldCostAmount / $oldQuantity, 2)
                        : 0;

                    $this->inventoryService->receive(
                        $product,
                        $newSale->date->toDateString(),
                        $reverseQuantity,
                        $reverseUnitCost,
                        'sale_correction',
                        $newSale,
                        null,
                        'Selisih koreksi penjualan'
                    );

                    $newCostAmount -= round($reverseQuantity * $reverseUnitCost, 2);
                }
            }

            $costsByProduct[$productId] = [
                'quantity' => $newQuantity,
                'cost_amount' => round(max(0, $newCostAmount), 2),
            ];
        }

        $this->assignTrackedItemCosts($newSale, $costsByProduct);
        $newSale->load('items.product', 'cashBankAccount.account');
    }

    protected function assignTrackedItemCosts(Sale $sale, array $costsByProduct): void
    {
        $groupedItems = $sale->items
            ->filter(fn ($item) => $item->is_stock_tracked)
            ->groupBy('product_id');

        foreach ($groupedItems as $productId => $items) {
            $totalQuantity = (float) $items->sum(fn ($item) => (float) $item->quantity);
            $totalCostAmount = (float) ($costsByProduct[$productId]['cost_amount'] ?? 0);
            $allocatedCost = 0;

            foreach ($items->values() as $index => $item) {
                $isLastItem = $index === $items->count() - 1;
                $costAmount = $isLastItem
                    ? round($totalCostAmount - $allocatedCost, 2)
                    : round(((float) $item->quantity / max($totalQuantity, 0.00001)) * $totalCostAmount, 2);

                $allocatedCost += $costAmount;

                $item->update([
                    'unit_cost' => (float) $item->quantity > 0 ? round($costAmount / (float) $item->quantity, 2) : 0,
                    'cost_amount' => $costAmount,
                ]);
            }
        }
    }

    protected function summarizeTrackedItems(Sale $sale): array
    {
        $summary = [];

        foreach ($sale->items as $item) {
            if (! $item->is_stock_tracked || ! $item->product) {
                continue;
            }

            $productId = $item->product->id;

            if (! isset($summary[$productId])) {
                $summary[$productId] = [
                    'product' => $item->product,
                    'quantity' => 0,
                    'cost_amount' => 0,
                ];
            }

            $summary[$productId]['quantity'] += (float) $item->quantity;
            $summary[$productId]['cost_amount'] += (float) $item->cost_amount;
        }

        return $summary;
    }

    protected function updateReceivablePaymentStatus(Receivable $receivable): void
    {
        $paidAmount = (float) $receivable->paid_amount;
        $totalAmount = (float) $receivable->amount;

        $status = match (true) {
            $paidAmount <= 0 => PaymentStatus::Unpaid,
            bccomp((string) $paidAmount, (string) $totalAmount, 2) >= 0 => PaymentStatus::Paid,
            default => PaymentStatus::Partial,
        };

        $receivable->update(['payment_status' => $status]);
    }

    protected function validatePaymentData(Sale $sale): void
    {
        if ($sale->items->isEmpty()) {
            throw new \Exception('Penjualan harus memiliki minimal satu item.');
        }

        if ($sale->payment_type === 'cash' && ! $sale->cash_bank_account_id) {
            throw new \Exception('Penjualan tunai harus menggunakan akun kas/bank.');
        }

        if ($sale->payment_type === 'credit') {
            if (! $sale->partner_id) {
                throw new \Exception('Penjualan kredit harus memiliki pelanggan.');
            }

            if (! $sale->due_date) {
                throw new \Exception('Penjualan kredit harus memiliki tanggal jatuh tempo.');
            }
        }
    }

    protected function calculateTotals(array $items): array
    {
        $subtotal = 0;
        $discount = 0;
        $tax = 0;
        $total = 0;

        foreach ($items as $item) {
            $lineDiscount = (float) ($item['discount_amount'] ?? 0);
            $lineTax = (float) ($item['tax_amount'] ?? 0);
            $lineTotal = $item['line_total'] ?? (((float) $item['quantity'] * (float) $item['unit_price']) - $lineDiscount + $lineTax);

            $subtotal += (float) $item['quantity'] * (float) $item['unit_price'];
            $discount += $lineDiscount;
            $tax += $lineTax;
            $total += (float) $lineTotal;
        }

        return [
            'subtotal' => round($subtotal, 2),
            'discount_amount' => round($discount, 2),
            'tax_amount' => round($tax, 2),
            'total_amount' => round($total, 2),
        ];
    }

    protected function normalizeLine(Product $product, array $item): array
    {
        $quantity = (float) $item['quantity'];
        $unitPrice = (float) ($item['unit_price'] ?? $product->sales_price);
        $discount = (float) ($item['discount_amount'] ?? 0);
        $tax = (float) ($item['tax_amount'] ?? 0);
        $lineTotal = (float) ($item['line_total'] ?? (($quantity * $unitPrice) - $discount + $tax));

        return [
            'description' => $item['description'] ?? $product->name,
            'quantity' => $quantity,
            'unit' => $item['unit'] ?? $product->unit,
            'unit_price' => $unitPrice,
            'discount_amount' => $discount,
            'tax_amount' => $tax,
            'line_total' => $lineTotal,
        ];
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

    protected function getReceivableAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Asset)
            ->where('subtype', 'receivable')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }

    protected function getDefaultRevenueAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Revenue)
            ->where('subtype', 'operating_revenue')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }

    protected function getDefaultInventoryAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Asset)
            ->where('subtype', 'inventory')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }

    protected function getDefaultCogsAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Expense)
            ->where('subtype', 'cogs')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }
}
