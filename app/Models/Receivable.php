<?php

namespace App\Models;

use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Traits\BelongsToCompany;
use App\Traits\HasJournalEntries;
use App\Traits\Auditable;
use App\Traits\PreventsPostedDeletion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Receivable extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, HasJournalEntries, Auditable, PreventsPostedDeletion;

    protected $fillable = [
        'company_id',
        'receivable_number',
        'customer_id',
        'date',
        'due_date',
        'amount',
        'paid_amount',
        'description',
        'category_id',
        'status',
        'payment_status',
        'posted_at',
        'voided_at',
        'void_reason',
        'reference',
        'attachments',
        'created_by',
    ];

    protected $casts = [
        'status' => TransactionStatus::class,
        'payment_status' => PaymentStatus::class,
        'date' => 'date',
        'due_date' => 'date',
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
        'attachments' => 'array',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TransactionCategory::class, 'category_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paymentAllocations(): MorphMany
    {
        return $this->morphMany(PaymentAllocation::class, 'allocatable');
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Posted);
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('payment_status', PaymentStatus::Unpaid);
    }

    public function scopeOutstanding(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid);
    }

    public function getRemainingAmountAttribute(): float
    {
        return $this->amount - $this->paid_amount;
    }

    public function isOverdue(): bool
    {
        return $this->due_date->isPast() && $this->payment_status !== PaymentStatus::Paid;
    }
}
