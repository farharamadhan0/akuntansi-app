<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ErrorLog extends Model
{
    protected $fillable = [
        'level',
        'message',
        'exception_class',
        'file',
        'line',
        'trace',
        'context',
        'request_method',
        'request_url',
        'route_name',
        'ip_address',
        'user_agent',
        'user_id',
        'company_id',
    ];

    protected $casts = [
        'context' => 'array',
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
