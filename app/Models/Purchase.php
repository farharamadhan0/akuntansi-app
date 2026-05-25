<?php

namespace App\Models;

use App\Enums\TransactionStatus;
use App\Traits\Auditable;
use App\Traits\BelongsToCompany;
use App\Traits\HasJournalEntries;
use App\Traits\PreventsPostedDeletion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Purchase extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, HasJournalEntries, Auditable, PreventsPostedDeletion;

    protected $fillable = [
        'company_id',
        'purchase_number',
        'partner_id',
        'date',
        'due_date',
        'payment_type',
        'cash_bank_account_id',
        'payable_id',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'notes',
        'status',
        'posted_at',
        'voided_at',
        'void_reason',
        'corrects_id',
        'corrected_by_id',
        'corrected_at',
        'reference',
        'attachments',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'status' => TransactionStatus::class,
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
        'corrected_at' => 'datetime',
        'attachments' => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class)->withTrashed();
    }

    public function cashBankAccount(): BelongsTo
    {
        return $this->belongsTo(CashBankAccount::class);
    }

    public function payable(): BelongsTo
    {
        return $this->belongsTo(Payable::class);
    }

    public function corrects(): BelongsTo
    {
        return $this->belongsTo(Purchase::class, 'corrects_id');
    }

    public function correctedBy(): BelongsTo
    {
        return $this->belongsTo(Purchase::class, 'corrected_by_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Draft);
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', TransactionStatus::Posted);
    }
}
