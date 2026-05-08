<?php

namespace App\Models;

use App\Enums\AccountType;
use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Account extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'parent_id',
        'code',
        'name',
        'type',
        'subtype',
        'description',
        'is_active',
        'is_system',
        'normal_balance',
    ];

    protected $casts = [
        'type' => AccountType::class,
        'is_active' => 'boolean',
        'is_system' => 'boolean',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id');
    }

    public function cashBankAccount(): HasOne
    {
        return $this->hasOne(CashBankAccount::class);
    }

    public function journalLines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }

    public function inventoryProducts(): HasMany
    {
        return $this->hasMany(Product::class, 'inventory_account_id');
    }

    public function revenueProducts(): HasMany
    {
        return $this->hasMany(Product::class, 'revenue_account_id');
    }

    public function expenseProducts(): HasMany
    {
        return $this->hasMany(Product::class, 'expense_account_id');
    }

    public function cogsProducts(): HasMany
    {
        return $this->hasMany(Product::class, 'cogs_account_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOfType(Builder $query, AccountType $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeWithSubtype(Builder $query, string $subtype): Builder
    {
        return $query->where('subtype', $subtype);
    }
}
