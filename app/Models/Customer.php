<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Customer extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, Auditable;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'email',
        'phone',
        'address',
        'tax_id',
        'credit_limit',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function receivables(): HasMany
    {
        return $this->hasMany(Receivable::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function getOutstandingReceivablesAttribute(): float
    {
        return $this->receivables()
            ->where('status', 'posted')
            ->where('payment_status', '!=', 'paid')
            ->sum(\DB::raw('amount - paid_amount'));
    }
}
