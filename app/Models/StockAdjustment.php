<?php

namespace App\Models;

use App\Enums\TransactionStatus;
use App\Traits\Auditable;
use App\Traits\BelongsToCompany;
use App\Traits\HasJournalEntries;
use App\Traits\PreventsPostedDeletion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockAdjustment extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, HasJournalEntries, Auditable, PreventsPostedDeletion;

    protected $fillable = [
        'company_id',
        'adjustment_number',
        'date',
        'notes',
        'status',
        'posted_at',
        'voided_at',
        'void_reason',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'status' => TransactionStatus::class,
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(StockAdjustmentItem::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Draft);
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Posted);
    }
}
