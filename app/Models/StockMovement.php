<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockMovement extends Model
{
    use HasFactory, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'product_id',
        'date',
        'source_type',
        'source_id',
        'source_item_type',
        'source_item_id',
        'movement_type',
        'quantity_in',
        'quantity_out',
        'unit_cost',
        'total_cost',
        'balance_quantity',
        'balance_average_cost',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'quantity_in' => 'decimal:2',
        'quantity_out' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'balance_quantity' => 'decimal:2',
        'balance_average_cost' => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function sourceItem(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'source_item_type', 'source_item_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
