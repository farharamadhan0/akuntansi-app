<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, Auditable;

    protected $fillable = [
        'company_id',
        'product_code',
        'sku',
        'name',
        'product_type',
        'unit',
        'description',
        'is_stock_tracked',
        'sales_price',
        'purchase_price',
        'current_stock',
        'average_cost',
        'inventory_account_id',
        'revenue_account_id',
        'expense_account_id',
        'cogs_account_id',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_stock_tracked' => 'boolean',
        'sales_price' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'current_stock' => 'decimal:2',
        'average_cost' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function inventoryAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'inventory_account_id');
    }

    public function revenueAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'revenue_account_id');
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'expense_account_id');
    }

    public function cogsAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'cogs_account_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function stockAdjustmentItems(): HasMany
    {
        return $this->hasMany(StockAdjustmentItem::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeGoods(Builder $query): Builder
    {
        return $query->where('product_type', 'goods');
    }

    public function scopeServices(Builder $query): Builder
    {
        return $query->where('product_type', 'service');
    }
}
