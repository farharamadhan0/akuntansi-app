<?php

namespace App\Services;

use App\Models\Account;
use App\Models\JournalLine;
use App\Models\CashBankAccount;
use App\Enums\AccountType;
use App\Enums\TransactionStatus;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AccountBalanceService
{
    public function getBalance(int $accountId, ?string $asOfDate = null): float
    {
        $account = Account::findOrFail($accountId);

        $query = JournalLine::where('account_id', $accountId)
            ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                $q->where('status', TransactionStatus::Posted);
                if ($asOfDate) {
                    $q->where('date', '<=', $asOfDate);
                }
            });

        $totals = $query->selectRaw('COALESCE(SUM(debit), 0) as debit, COALESCE(SUM(credit), 0) as credit')
            ->first();

        return $account->normal_balance === 'debit'
            ? (float) ($totals->debit - $totals->credit)
            : (float) ($totals->credit - $totals->debit);
    }

    public function getCashBankBalance(int $cashBankAccountId, ?string $asOfDate = null): float
    {
        $cashBank = CashBankAccount::findOrFail($cashBankAccountId);

        return $this->getBalance($cashBank->account_id, $asOfDate);
    }

    public function getTrialBalance(int $companyId, ?string $asOfDate = null): Collection
    {
        $asOfDate = $asOfDate ?? now()->toDateString();

        return Account::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('code')
            ->get()
            ->map(function ($account) use ($asOfDate) {
                $balance = $this->getBalance($account->id, $asOfDate);
                
                return [
                    'account' => $account,
                    'debit' => $account->normal_balance === 'debit' ? abs($balance) : 0,
                    'credit' => $account->normal_balance === 'credit' ? abs($balance) : 0,
                    'balance' => $balance,
                ];
            })
            ->filter(fn ($item) => $item['balance'] != 0);
    }

    public function getBalanceSheet(int $companyId, string $asOfDate): array
    {
        $accounts = Account::where('company_id', $companyId)
            ->where('is_active', true)
            ->whereIn('type', [AccountType::Asset, AccountType::Liability, AccountType::Equity])
            ->orderBy('code')
            ->get();

        $result = [
            'assets' => [],
            'liabilities' => [],
            'equity' => [],
            'total_assets' => 0,
            'total_liabilities' => 0,
            'total_equity' => 0,
        ];

        foreach ($accounts as $account) {
            $balance = $this->getBalance($account->id, $asOfDate);
            
            if ($balance == 0) continue;

            $item = [
                'account' => $account,
                'balance' => $balance,
            ];

            match ($account->type) {
                AccountType::Asset => $result['assets'][] = $item,
                AccountType::Liability => $result['liabilities'][] = $item,
                AccountType::Equity => $result['equity'][] = $item,
            };
        }

        $result['total_assets'] = array_sum(array_column($result['assets'], 'balance'));
        $result['total_liabilities'] = array_sum(array_column($result['liabilities'], 'balance'));
        $result['total_equity'] = array_sum(array_column($result['equity'], 'balance'));

        return $result;
    }

    public function getIncomeStatement(int $companyId, string $startDate, string $endDate): array
    {
        $accounts = Account::where('company_id', $companyId)
            ->where('is_active', true)
            ->whereIn('type', [AccountType::Revenue, AccountType::Expense])
            ->orderBy('code')
            ->get();

        $result = [
            'revenue' => [],
            'expenses' => [],
            'total_revenue' => 0,
            'total_expenses' => 0,
            'net_income' => 0,
        ];

        foreach ($accounts as $account) {
            $balance = $this->getPeriodBalance($account->id, $startDate, $endDate);
            
            if ($balance == 0) continue;

            $item = [
                'account' => $account,
                'balance' => abs($balance),
            ];

            if ($account->type === AccountType::Revenue) {
                $result['revenue'][] = $item;
            } else {
                $result['expenses'][] = $item;
            }
        }

        $result['total_revenue'] = array_sum(array_column($result['revenue'], 'balance'));
        $result['total_expenses'] = array_sum(array_column($result['expenses'], 'balance'));
        $result['net_income'] = $result['total_revenue'] - $result['total_expenses'];

        return $result;
    }

    protected function getPeriodBalance(int $accountId, string $startDate, string $endDate): float
    {
        $account = Account::findOrFail($accountId);

        $totals = JournalLine::where('account_id', $accountId)
            ->whereHas('journalEntry', function ($q) use ($startDate, $endDate) {
                $q->where('status', TransactionStatus::Posted)
                    ->whereBetween('date', [$startDate, $endDate]);
            })
            ->selectRaw('COALESCE(SUM(debit), 0) as debit, COALESCE(SUM(credit), 0) as credit')
            ->first();

        return $account->normal_balance === 'debit'
            ? (float) ($totals->debit - $totals->credit)
            : (float) ($totals->credit - $totals->debit);
    }
}
