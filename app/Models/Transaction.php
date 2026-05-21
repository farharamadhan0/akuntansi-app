<?php

namespace App\Models;

use App\Enums\TransactionType;
use App\Enums\TransactionStatus;
use App\Traits\BelongsToCompany;
use App\Traits\HasJournalEntries;
use App\Traits\Auditable;
use App\Traits\PreventsPostedDeletion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Transaction extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, HasJournalEntries, Auditable, PreventsPostedDeletion;

    protected $fillable = [
        'company_id',
        'transaction_number',
        'type',
        'date',
        'amount',
        'description',
        'cash_bank_account_id',
        'destination_cash_bank_account_id',
        'category_id',
        'partner_id',
        'status',
        'posted_at',
        'voided_at',
        'void_reason',
        'reference',
        'attachments',
        'created_by',
    ];

    protected $casts = [
        'type' => TransactionType::class,
        'status' => TransactionStatus::class,
        'date' => 'date',
        'amount' => 'decimal:2',
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
        'attachments' => 'array',
    ];

    public function cashBankAccount(): BelongsTo
    {
        return $this->belongsTo(CashBankAccount::class);
    }

    public function destinationCashBankAccount(): BelongsTo
    {
        return $this->belongsTo(CashBankAccount::class, 'destination_cash_bank_account_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(TransactionCategory::class, 'category_id');
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class)->withTrashed();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Draft);
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Posted);
    }

    public function scopeOfType(Builder $query, TransactionType $type): Builder
    {
        return $query->where('type', $type);
    }

    public function isDraft(): bool
    {
        return $this->status === TransactionStatus::Draft;
    }

    public function isPosted(): bool
    {
        return $this->status === TransactionStatus::Posted;
    }

    public function isVoided(): bool
    {
        return $this->status === TransactionStatus::Voided;
    }
}
