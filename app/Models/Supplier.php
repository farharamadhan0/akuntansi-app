<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Supplier extends Model
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
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function payables(): HasMany
    {
        return $this->hasMany(Payable::class);
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

    public function getOutstandingPayablesAttribute(): float
    {
        return $this->payables()
            ->where('status', 'posted')
            ->where('payment_status', '!=', 'paid')
            ->sum(\DB::raw('amount - paid_amount'));
    }
}
