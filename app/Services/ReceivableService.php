<?php

namespace App\Services;

use App\Models\Receivable;
use App\Models\Account;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Enums\AccountType;
use Illuminate\Support\Facades\DB;

class ReceivableService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator
    ) {}

    public function create(array $data): Receivable
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;

            $receivable = Receivable::create([
                'company_id' => $companyId,
                'receivable_number' => $this->numberGenerator->generateReceivableNumber($companyId),
                'customer_id' => $data['customer_id'],
                'date' => $data['date'],
                'due_date' => $data['due_date'],
                'amount' => $data['amount'],
                'paid_amount' => 0,
                'description' => $data['description'] ?? null,
                'category_id' => $data['category_id'] ?? null,
                'status' => TransactionStatus::Draft,
                'payment_status' => PaymentStatus::Unpaid,
                'reference' => $data['reference'] ?? null,
                'attachments' => $data['attachments'] ?? null,
                'created_by' => auth()->id(),
            ]);

            return $receivable;
        });
    }

    public function post(Receivable $receivable): Receivable
    {
        if ($receivable->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya piutang draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($receivable) {
            $receivableAccount = $this->getReceivableAccount($receivable);
            $revenueAccount = $this->getRevenueAccount($receivable);

            $journalLines = [
                [
                    'account_id' => $receivableAccount->id,
                    'description' => $receivable->description,
                    'debit' => $receivable->amount,
                    'credit' => 0,
                ],
                [
                    'account_id' => $revenueAccount->id,
                    'description' => $receivable->description,
                    'debit' => 0,
                    'credit' => $receivable->amount,
                ],
            ];

            $this->journalService->createEntry(
                $receivable->company_id,
                $receivable->date->toDateString(),
                'Piutang: ' . ($receivable->description ?? $receivable->receivable_number),
                $journalLines,
                $receivable
            );

            $receivable->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            return $receivable->fresh();
        });
    }

    public function void(Receivable $receivable, string $reason): Receivable
    {
        if ($receivable->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya piutang yang sudah diposting yang dapat dibatalkan.');
        }

        if ($receivable->paid_amount > 0) {
            throw new \Exception('Piutang yang sudah ada pembayaran tidak dapat dibatalkan.');
        }

        return DB::transaction(function () use ($receivable, $reason) {
            $journalEntry = $receivable->journalEntries()->where('status', TransactionStatus::Posted)->first();
            
            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, $reason);
            }

            $receivable->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $receivable->fresh();
        });
    }

    public function updatePaymentStatus(Receivable $receivable): void
    {
        $paidAmount = (float) $receivable->paid_amount;
        $totalAmount = (float) $receivable->amount;

        $status = match (true) {
            $paidAmount <= 0 => PaymentStatus::Unpaid,
            bccomp($paidAmount, $totalAmount, 2) >= 0 => PaymentStatus::Paid,
            default => PaymentStatus::Partial,
        };

        $receivable->update(['payment_status' => $status]);
    }

    protected function getReceivableAccount(Receivable $receivable): Account
    {
        return Account::where('company_id', $receivable->company_id)
            ->where('type', AccountType::Asset)
            ->where('subtype', 'receivable')
            ->firstOrFail();
    }

    protected function getRevenueAccount(Receivable $receivable): Account
    {
        if ($receivable->category_id && $receivable->category->account_id) {
            return $receivable->category->account;
        }

        return Account::where('company_id', $receivable->company_id)
            ->where('type', AccountType::Revenue)
            ->where('subtype', 'operating_revenue')
            ->firstOrFail();
    }
}
