<?php

namespace App\Models;

use App\Enums\CashBankType;
use App\Traits\Auditable;
use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class CashBankAccount extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, Auditable;

    protected $fillable = [
        'company_id',
        'account_id',
        'name',
        'type',
        'bank_name',
        'account_number',
        'opening_balance',
        'opening_balance_date',
        'is_active',
    ];

    protected $casts = [
        'type' => CashBankType::class,
        'opening_balance' => 'decimal:2',
        'opening_balance_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
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

    public function scopeCash(Builder $query): Builder
    {
        return $query->where('type', CashBankType::Cash);
    }

    public function scopeBank(Builder $query): Builder
    {
        return $query->where('type', CashBankType::Bank);
    }
}
