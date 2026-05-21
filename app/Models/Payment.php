<?php

namespace App\Models;

use App\Enums\PaymentType;
use App\Enums\TransactionStatus;
use App\Traits\BelongsToCompany;
use App\Traits\HasJournalEntries;
use App\Traits\Auditable;
use App\Traits\PreventsPostedDeletion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Payment extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, HasJournalEntries, Auditable, PreventsPostedDeletion;

    protected $fillable = [
        'company_id',
        'payment_number',
        'type',
        'date',
        'amount',
        'description',
        'cash_bank_account_id',
        'partner_id',
        'status',
        'posted_at',
        'voided_at',
        'void_reason',
        'reference',
        'created_by',
    ];

    protected $casts = [
        'type' => PaymentType::class,
        'status' => TransactionStatus::class,
        'date' => 'date',
        'amount' => 'decimal:2',
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function cashBankAccount(): BelongsTo
    {
        return $this->belongsTo(CashBankAccount::class);
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class)->withTrashed();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Posted);
    }

    public function scopeReceivable(Builder $query): Builder
    {
        return $query->where('type', PaymentType::Receivable);
    }

    public function scopePayable(Builder $query): Builder
    {
        return $query->where('type', PaymentType::Payable);
    }
}
