<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnboardingState extends Model
{
    protected $fillable = [
        'user_id',
        'company_id',
        'skipped_at',
        'completed_dismissed_at',
    ];

    protected $casts = [
        'skipped_at' => 'datetime',
        'completed_dismissed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
