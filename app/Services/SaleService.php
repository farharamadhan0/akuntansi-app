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
            $sale->load('items.product', 'cashBankAccount.account', 'customer');
            $this->validatePaymentData($sale);

            $journalLines = [];
            $debitAccountId = $sale->payment_type === 'cash'
                ? $sale->cashBankAccount->account_id
                : $this->getReceivableAccountId($sale->company_id);

            $this->pushLine($journalLines, $debitAccountId, (float) $sale->total_amount, 0);

            foreach ($sale->items as $item) {
                $revenueAccountId = $item->revenue_account_id ?: $item->product->revenue_account_id ?: $this->getDefaultRevenueAccountId($sale->company_id);
                $this->pushLine($journalLines, $revenueAccountId, 0, (float) $item->line_total);

                if ($item->is_stock_tracked) {
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

                    $cogsAccountId = $item->cogs_account_id ?: $item->product->cogs_account_id ?: $this->getDefaultCogsAccountId($sale->company_id);
                    $inventoryAccountId = $item->inventory_account_id ?: $item->product->inventory_account_id ?: $this->getDefaultInventoryAccountId($sale->company_id);

                    $this->pushLine($journalLines, $cogsAccountId, (float) $movement->total_cost, 0);
                    $this->pushLine($journalLines, $inventoryAccountId, 0, (float) $movement->total_cost);
                }
            }

            $this->journalService->createEntry(
                $sale->company_id,
                $sale->date->toDateString(),
                'Penjualan: ' . $sale->sale_number,
                array_values($journalLines),
                $sale
            );

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

    protected function createLinkedReceivable(Sale $sale): Receivable
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
            'reference' => $sale->reference,
            'created_by' => auth()->id(),
            'posted_at' => now(),
        ]);
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
