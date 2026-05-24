<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Account;
use App\Enums\TransactionType;
use App\Enums\TransactionStatus;
use App\Enums\AccountType;
use Illuminate\Support\Facades\DB;

class ExpenseService
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
                'transaction_number' => $this->numberGenerator->generateTransactionNumber($companyId, 'expense'),
                'type' => TransactionType::Expense,
                'date' => $data['date'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'cash_bank_account_id' => $data['cash_bank_account_id'],
                'category_id' => $data['category_id'] ?? null,
                'partner_id' => $data['partner_id'] ?? null,
                'status' => TransactionStatus::Draft,
                'reference' => $data['reference'] ?? null,
                'attachments' => $data['attachments'] ?? null,
                'corrects_id' => $data['corrects_id'] ?? null,
                'created_by' => auth()->id(),
            ]);

            return $transaction;
        });
    }

    public function post(Transaction $transaction): Transaction
    {
        if ($transaction->type !== TransactionType::Expense) {
            throw new \Exception('Transaksi bukan tipe uang keluar.');
        }

        if ($transaction->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya transaksi draft yang dapat diposting.');
        }

        return DB::transaction(function () use ($transaction) {
            $cashBankAccount = $transaction->cashBankAccount->account;
            $expenseAccount = $this->getExpenseAccount($transaction);

            $journalLines = [
                [
                    'account_id' => $expenseAccount->id,
                    'description' => $transaction->description,
                    'debit' => $transaction->amount,
                    'credit' => 0,
                ],
                [
                    'account_id' => $cashBankAccount->id,
                    'description' => $transaction->description,
                    'debit' => 0,
                    'credit' => $transaction->amount,
                ],
            ];

            $this->journalService->createEntry(
                $transaction->company_id,
                $transaction->date->toDateString(),
                'Uang Keluar: ' . ($transaction->description ?? $transaction->transaction_number),
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
        if ($transaction->type !== TransactionType::Expense) {
            throw new \Exception('Transaksi bukan tipe uang keluar.');
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

    public function correct(Transaction $oldTransaction, array $newData): Transaction
    {
        if ($oldTransaction->type !== TransactionType::Expense) {
            throw new \Exception('Transaksi bukan tipe uang keluar.');
        }

        if ($oldTransaction->status !== TransactionStatus::Posted) {
            throw new \Exception('Hanya transaksi yang sudah diposting yang dapat dikoreksi.');
        }

        return DB::transaction(function () use ($oldTransaction, $newData) {
            $journalEntry = $oldTransaction->journalEntries()
                ->where('status', TransactionStatus::Posted)
                ->first();

            if ($journalEntry) {
                $this->journalService->voidEntry($journalEntry, 'Koreksi transaksi: ' . $oldTransaction->transaction_number);
            }

            $newTransaction = $this->create(array_merge($newData, [
                'company_id' => $oldTransaction->company_id,
                'corrects_id' => $oldTransaction->id,
            ]));

            $this->post($newTransaction);

            $oldTransaction->update([
                'status' => TransactionStatus::Corrected,
                'corrected_at' => now(),
                'corrected_by_id' => $newTransaction->id,
            ]);

            return $newTransaction;
        });
    }

    protected function getExpenseAccount(Transaction $transaction): Account
    {
        if ($transaction->category_id && $transaction->category->account_id) {
            return $transaction->category->account;
        }

        return Account::where('company_id', $transaction->company_id)
            ->where('type', AccountType::Expense)
            ->where('subtype', 'operating_expense')
            ->where('is_system', true)
            ->firstOrFail();
    }
}
