<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'current_company_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function currentCompany(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'current_company_id');
    }

    public function companies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class, 'company_users')
            ->withPivot(['role_id', 'is_active'])
            ->withTimestamps();
    }

    public function companyUsers(): HasMany
    {
        return $this->hasMany(CompanyUser::class);
    }

    public function switchCompany(Company $company): void
    {
        if ($this->companies()->where('companies.id', $company->id)->exists()) {
            $this->update(['current_company_id' => $company->id]);
        }
    }

    public function isOwnerOf(?int $companyId = null): bool
    {
        $companyId ??= $this->current_company_id;
        if (!$companyId) {
            return false;
        }

        return $this->companyUsers()
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->whereHas('role', fn ($q) => $q->where('name', 'Owner'))
            ->exists();
    }

    public function hasPermission(string $permission): bool
    {
        $companyUser = $this->companyUsers()
            ->where('company_id', $this->current_company_id)
            ->with('role')
            ->first();

        return $companyUser?->role?->hasPermission($permission) ?? false;
    }
}
