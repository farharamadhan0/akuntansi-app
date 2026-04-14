<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            $model->logAudit('created', null, $model->getAttributes());
        });

        static::updated(function ($model) {
            $dirty = $model->getDirty();
            if (!empty($dirty)) {
                $original = array_intersect_key($model->getOriginal(), $dirty);
                $model->logAudit('updated', $original, $dirty);
            }
        });

        static::deleted(function ($model) {
            $model->logAudit('deleted', $model->getOriginal(), null);
        });
    }

    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }

    public function logAudit(string $action, ?array $oldValues, ?array $newValues): void
    {
        if (!auth()->check()) {
            return;
        }

        AuditLog::create([
            'company_id' => $this->company_id ?? auth()->user()->current_company_id,
            'user_id' => auth()->id(),
            'auditable_type' => static::class,
            'auditable_id' => $this->id,
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
