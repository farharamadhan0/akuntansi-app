<?php

namespace App\Services;

use App\Models\Transaction;
use App\Enums\TransactionType;
use App\Enums\TransactionStatus;
use Illuminate\Support\Facades\DB;

class TransferService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator
    ) {}

    public function create(array $data): Transaction
    {
        if ($data['cash_bank_account_id'] === $data['destination_cash_bank_account_id']) {
            throw new \Exception('Akun asal dan tujuan tidak boleh sama.');
        }

        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;

            $transaction = Transaction::create([
                'company_id' => $companyId,
                'transaction_number' => $this->numberGenerator->generateTransactionNumber($companyId, 'transfer'),
                'type' => TransactionType::Transfer,
                'date' => $data['date'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'cash_bank_account_id' => $data['cash_bank_account_id'],
                'destination_cash_bank_account_id' => $data['destination_cash_bank_account_id'],
                'status' => TransactionStatus::Draft,
                'reference' => $data['reference'] ?? null,
                'created_by' => auth()->id(),
            ]);

            return $transaction;
        });
    }

    public function post(Transaction $transaction): Transaction
    {
        if ($transaction->type !== TransactionType::Transfer) {
            throw new \Exception('Transaksi bukan tipe transfer.');
        }

        if ($transaction->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya transaksi draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($transaction) {
            $sourceAccount = $transaction->cashBankAccount->account;
            $destinationAccount = $transaction->destinationCashBankAccount->account;

            $journalLines = [
                [
                    'account_id' => $destinationAccount->id,
                    'description' => 'Transfer dari ' . $transaction->cashBankAccount->name,
                    'debit' => $transaction->amount,
                    'credit' => 0,
                ],
                [
                    'account_id' => $sourceAccount->id,
                    'description' => 'Transfer ke ' . $transaction->destinationCashBankAccount->name,
                    'debit' => 0,
                    'credit' => $transaction->amount,
                ],
            ];

            $this->journalService->createEntry(
                $transaction->company_id,
                $transaction->date->toDateString(),
                'Transfer: ' . $transaction->cashBankAccount->name . ' → ' . $transaction->destinationCashBankAccount->name,
                $journalLines,
                $transaction
            );

            $transaction->update([
                'status' => TransactionStatus::Posted,
                'posted_at' => now(),
            ]);

            return $transaction->fresh();
        });
    }

    public function void(Transaction $transaction, string $reason): Transaction
    {
        if ($transaction->type !== TransactionType::Transfer) {
            throw new \Exception('Transaksi bukan tipe transfer.');
        }

        if ($transaction->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya transaksi yang sudah diposting yang dapat dibatalkan.');
        }

        return DB::transaction(function () use ($transaction, $reason) {
            $journalEntry = $transaction->journalEntries()->where('status', TransactionStatus::Posted)->first();
            
            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, $reason);
            }

            $transaction->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $transaction->fresh();
        });
    }
}
