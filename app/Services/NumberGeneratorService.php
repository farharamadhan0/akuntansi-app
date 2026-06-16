<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Receivable;
use App\Models\Payable;
use App\Models\Payment;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\Production;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockAdjustment;
use App\Models\Partner;
use Illuminate\Support\Facades\DB;

class NumberGeneratorService
{
    public function generateTransactionNumber(int $companyId, string $type): string
    {
        $prefix = match ($type) {
            'income' => 'IN',
            'expense' => 'EX',
            'transfer' => 'TR',
            default => 'TX',
        };

        return $this->generate($companyId, $prefix, Transaction::class, 'transaction_number');
    }

    public function generateReceivableNumber(int $companyId): string
    {
        return $this->generate($companyId, 'AR', Receivable::class, 'receivable_number');
    }

    public function generatePayableNumber(int $companyId): string
    {
        return $this->generate($companyId, 'AP', Payable::class, 'payable_number');
    }

    public function generatePaymentNumber(int $companyId, string $type): string
    {
        $prefix = $type === 'receivable' ? 'RCV' : 'PAY';

        return $this->generate($companyId, $prefix, Payment::class, 'payment_number');
    }

    public function generateJournalNumber(int $companyId): string
    {
        return $this->generate($companyId, 'JE', JournalEntry::class, 'entry_number');
    }

    public function generateProductNumber(int $companyId): string
    {
        return $this->generate($companyId, 'PRD', Product::class, 'product_code');
    }

    public function generatePartnerCode(int $companyId): string
    {
        return $this->generate($companyId, 'MTR', Partner::class, 'code');
    }

    public function generatePurchaseNumber(int $companyId): string
    {
        return $this->generate($companyId, 'PUR', Purchase::class, 'purchase_number');
    }

    public function generateSaleNumber(int $companyId): string
    {
        return $this->generate($companyId, 'SAL', Sale::class, 'sale_number');
    }

    public function generateStockAdjustmentNumber(int $companyId): string
    {
        return $this->generate($companyId, 'ADJ', StockAdjustment::class, 'adjustment_number');
    }

    public function generateProductionNumber(int $companyId): string
    {
        return $this->generate($companyId, 'PRP', Production::class, 'production_number');
    }

    protected function generate(int $companyId, string $prefix, string $model, string $column): string
    {
        $yearMonth = now()->format('Ym');
        $pattern = "{$prefix}-{$yearMonth}-%";

        $query = $model::withoutGlobalScope('company')
            ->where('company_id', $companyId)
            ->where($column, 'like', $pattern);

        if (method_exists($model, 'bootSoftDeletes')) {
            $query = $query->withTrashed();
        }

        $lastNumber = $query
            ->orderByRaw("CAST(SUBSTR({$column}, LENGTH({$column}) - 3, 4) AS INTEGER) DESC")
            ->value($column);

        if ($lastNumber) {
            $sequence = (int) substr($lastNumber, -4) + 1;
        } else {
            $sequence = 1;
        }

        return sprintf('%s-%s-%04d', $prefix, $yearMonth, $sequence);
    }
}
