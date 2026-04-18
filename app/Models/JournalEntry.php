<?php

namespace App\Models;

use App\Enums\TransactionStatus;
use App\Traits\Auditable;
use App\Traits\BelongsToCompany;
use App\Traits\PreventsPostedDeletion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Builder;

class JournalEntry extends Model
{
    use HasFactory, BelongsToCompany, Auditable, PreventsPostedDeletion;

    protected $fillable = [
        'company_id',
        'entry_number',
        'date',
        'description',
        'source_type',
        'source_id',
        'is_manual',
        'is_adjusting',
        'is_closing',
        'status',
        'voided_at',
        'void_reason',
        'created_by',
    ];

    protected $casts = [
        'status' => TransactionStatus::class,
        'date' => 'date',
        'is_manual' => 'boolean',
        'is_adjusting' => 'boolean',
        'is_closing' => 'boolean',
        'voided_at' => 'datetime',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Posted);
    }

    public function scopeManual(Builder $query): Builder
    {
        return $query->where('is_manual', true);
    }

    public function getTotalDebitAttribute(): float
    {
        return $this->lines->sum('debit');
    }

    public function getTotalCreditAttribute(): float
    {
        return $this->lines->sum('credit');
    }

    public function isBalanced(): bool
    {
        return bccomp($this->total_debit, $this->total_credit, 2) === 0;
    }
}
