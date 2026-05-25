<?php

namespace App\Services;

use App\Models\Payable;
use App\Models\Account;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Enums\AccountType;
use Illuminate\Support\Facades\DB;

class PayableService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator
    ) {}

    public function create(array $data): Payable
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;

            $payable = Payable::create([
                'company_id' => $companyId,
                'payable_number' => $this->numberGenerator->generatePayableNumber($companyId),
                'partner_id' => $data['partner_id'],
                'date' => $data['date'],
                'due_date' => $data['due_date'],
                'amount' => $data['amount'],
                'paid_amount' => 0,
                'description' => $data['description'] ?? null,
                'category_id' => $data['category_id'] ?? null,
                'status' => TransactionStatus::Draft,
                'payment_status' => PaymentStatus::Unpaid,
                'corrects_id' => $data['corrects_id'] ?? null,
                'reference' => $data['reference'] ?? null,
                'attachments' => $data['attachments'] ?? null,
                'created_by' => auth()->id(),
            ]);

            return $payable;
        });
    }

    public function post(Payable $payable): Payable
    {
        if ($payable->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya hutang draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($payable) {
            $expenseAccount = $this->getExpenseAccount($payable);
            $payableAccount = $this->getPayableAccount($payable);

            $journalLines = [
                [
                    'account_id' => $expenseAccount->id,
                    'description' => $payable->description,
                    'debit' => $payable->amount,
                    'credit' => 0,
                ],
                [
                    'account_id' => $payableAccount->id,
                    'description' => $payable->description,
                    'debit' => 0,
                    'credit' => $payable->amount,
                ],
            ];

            $this->journalService->createEntry(
                $payable->company_id,
                $payable->date->toDateString(),
                'Hutang: ' . ($payable->description ?? $payable->payable_number),
                $journalLines,
                $payable
            );

            $payable->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            return $payable->fresh();
        });
    }

    public function void(Payable $payable, string $reason): Payable
    {
        if ($payable->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya hutang yang sudah diposting yang dapat dibatalkan.');
        }

        if ($payable->paid_amount > 0) {
            throw new \Exception('Hutang yang sudah ada pembayaran tidak dapat dibatalkan.');
        }

        return DB::transaction(function () use ($payable, $reason) {
            $journalEntry = $payable->journalEntries()->where('status', TransactionStatus::Posted)->first();
            
            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, $reason);
            }

            $payable->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $payable->fresh();
        });
    }

    public function updatePaymentStatus(Payable $payable): void
    {
        $paidAmount = (float) $payable->paid_amount;
        $totalAmount = (float) $payable->amount;

        $status = match (true) {
            $paidAmount <= 0 => PaymentStatus::Unpaid,
            bccomp($paidAmount, $totalAmount, 2) >= 0 => PaymentStatus::Paid,
            default => PaymentStatus::Partial,
        };

        $payable->update(['payment_status' => $status]);
    }

    public function correct(Payable $oldPayable, array $newData): Payable
    {
        if ($oldPayable->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya hutang yang sudah diposting yang dapat dikoreksi.');
        }

        return DB::transaction(function () use ($oldPayable, $newData) {
            $journalEntry = $oldPayable->journalEntries()
                ->where('status', TransactionStatus::Posted)
                ->first();

            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, 'Koreksi hutang: ' . $oldPayable->payable_number);
            }

            $existingAllocations = $oldPayable->paymentAllocations()->get();
            $totalPaid = (float) $existingAllocations->sum('amount');

            $newPayable = $this->create(array_merge($newData, [
                'company_id' => $oldPayable->company_id,
                'corrects_id' => $oldPayable->id,
            ]));

            $this->post($newPayable);

            foreach ($existingAllocations as $allocation) {
                $allocation->update([
                    'allocatable_id' => $newPayable->id,
                ]);
            }

            if ($totalPaid > 0) {
                $newPayable->update(['paid_amount' => $totalPaid]);
                $this->updatePaymentStatus($newPayable->fresh());
            }

            $oldPayable->update([
                'paid_amount' => 0,
                'payment_status' => PaymentStatus::Unpaid,
                'status' => TransactionStatus::Corrected,
                'corrected_at' => now(),
                'corrected_by_id' => $newPayable->id,
            ]);

            return $newPayable->fresh();
        });
    }

    protected function getPayableAccount(Payable $payable): Account
    {
        return Account::where('company_id', $payable->company_id)
            ->where('type', AccountType::Liability)
            ->where('subtype', 'payable')
            ->where('is_system', true)
            ->firstOrFail();
    }

    protected function getExpenseAccount(Payable $payable): Account
    {
        if ($payable->category_id && $payable->category->account_id) {
            return $payable->category->account;
        }

        return Account::where('company_id', $payable->company_id)
            ->where('type', AccountType::Expense)
            ->where('subtype', 'operating_expense')
            ->where('is_system', true)
            ->firstOrFail();
    }
}
