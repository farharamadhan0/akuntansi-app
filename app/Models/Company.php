<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'legal_name',
        'tax_id',
        'address',
        'phone',
        'email',
        'currency',
        'timezone',
        'fiscal_year_start',
        'logo_path',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
        'fiscal_year_start' => 'integer',
    ];

    /**
     * Daftar key menu tambahan yang diaktifkan owner.
     * Mengembalikan null jika belum pernah dikonfigurasi (→ hanya menu default yang tampil).
     *
     * @return array<int, string>|null
     */
    public function enabledMenus(): ?array
    {
        $menus = $this->settings['enabled_menus'] ?? null;

        return is_array($menus) ? array_values($menus) : null;
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'company_users')
            ->withPivot(['role_id', 'is_active'])
            ->withTimestamps();
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    public function cashBankAccounts(): HasMany
    {
        return $this->hasMany(CashBankAccount::class);
    }

    public function partners(): HasMany
    {
        return $this->hasMany(Partner::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }
}
