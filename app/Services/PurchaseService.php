<?php

namespace App\Services;

use App\Enums\AccountType;
use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\Payable;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Support\Facades\DB;

class PurchaseService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator,
        protected InventoryService $inventoryService
    ) {}

    public function create(array $data): Purchase
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;
            $totals = $this->calculateTotals($data['items'] ?? []);

            $purchase = Purchase::create([
                'company_id' => $companyId,
                'purchase_number' => $this->numberGenerator->generatePurchaseNumber($companyId),
                'supplier_id' => $data['supplier_id'] ?? null,
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

                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $product->id,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit' => $line['unit'],
                    'unit_price' => $line['unit_price'],
                    'discount_amount' => $line['discount_amount'],
                    'tax_amount' => $line['tax_amount'],
                    'line_total' => $line['line_total'],
                    'is_stock_tracked' => $product->is_stock_tracked,
                    'inventory_account_id' => $itemData['inventory_account_id'] ?? $product->inventory_account_id,
                    'expense_account_id' => $itemData['expense_account_id'] ?? $product->expense_account_id,
                ]);
            }

            return $purchase->load('items.product');
        });
    }

    public function post(Purchase $purchase): Purchase
    {
        if ($purchase->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya pembelian draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($purchase) {
            $purchase->load('items.product', 'cashBankAccount.account', 'supplier');
            $this->validatePaymentData($purchase);

            $journalLines = [];

            foreach ($purchase->items as $item) {
                $amount = (float) $item->line_total;

                if ($item->is_stock_tracked) {
                    $unitCost = round($amount / (float) $item->quantity, 2);
                    $this->inventoryService->receive(
                        $item->product,
                        $purchase->date->toDateString(),
                        (float) $item->quantity,
                        $unitCost,
                        'purchase',
                        $purchase,
                        $item,
                        'Pembelian barang'
                    );

                    $accountId = $item->inventory_account_id ?: $item->product->inventory_account_id;
                } else {
                    $accountId = $item->expense_account_id ?: $item->product->expense_account_id ?: $this->getDefaultExpenseAccountId($purchase->company_id);
                }

                $this->pushLine($journalLines, $accountId, $amount, 0);
            }

            $creditAccountId = $purchase->payment_type === 'cash'
                ? $purchase->cashBankAccount->account_id
                : $this->getPayableAccountId($purchase->company_id);

            $this->pushLine($journalLines, $creditAccountId, 0, (float) $purchase->total_amount);

            $this->journalService->createEntry(
                $purchase->company_id,
                $purchase->date->toDateString(),
                'Pembelian: ' . $purchase->purchase_number,
                array_values($journalLines),
                $purchase
            );

            if ($purchase->payment_type === 'credit') {
                $payable = $this->createLinkedPayable($purchase);
                $purchase->update(['payable_id' => $payable->id]);
            }

            $purchase->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            return $purchase->fresh()->load('items.product', 'payable');
        });
    }

    public function void(Purchase $purchase, string $reason): Purchase
    {
        if ($purchase->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya pembelian yang sudah diposting yang dapat dibatalkan.');
        }

        return DB::transaction(function () use ($purchase, $reason) {
            $purchase->load('payable');

            if ($purchase->payable && (float) $purchase->payable->paid_amount > 0) {
                throw new \Exception('Pembelian kredit yang sudah dibayar tidak dapat dibatalkan.');
            }

            $this->inventoryService->reverseSourceMovements($purchase);

            $journalEntry = $purchase->journalEntries()->where('status', TransactionStatus::Posted)->first();
            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, $reason);
            }

            if ($purchase->payable) {
                $purchase->payable->update([
                    'status' => TransactionStatus::Voided,
                    'voided_at' => now(),
                    'void_reason' => $reason,
                ]);
            }

            $purchase->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $purchase->fresh();
        });
    }

    protected function createLinkedPayable(Purchase $purchase): Payable
    {
        return Payable::create([
            'company_id' => $purchase->company_id,
            'payable_number' => $this->numberGenerator->generatePayableNumber($purchase->company_id),
            'supplier_id' => $purchase->supplier_id,
            'date' => $purchase->date,
            'due_date' => $purchase->due_date,
            'amount' => $purchase->total_amount,
            'paid_amount' => 0,
            'description' => 'Dari pembelian ' . $purchase->purchase_number,
            'status' => TransactionStatus::Posted,
            'payment_status' => PaymentStatus::Unpaid,
            'reference' => $purchase->reference,
            'created_by' => auth()->id(),
            'posted_at' => now(),
        ]);
    }

    protected function validatePaymentData(Purchase $purchase): void
    {
        if ($purchase->items->isEmpty()) {
            throw new \Exception('Pembelian harus memiliki minimal satu item.');
        }

        if ($purchase->payment_type === 'cash' && ! $purchase->cash_bank_account_id) {
            throw new \Exception('Pembelian tunai harus menggunakan akun kas/bank.');
        }

        if ($purchase->payment_type === 'credit') {
            if (! $purchase->supplier_id) {
                throw new \Exception('Pembelian kredit harus memiliki supplier.');
            }

            if (! $purchase->due_date) {
                throw new \Exception('Pembelian kredit harus memiliki tanggal jatuh tempo.');
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
        $unitPrice = (float) ($item['unit_price'] ?? $product->purchase_price);
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

    protected function getPayableAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Liability)
            ->where('subtype', 'payable')
            ->firstOrFail()
            ->id;
    }

    protected function getDefaultExpenseAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Expense)
            ->where('subtype', 'operating_expense')
            ->firstOrFail()
            ->id;
    }
}
