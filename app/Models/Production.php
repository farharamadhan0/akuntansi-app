<?php

namespace App\Models;

use App\Enums\TransactionStatus;
use App\Traits\Auditable;
use App\Traits\BelongsToCompany;
use App\Traits\HasJournalEntries;
use App\Traits\PreventsPostedDeletion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Production extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, HasJournalEntries, Auditable, PreventsPostedDeletion;

    protected $fillable = [
        'company_id',
        'production_number',
        'date',
        'product_id',
        'recipe_id',
        'recipe_yield_quantity',
        'actual_yield_quantity',
        'unit',
        'total_input_cost',
        'unit_cost',
        'inventory_account_id',
        'notes',
        'status',
        'posted_at',
        'voided_at',
        'void_reason',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'recipe_yield_quantity' => 'decimal:2',
        'actual_yield_quantity' => 'decimal:2',
        'total_input_cost' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'status' => TransactionStatus::class,
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class)->withTrashed();
    }

    public function inputs(): HasMany
    {
        return $this->hasMany(ProductionInput::class);
    }

    public function inventoryAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'inventory_account_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
