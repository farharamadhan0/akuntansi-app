<?php

namespace App\Services;

use App\Enums\AccountType;
use App\Models\Account;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class ProductService
{
    public function __construct(
        protected NumberGeneratorService $numberGenerator
    ) {}

    public function create(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;
            $productType = $data['product_type'];
            $isStockTracked = (bool) ($data['is_stock_tracked'] ?? $productType === 'goods');

            return Product::create([
                'company_id' => $companyId,
                'product_code' => $data['product_code'] ?? $this->numberGenerator->generateProductNumber($companyId),
                'sku' => $data['sku'] ?? null,
                'name' => $data['name'],
                'product_type' => $productType,
                'unit' => $data['unit'],
                'description' => $data['description'] ?? null,
                'is_stock_tracked' => $productType === 'service' ? false : $isStockTracked,
                'sales_price' => $data['sales_price'] ?? 0,
                'purchase_price' => $data['purchase_price'] ?? 0,
                'current_stock' => 0,
                'average_cost' => 0,
                'inventory_account_id' => $data['inventory_account_id'] ?? $this->getDefaultInventoryAccountId($companyId),
                'revenue_account_id' => $data['revenue_account_id'] ?? $this->getDefaultRevenueAccountId($companyId),
                'expense_account_id' => $data['expense_account_id'] ?? null,
                'cogs_account_id' => $data['cogs_account_id'] ?? $this->getDefaultCogsAccountId($companyId),
                'is_active' => $data['is_active'] ?? true,
                'created_by' => auth()->id(),
            ]);
        });
    }

    public function update(Product $product, array $data): Product
    {
        $productType = $data['product_type'] ?? $product->product_type;

        $product->update([
            'sku' => $data['sku'] ?? $product->sku,
            'name' => $data['name'] ?? $product->name,
            'product_type' => $productType,
            'unit' => $data['unit'] ?? $product->unit,
            'description' => $data['description'] ?? $product->description,
            'is_stock_tracked' => $productType === 'service'
                ? false
                : ($data['is_stock_tracked'] ?? $product->is_stock_tracked),
            'sales_price' => $data['sales_price'] ?? $product->sales_price,
            'purchase_price' => $data['purchase_price'] ?? $product->purchase_price,
            'inventory_account_id' => $data['inventory_account_id'] ?? $product->inventory_account_id,
            'revenue_account_id' => $data['revenue_account_id'] ?? $product->revenue_account_id,
            'expense_account_id' => $data['expense_account_id'] ?? $product->expense_account_id,
            'cogs_account_id' => $data['cogs_account_id'] ?? $product->cogs_account_id,
            'is_active' => $data['is_active'] ?? $product->is_active,
        ]);

        return $product->fresh();
    }

    public function toggleActive(Product $product): Product
    {
        $product->update(['is_active' => ! $product->is_active]);

        return $product->fresh();
    }

    protected function getDefaultInventoryAccountId(int $companyId): ?int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Asset)
            ->where('subtype', 'inventory')
            ->where('is_system', true)
            ->value('id');
    }

    protected function getDefaultRevenueAccountId(int $companyId): ?int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Revenue)
            ->where('subtype', 'operating_revenue')
            ->where('is_system', true)
            ->value('id');
    }

    protected function getDefaultExpenseAccountId(int $companyId): ?int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Expense)
            ->where('subtype', 'operating_expense')
            ->where('is_system', true)
            ->value('id');
    }

    protected function getDefaultCogsAccountId(int $companyId): ?int
    {
        return Account::where('company_id', $companyId)
            ->where('type', AccountType::Expense)
            ->where('subtype', 'cogs')
            ->where('is_system', true)
            ->value('id');
    }
}
