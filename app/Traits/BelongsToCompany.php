<?php

namespace App\Traits;

use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope('company', function (Builder $builder) {
            if ($companyId = static::getCurrentCompanyId()) {
                $builder->where($builder->getModel()->getTable() . '.company_id', $companyId);
            }
        });

        static::creating(function ($model) {
            if (!$model->company_id && $companyId = static::getCurrentCompanyId()) {
                $model->company_id = $companyId;
            }
        });
    }

    protected static function getCurrentCompanyId(): ?int
    {
        return auth()->user()?->current_company_id;
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function scopeForCompany(Builder $query, int $companyId): Builder
    {
        return $query->withoutGlobalScope('company')->where('company_id', $companyId);
    }
}
