<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Partner extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, Auditable;

    public const TYPE_CUSTOMER = 'customer';
    public const TYPE_SUPPLIER = 'supplier';

    public const TYPES = [
        self::TYPE_CUSTOMER,
        self::TYPE_SUPPLIER,
    ];

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

    public function typeAssignments(): HasMany
    {
        return $this->hasMany(PartnerTypeAssignment::class);
    }

    public function receivables(): HasMany
    {
        return $this->hasMany(Receivable::class);
    }

    public function payables(): HasMany
    {
        return $this->hasMany(Payable::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
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

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->whereHas('typeAssignments', fn ($q) => $q->where('type', $type));
    }

    public function scopeCustomer(Builder $query): Builder
    {
        return $query->ofType(self::TYPE_CUSTOMER);
    }

    public function scopeSupplier(Builder $query): Builder
    {
        return $query->ofType(self::TYPE_SUPPLIER);
    }

    public function hasType(string $type): bool
    {
        return $this->typeAssignments->contains('type', $type);
    }

    public function getIsCustomerAttribute(): bool
    {
        return $this->hasType(self::TYPE_CUSTOMER);
    }

    public function getIsSupplierAttribute(): bool
    {
        return $this->hasType(self::TYPE_SUPPLIER);
    }

    public function getTypesAttribute(): array
    {
        return $this->typeAssignments->pluck('type')->all();
    }

    public function assignType(string $type): void
    {
        $this->typeAssignments()->firstOrCreate(['type' => $type]);
    }

    public function unassignType(string $type): void
    {
        $this->typeAssignments()->where('type', $type)->delete();
    }

    /**
     * Sync the partner type assignments to exactly the given list.
     * Empty list is rejected; partners must always have at least one type.
     */
    public function syncTypes(array $types): void
    {
        $types = array_values(array_unique(array_intersect($types, self::TYPES)));
        if (empty($types)) {
            throw new \InvalidArgumentException('Partner harus memiliki minimal satu tipe (customer/supplier).');
        }

        $this->typeAssignments()->whereNotIn('type', $types)->delete();
        foreach ($types as $type) {
            $this->assignType($type);
        }
    }

    public function getOutstandingReceivablesAttribute(): float
    {
        return (float) $this->receivables()
            ->where('status', 'posted')
            ->where('payment_status', '!=', 'paid')
            ->sum(DB::raw('amount - paid_amount'));
    }

    public function getOutstandingPayablesAttribute(): float
    {
        return (float) $this->payables()
            ->where('status', 'posted')
            ->where('payment_status', '!=', 'paid')
            ->sum(DB::raw('amount - paid_amount'));
    }
}
