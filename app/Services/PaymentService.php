<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Receivable;
use App\Models\Payable;
use App\Models\Account;
use App\Enums\PaymentType;
use App\Enums\TransactionStatus;
use App\Enums\AccountType;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator,
        protected ReceivableService $receivableService,
        protected PayableService $payableService
    ) {}

    public function createReceivablePayment(array $data): Payment
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;

            $payment = Payment::create([
                'company_id' => $companyId,
                'payment_number' => $this->numberGenerator->generatePaymentNumber($companyId, 'receivable'),
                'type' => PaymentType::Receivable,
                'date' => $data['date'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'cash_bank_account_id' => $data['cash_bank_account_id'],
                'customer_id' => $data['customer_id'],
                'status' => TransactionStatus::Draft,
                'reference' => $data['reference'] ?? null,
                'created_by' => auth()->id(),
            ]);

            if (!empty($data['allocations'])) {
                $this->createAllocations($payment, $data['allocations'], Receivable::class);
            }

            return $payment->load('allocations.allocatable');
        });
    }

    public function createPayablePayment(array $data): Payment
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;

            $payment = Payment::create([
                'company_id' => $companyId,
                'payment_number' => $this->numberGenerator->generatePaymentNumber($companyId, 'payable'),
                'type' => PaymentType::Payable,
                'date' => $data['date'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'cash_bank_account_id' => $data['cash_bank_account_id'],
                'supplier_id' => $data['supplier_id'],
                'status' => TransactionStatus::Draft,
                'reference' => $data['reference'] ?? null,
                'created_by' => auth()->id(),
            ]);

            if (!empty($data['allocations'])) {
                $this->createAllocations($payment, $data['allocations'], Payable::class);
            }

            return $payment->load('allocations.allocatable');
        });
    }

    public function post(Payment $payment): Payment
    {
        if ($payment->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya pembayaran draft yang dapat diposting.');
        }

        $this->validateAllocations($payment);

        return DB::transaction(function () use ($payment) {
            $cashBankAccount = $payment->cashBankAccount->account;

            if ($payment->type === PaymentType::Receivable) {
                $this->postReceivablePayment($payment, $cashBankAccount);
            } else {
                $this->postPayablePayment($payment, $cashBankAccount);
            }

            $payment->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            $this->updateAllocatablePaymentStatus($payment);

            return $payment->fresh()->load('allocations.allocatable');
        });
    }

    public function void(Payment $payment, string $reason): Payment
    {
        if ($payment->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya pembayaran yang sudah diposting yang dapat dibatalkan.');
        }

        return DB::transaction(function () use ($payment, $reason) {
            $journalEntry = $payment->journalEntries()->where('status', TransactionStatus::Posted)->first();
            
            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, $reason);
            }

            foreach ($payment->allocations as $allocation) {
                $allocatable = $allocation->allocatable;
                $allocatable->decrement('paid_amount', $allocation->amount);
                
                if ($payment->type === PaymentType::Receivable) {
                    $this->receivableService->updatePaymentStatus($allocatable);
                } else {
                    $this->payableService->updatePaymentStatus($allocatable);
                }
            }

            $payment->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $payment->fresh();
        });
    }

    protected function postReceivablePayment(Payment $payment, Account $cashBankAccount): void
    {
        $receivableAccount = Account::where('company_id', $payment->company_id)
            ->where('type', AccountType::Asset)
            ->where('subtype', 'receivable')
            ->firstOrFail();

        $journalLines = [
            [
                'account_id' => $cashBankAccount->id,
                'description' => 'Penerimaan piutang dari ' . $payment->customer->name,
                'debit' => $payment->amount,
                'credit' => 0,
            ],
            [
                'account_id' => $receivableAccount->id,
                'description' => 'Penerimaan piutang dari ' . $payment->customer->name,
                'debit' => 0,
                'credit' => $payment->amount,
            ],
        ];

        $this->journalService->createEntry(
            $payment->company_id,
            $payment->date->toDateString(),
            'Penerimaan Piutang: ' . $payment->payment_number,
            $journalLines,
            $payment
        );
    }

    protected function postPayablePayment(Payment $payment, Account $cashBankAccount): void
    {
        $payableAccount = Account::where('company_id', $payment->company_id)
            ->where('type', AccountType::Liability)
            ->where('subtype', 'payable')
            ->firstOrFail();

        $journalLines = [
            [
                'account_id' => $payableAccount->id,
                'description' => 'Pembayaran hutang ke ' . $payment->supplier->name,
                'debit' => $payment->amount,
                'credit' => 0,
            ],
            [
                'account_id' => $cashBankAccount->id,
                'description' => 'Pembayaran hutang ke ' . $payment->supplier->name,
                'debit' => 0,
                'credit' => $payment->amount,
            ],
        ];

        $this->journalService->createEntry(
            $payment->company_id,
            $payment->date->toDateString(),
            'Pembayaran Hutang: ' . $payment->payment_number,
            $journalLines,
            $payment
        );
    }

    protected function createAllocations(Payment $payment, array $allocations, string $modelClass): void
    {
        foreach ($allocations as $allocation) {
            PaymentAllocation::create([
                'payment_id' => $payment->id,
                'allocatable_type' => $modelClass,
                'allocatable_id' => $allocation['id'],
                'amount' => $allocation['amount'],
            ]);
        }
    }

    protected function validateAllocations(Payment $payment): void
    {
        $totalAllocated = $payment->allocations->sum('amount');

        if (bccomp($totalAllocated, $payment->amount, 2) !== 0) {
            throw new \Exception(
                "Total alokasi ({$totalAllocated}) tidak sama dengan jumlah pembayaran ({$payment->amount})."
            );
        }

        foreach ($payment->allocations as $allocation) {
            $allocatable = $allocation->allocatable;
            $remainingAmount = $allocatable->amount - $allocatable->paid_amount;

            if (bccomp($allocation->amount, $remainingAmount, 2) > 0) {
                $docNumber = $allocatable->receivable_number ?? $allocatable->payable_number;
                throw new \Exception(
                    "Alokasi melebihi sisa tagihan untuk {$docNumber}."
                );
            }
        }
    }

    protected function updateAllocatablePaymentStatus(Payment $payment): void
    {
        foreach ($payment->allocations as $allocation) {
            $allocatable = $allocation->allocatable;
            $allocatable->increment('paid_amount', $allocation->amount);

            if ($payment->type === PaymentType::Receivable) {
                $this->receivableService->updatePaymentStatus($allocatable->fresh());
            } else {
                $this->payableService->updatePaymentStatus($allocatable->fresh());
            }
        }
    }
}
