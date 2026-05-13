<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Account;
use App\Enums\TransactionType;
use App\Enums\TransactionStatus;
use App\Enums\AccountType;
use Illuminate\Support\Facades\DB;

class IncomeService
{
    public function __construct(
        protected JournalService $journalService,
        protected NumberGeneratorService $numberGenerator
    ) {}

    public function create(array $data): Transaction
    {
        return DB::transaction(function () use ($data) {
            $companyId = $data['company_id'] ?? auth()->user()->current_company_id;

            $transaction = Transaction::create([
                'company_id' => $companyId,
                'transaction_number' => $this->numberGenerator->generateTransactionNumber($companyId, 'income'),
                'type' => TransactionType::Income,
                'date' => $data['date'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'cash_bank_account_id' => $data['cash_bank_account_id'],
                'category_id' => $data['category_id'] ?? null,
                'customer_id' => $data['customer_id'] ?? null,
                'status' => TransactionStatus::Draft,
                'reference' => $data['reference'] ?? null,
                'attachments' => $data['attachments'] ?? null,
                'created_by' => auth()->id(),
            ]);

            return $transaction;
        });
    }

    public function post(Transaction $transaction): Transaction
    {
        if ($transaction->type !== TransactionType::Income) {
            throw new \Exception('Transaksi bukan tipe uang masuk.');
        }

        if ($transaction->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya transaksi draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($transaction) {
            $cashBankAccount = $transaction->cashBankAccount->account;
            $revenueAccount = $this->getRevenueAccount($transaction);

            $journalLines = [
                [
                    'account_id' => $cashBankAccount->id,
                    'description' => $transaction->description,
                    'debit' => $transaction->amount,
                    'credit' => 0,
                ],
                [
                    'account_id' => $revenueAccount->id,
                    'description' => $transaction->description,
                    'debit' => 0,
                    'credit' => $transaction->amount,
                ],
            ];

            $this->journalService->createEntry(
                $transaction->company_id,
                $transaction->date->toDateString(),
                'Uang Masuk: ' . ($transaction->description ?? $transaction->transaction_number),
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
        if ($transaction->type !== TransactionType::Income) {
            throw new \Exception('Transaksi bukan tipe uang masuk.');
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

    protected function getRevenueAccount(Transaction $transaction): Account
    {
        if ($transaction->category_id && $transaction->category->account_id) {
            return $transaction->category->account;
        }

        return Account::where('company_id', $transaction->company_id)
            ->where('type', AccountType::Revenue)
            ->where('subtype', 'operating_revenue')
            ->where('is_system', true)
            ->firstOrFail();
    }
}
