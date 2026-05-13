<?php

namespace App\Services;

use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class CashBankAccountService
{
    public function __construct(
        protected JournalService $journalService
    ) {}

    public function create(int $companyId, array $data, ?float $openingBalance = null, ?string $openingBalanceDate = null): CashBankAccount
    {
        return DB::transaction(function () use ($companyId, $data, $openingBalance, $openingBalanceDate) {
            $cashBank = CashBankAccount::create([
                'company_id'     => $companyId,
                'account_id'     => $data['account_id'],
                'name'           => $data['name'],
                'type'           => $data['type'],
                'bank_name'      => $data['bank_name'] ?? null,
                'account_number' => $data['account_number'] ?? null,
                'is_active'      => true,
            ]);

            if ($openingBalance !== null && $openingBalance > 0) {
                $this->createOpeningJournal(
                    $cashBank,
                    $openingBalance,
                    $openingBalanceDate ?? now()->toDateString()
                );
            }

            return $cashBank;
        });
    }

    public function update(CashBankAccount $cashBank, array $data, ?float $openingBalance = null, ?string $openingBalanceDate = null): CashBankAccount
    {
        return DB::transaction(function () use ($cashBank, $data, $openingBalance, $openingBalanceDate) {
            $cashBank->update([
                'account_id'     => $data['account_id'],
                'name'           => $data['name'],
                'type'           => $data['type'],
                'bank_name'      => $data['bank_name'] ?? null,
                'account_number' => $data['account_number'] ?? null,
            ]);

            // Saldo awal hanya boleh diubah selama belum ada transaksi user.
            if (! $this->hasUserTransactions($cashBank)) {
                $this->removeOpeningJournal($cashBank);

                if ($openingBalance !== null && $openingBalance > 0) {
                    $this->createOpeningJournal(
                        $cashBank,
                        $openingBalance,
                        $openingBalanceDate ?? now()->toDateString()
                    );
                }
            }

            return $cashBank->fresh();
        });
    }

    public function destroy(CashBankAccount $cashBank): void
    {
        DB::transaction(function () use ($cashBank) {
            $this->removeOpeningJournal($cashBank);
            $cashBank->delete();
        });
    }

    public function hasUserTransactions(CashBankAccount $cashBank): bool
    {
        $hasTx = Transaction::withoutGlobalScope('company')
            ->where(function ($q) use ($cashBank) {
                $q->where('cash_bank_account_id', $cashBank->id)
                    ->orWhere('destination_cash_bank_account_id', $cashBank->id);
            })
            ->exists();

        if ($hasTx) {
            return true;
        }

        $hasPayment = Payment::withoutGlobalScope('company')
            ->where('cash_bank_account_id', $cashBank->id)
            ->exists();

        if ($hasPayment) {
            return true;
        }

        $hasPurchase = Purchase::withoutGlobalScope('company')
            ->where('cash_bank_account_id', $cashBank->id)
            ->exists();

        if ($hasPurchase) {
            return true;
        }

        return Sale::withoutGlobalScope('company')
            ->where('cash_bank_account_id', $cashBank->id)
            ->exists();
    }

    public function getOpeningJournal(CashBankAccount $cashBank): ?JournalEntry
    {
        return JournalEntry::where('source_type', CashBankAccount::class)
            ->where('source_id', $cashBank->id)
            ->first();
    }

    public function getOpeningBalance(CashBankAccount $cashBank): array
    {
        $entry = $this->getOpeningJournal($cashBank);

        if (! $entry) {
            return ['amount' => 0.0, 'date' => null];
        }

        $line = $entry->lines()
            ->where('account_id', $cashBank->account_id)
            ->first();

        return [
            'amount' => $line ? (float) $line->debit : 0.0,
            'date'   => $entry->date?->format('Y-m-d'),
        ];
    }

    protected function createOpeningJournal(CashBankAccount $cashBank, float $amount, string $date): JournalEntry
    {
        $equityAccount = Account::withoutGlobalScope('company')
            ->where('company_id', $cashBank->company_id)
            ->where('code', '3100')
            ->firstOrFail();

        $description = 'Saldo awal: ' . $cashBank->name;

        return $this->journalService->createEntry(
            $cashBank->company_id,
            $date,
            $description,
            [
                [
                    'account_id'  => $cashBank->account_id,
                    'description' => $description,
                    'debit'       => $amount,
                    'credit'      => 0,
                ],
                [
                    'account_id'  => $equityAccount->id,
                    'description' => $description,
                    'debit'       => 0,
                    'credit'      => $amount,
                ],
            ],
            $cashBank
        );
    }

    protected function removeOpeningJournal(CashBankAccount $cashBank): void
    {
        $entry = $this->getOpeningJournal($cashBank);

        if (! $entry) {
            return;
        }

        // Bypass PreventsPostedDeletion: aman karena pemanggil sudah memastikan
        // belum ada transaksi user yang merujuk akun ini.
        JournalEntry::withoutEvents(function () use ($entry) {
            $entry->lines()->delete();
            $entry->delete();
        });
    }
}
