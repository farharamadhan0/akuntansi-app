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
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class PurchaseService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator,
        protected InventoryService $inventoryService,
        protected ExpenseService $expenseService
    ) {}

    public function create(array $data): Purchase
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;
            $totals = $this->calculateTotals($data['items'] ?? []);

            $purchase = Purchase::create([
                'company_id' => $companyId,
                'purchase_number' => $this->numberGenerator->generatePurchaseNumber($companyId),
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

                if ($product->product_type === 'menu_item') {
                    throw new \Exception('Produk tipe menu tidak dapat dibeli langsung.');
                }

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
            $purchase->load('items.product', 'cashBankAccount.account', 'partner');
            $this->validatePaymentData($purchase);

            $this->applyPostedStock($purchase);
            $this->createPurchaseJournalEntry($purchase);

            if ($purchase->payment_type === 'credit') {
                $payable = $this->createLinkedPayable($purchase);
                $purchase->update(['payable_id' => $payable->id]);
            }

            if ($purchase->payment_type === 'cash') {
                $this->createLinkedExpense($purchase);
            }

            $purchase->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            return $purchase->fresh()->load('items.product', 'payable');
        });
    }

    public function correct(Purchase $oldPurchase, array $newData): Purchase
    {
        if ($oldPurchase->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya pembelian yang sudah diposting yang dapat dikoreksi.');
        }

        return DB::transaction(function () use ($oldPurchase, $newData) {
            $oldPurchase->load('items.product', 'payable.paymentAllocations');

            $existingAllocations = $oldPurchase->payable?->paymentAllocations()->get() ?? collect();
            $totalPaid = (float) $existingAllocations->sum('amount');

            $newPurchase = $this->create(array_merge($newData, [
                'company_id' => $oldPurchase->company_id,
                'corrects_id' => $oldPurchase->id,
            ]));

            $newPurchase->load('items.product', 'cashBankAccount.account', 'partner');
            $this->validatePaymentData($newPurchase);

            if ($totalPaid > 0 && $newPurchase->payment_type !== 'credit') {
                throw new \Exception('Pembelian koreksi dengan pembayaran hutang yang sudah ada harus tetap menggunakan pembayaran kredit.');
            }

            if ($totalPaid > 0 && bccomp((string) $newPurchase->total_amount, (string) $totalPaid, 2) < 0) {
                throw new \Exception('Nilai koreksi pembelian tidak boleh lebih kecil dari total pembayaran yang sudah ada.');
            }

            $this->ensureStockSufficientForCorrection($oldPurchase, $newPurchase);

            $journalEntry = $oldPurchase->journalEntries()
                ->where('status', TransactionStatus::Posted)
                ->first();

            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, 'Koreksi pembelian: ' . $oldPurchase->purchase_number);
            }

            $this->applyCorrectionStock($oldPurchase, $newPurchase);
            $this->createPurchaseJournalEntry($newPurchase);

            $this->voidLinkedExpense($oldPurchase, 'Koreksi pembelian: ' . $oldPurchase->purchase_number);

            if ($newPurchase->payment_type === 'cash') {
                $this->createLinkedExpense($newPurchase);
            }

            $newPayable = null;

            if ($newPurchase->payment_type === 'credit') {
                $newPayable = $this->createLinkedPayable($newPurchase, $oldPurchase->payable?->id);
                $newPurchase->update(['payable_id' => $newPayable->id]);
            }

            $newPurchase->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            if ($oldPurchase->payable) {
                if ($newPayable) {
                    foreach ($existingAllocations as $allocation) {
                        $allocation->update([
                            'allocatable_id' => $newPayable->id,
                        ]);
                    }

                    if ($totalPaid > 0) {
                        $newPayable->update(['paid_amount' => $totalPaid]);
                        $this->updatePayablePaymentStatus($newPayable->fresh());
                    }

                    $oldPurchase->payable->update([
                        'paid_amount' => 0,
                        'status' => TransactionStatus::Corrected,
                        'payment_status' => PaymentStatus::Unpaid,
                        'corrected_at' => now(),
                        'corrected_by_id' => $newPayable->id,
                    ]);
                } else {
                    $oldPurchase->payable->update([
                        'status' => TransactionStatus::Voided,
                        'voided_at' => now(),
                        'void_reason' => 'Dikoreksi oleh pembelian ' . $newPurchase->purchase_number,
                    ]);
                }
            }

            $oldPurchase->update([
                'status' => TransactionStatus::Corrected,
                'corrected_at' => now(),
                'corrected_by_id' => $newPurchase->id,
            ]);

            return $newPurchase->fresh()->load('items.product', 'payable');
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

            $this->voidLinkedExpense($purchase, $reason);

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

    protected function createLinkedExpense(Purchase $purchase): Transaction
    {
        return $this->expenseService->createPosted([
            'company_id'           => $purchase->company_id,
            'date'                 => $purchase->date->toDateString(),
            'amount'               => $purchase->total_amount,
            'description'          => 'Pembelian: ' . $purchase->purchase_number,
            'cash_bank_account_id' => $purchase->cash_bank_account_id,
            'partner_id'           => $purchase->partner_id,
            'reference'            => $purchase->purchase_number,
            'source_type'          => Purchase::class,
            'source_id'            => $purchase->id,
        ]);
    }

    protected function voidLinkedExpense(Purchase $purchase, string $reason): void
    {
        $expense = Transaction::where('source_type', Purchase::class)
            ->where('source_id', $purchase->id)
            ->where('status', TransactionStatus::Posted)
            ->first();

        if ($expense) {
            $expense->update([
                'status'      => TransactionStatus::Voided,
                'voided_at'   => now(),
                'void_reason' => $reason,
            ]);
        }
    }

    protected function createLinkedPayable(Purchase $purchase, ?int $correctsId = null): Payable
    {
        return Payable::create([
            'company_id' => $purchase->company_id,
            'payable_number' => $this->numberGenerator->generatePayableNumber($purchase->company_id),
            'partner_id' => $purchase->partner_id,
            'date' => $purchase->date,
            'due_date' => $purchase->due_date,
            'amount' => $purchase->total_amount,
            'paid_amount' => 0,
            'description' => 'Dari pembelian ' . $purchase->purchase_number,
            'status' => TransactionStatus::Posted,
            'payment_status' => PaymentStatus::Unpaid,
            'corrects_id' => $correctsId,
            'reference' => $purchase->reference,
            'created_by' => auth()->id(),
            'posted_at' => now(),
        ]);
    }

    protected function applyPostedStock(Purchase $purchase): void
    {
        foreach ($purchase->items as $item) {
            if (! $item->is_stock_tracked) {
                continue;
            }

            $unitCost = round((float) $item->line_total / (float) $item->quantity, 2);

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
        }
    }

    protected function createPurchaseJournalEntry(Purchase $purchase): void
    {
        $this->journalService->createEntry(
            $purchase->company_id,
            $purchase->date->toDateString(),
            'Pembelian: ' . $purchase->purchase_number,
            $this->buildJournalLines($purchase),
            $purchase
        );
    }

    protected function buildJournalLines(Purchase $purchase): array
    {
        $journalLines = [];

        foreach ($purchase->items as $item) {
            $amount = (float) $item->line_total;

            if ($item->is_stock_tracked) {
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

        return array_values($journalLines);
    }

    protected function ensureStockSufficientForCorrection(Purchase $oldPurchase, Purchase $newPurchase): void
    {
        $oldItems = $this->summarizeTrackedItems($oldPurchase);
        $newItems = $this->summarizeTrackedItems($newPurchase);
        $productIds = array_unique(array_merge(array_keys($oldItems), array_keys($newItems)));

        foreach ($productIds as $productId) {
            $oldQuantity = $oldItems[$productId]['quantity'] ?? 0;
            $newQuantity = $newItems[$productId]['quantity'] ?? 0;
            $deltaQuantity = round($newQuantity - $oldQuantity, 2);

            if ($deltaQuantity >= 0) {
                continue;
            }

            $product = $oldItems[$productId]['product'] ?? $newItems[$productId]['product'];
            $requiredReverse = abs($deltaQuantity);
            $availableStock = (float) $product->current_stock;

            if ($requiredReverse - $availableStock > 0.00001) {
                throw new \Exception("Stok produk {$product->name} tidak cukup untuk reverse selisih koreksi. Tersedia {$availableStock}, membutuhkan {$requiredReverse}.");
            }
        }
    }

    protected function applyCorrectionStock(Purchase $oldPurchase, Purchase $newPurchase): void
    {
        $oldItems = $this->summarizeTrackedItems($oldPurchase);
        $newItems = $this->summarizeTrackedItems($newPurchase);
        $productIds = array_unique(array_merge(array_keys($oldItems), array_keys($newItems)));

        foreach ($productIds as $productId) {
            $oldQuantity = $oldItems[$productId]['quantity'] ?? 0;
            $newQuantity = $newItems[$productId]['quantity'] ?? 0;
            $deltaQuantity = round($newQuantity - $oldQuantity, 2);

            if (abs($deltaQuantity) < 0.00001) {
                continue;
            }

            $product = $newItems[$productId]['product'] ?? $oldItems[$productId]['product'];

            if ($deltaQuantity > 0) {
                $unitCost = $newItems[$productId]['unit_cost'] ?? 0;

                $this->inventoryService->receive(
                    $product,
                    $newPurchase->date->toDateString(),
                    $deltaQuantity,
                    $unitCost,
                    'purchase_correction',
                    $newPurchase,
                    null,
                    'Selisih koreksi pembelian'
                );

                continue;
            }

            $this->inventoryService->issue(
                $product,
                $newPurchase->date->toDateString(),
                abs($deltaQuantity),
                'purchase_correction',
                $newPurchase,
                null,
                'Selisih koreksi pembelian'
            );
        }
    }

    protected function summarizeTrackedItems(Purchase $purchase): array
    {
        $summary = [];

        foreach ($purchase->items as $item) {
            if (! $item->is_stock_tracked || ! $item->product) {
                continue;
            }

            $productId = $item->product->id;

            if (! isset($summary[$productId])) {
                $summary[$productId] = [
                    'product' => $item->product,
                    'quantity' => 0,
                    'amount' => 0,
                ];
            }

            $summary[$productId]['quantity'] += (float) $item->quantity;
            $summary[$productId]['amount'] += (float) $item->line_total;
        }

        foreach ($summary as $productId => $itemSummary) {
            $summary[$productId]['unit_cost'] = $itemSummary['quantity'] > 0
                ? round($itemSummary['amount'] / $itemSummary['quantity'], 2)
                : 0;
        }

        return $summary;
    }

    protected function updatePayablePaymentStatus(Payable $payable): void
    {
        $paidAmount = (float) $payable->paid_amount;
        $totalAmount = (float) $payable->amount;

        $status = match (true) {
            $paidAmount <= 0 => PaymentStatus::Unpaid,
            bccomp((string) $paidAmount, (string) $totalAmount, 2) >= 0 => PaymentStatus::Paid,
            default => PaymentStatus::Partial,
        };

        $payable->update(['payment_status' => $status]);
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
            if (! $purchase->partner_id) {
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
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }

    protected function getDefaultExpenseAccountId(int $companyId): int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Expense)
            ->where('subtype', 'operating_expense')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }
}
