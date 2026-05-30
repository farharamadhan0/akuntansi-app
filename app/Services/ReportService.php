<?php

namespace App\Services;

use App\Enums\AccountType;
use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Transaction;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReportService
{
    // -----------------------------------------------------------------------
    // Daftar Transaksi
    // -----------------------------------------------------------------------

    public function transactionList(int $companyId, string $from, string $to, ?string $type = null): array
    {
        $query = Transaction::where('company_id', $companyId)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->where('status', TransactionStatus::Posted)
            ->with(['cashBankAccount:id,name', 'category:id,name'])
            ->orderBy('date')
            ->orderBy('created_at');

        if ($type) {
            $query->where('type', $type);
        }

        $rows = $query->get()->map(fn($t) => [
            'id'              => $t->id,
            'number'          => $t->transaction_number,
            'date'            => $t->date->format('Y-m-d'),
            'type'            => $t->type->value,
            'type_label'      => $t->type->label(),
            'description'     => $t->description,
            'category'        => $t->category?->name,
            'cash_bank'       => $t->cashBankAccount?->name,
            'amount'          => (float) $t->amount,
            'reference'       => $t->reference,
        ]);

        return [
            'rows'         => $rows,
            'total_income'  => $rows->where('type', 'income')->sum('amount'),
            'total_expense' => $rows->where('type', 'expense')->sum('amount'),
            'net'           => $rows->where('type', 'income')->sum('amount')
                             - $rows->where('type', 'expense')->sum('amount'),
        ];
    }

    // -----------------------------------------------------------------------
    // Laba Rugi (Income Statement) — ledger-based
    // -----------------------------------------------------------------------

    public function incomeStatement(int $companyId, string $from, string $to): array
    {
        // Aggregate net movement per account from posted journal lines in range
        $lines = JournalLine::select(
                'journal_lines.account_id',
                DB::raw('SUM(journal_lines.debit) as total_debit'),
                DB::raw('SUM(journal_lines.credit) as total_credit')
            )
            ->join('journal_entries', 'journal_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.company_id', $companyId)
            // Sertakan jurnal Voided dan Corrected agar pasangan reversal-nya
            // saling meniadakan secara natural; jika hanya filter Posted,
            // reversal berdiri sendiri dan membuat laporan salah.
            ->whereIn('journal_entries.status', [TransactionStatus::Posted, TransactionStatus::Voided, TransactionStatus::Corrected])
            ->whereDate('journal_entries.date', '>=', $from)
            ->whereDate('journal_entries.date', '<=', $to)
            ->whereIn('accounts.type', [AccountType::Revenue->value, AccountType::Expense->value])
            ->groupBy('journal_lines.account_id')
            ->get();

        $accountIds = $lines->pluck('account_id');
        $accounts   = Account::whereIn('id', $accountIds)->get()->keyBy('id');

        $revenue = [];
        $expense = [];

        foreach ($lines as $line) {
            $account = $accounts[$line->account_id] ?? null;
            if (!$account) continue;

            // Revenue: normal balance = credit → net = credit - debit
            // Expense: normal balance = debit  → net = debit  - credit
            if ($account->type === AccountType::Revenue) {
                $revenue[] = [
                    'account_id'   => $account->id,
                    'account_code' => $account->code,
                    'account_name' => $account->name,
                    'amount'       => (float) $line->total_credit - (float) $line->total_debit,
                ];
            } else {
                $expense[] = [
                    'account_id'   => $account->id,
                    'account_code' => $account->code,
                    'account_name' => $account->name,
                    'amount'       => (float) $line->total_debit - (float) $line->total_credit,
                ];
            }
        }

        usort($revenue, fn($a, $b) => strcmp($a['account_code'], $b['account_code']));
        usort($expense, fn($a, $b) => strcmp($a['account_code'], $b['account_code']));

        $totalRevenue = array_sum(array_column($revenue, 'amount'));
        $totalExpense = array_sum(array_column($expense, 'amount'));

        return [
            'revenue'       => $revenue,
            'expense'       => $expense,
            'total_revenue' => $totalRevenue,
            'total_expense' => $totalExpense,
            'net_income'    => $totalRevenue - $totalExpense,
        ];
    }

    // -----------------------------------------------------------------------
    // Neraca (Balance Sheet) — ledger-based, point-in-time
    // -----------------------------------------------------------------------

    public function balanceSheet(int $companyId, string $asOf): array
    {
        // Aggregate all posted journal lines up to and including $asOf
        $lines = JournalLine::select(
                'journal_lines.account_id',
                DB::raw('SUM(journal_lines.debit) as total_debit'),
                DB::raw('SUM(journal_lines.credit) as total_credit')
            )
            ->join('journal_entries', 'journal_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.company_id', $companyId)
            // Sertakan jurnal Voided dan Corrected agar pasangan reversal-nya
            // saling meniadakan secara natural di neraca.
            ->whereIn('journal_entries.status', [TransactionStatus::Posted, TransactionStatus::Voided, TransactionStatus::Corrected])
            ->whereDate('journal_entries.date', '<=', $asOf)
            ->groupBy('journal_lines.account_id')
            ->get()
            ->keyBy('account_id');

        $accounts = Account::where('company_id', $companyId)->get();

        $asset       = [];
        $liability   = [];
        $equity      = [];
        $revenueTotal = 0.0;
        $expenseTotal = 0.0;

        foreach ($accounts as $account) {
            $line   = $lines[$account->id] ?? null;
            $debit  = $line ? (float) $line->total_debit  : 0.0;
            $credit = $line ? (float) $line->total_credit : 0.0;

            switch ($account->type) {
                case AccountType::Asset:
                    $balance = $debit - $credit;
                    if ($balance != 0.0) {
                        $asset[] = $this->accountRow($account, $balance);
                    }
                    break;
                case AccountType::Liability:
                    $balance = $credit - $debit;
                    if ($balance != 0.0) {
                        $liability[] = $this->accountRow($account, $balance);
                    }
                    break;
                case AccountType::Equity:
                    $balance = $credit - $debit;
                    if ($balance != 0.0) {
                        $equity[] = $this->accountRow($account, $balance);
                    }
                    break;
                case AccountType::Revenue:
                    $revenueTotal += $credit - $debit;
                    break;
                case AccountType::Expense:
                    $expenseTotal += $debit - $credit;
                    break;
            }
        }

        usort($asset,     fn($a, $b) => strcmp($a['account_code'], $b['account_code']));
        usort($liability, fn($a, $b) => strcmp($a['account_code'], $b['account_code']));
        usort($equity,    fn($a, $b) => strcmp($a['account_code'], $b['account_code']));

        $currentEarnings = $revenueTotal - $expenseTotal;

        $totalAsset     = array_sum(array_column($asset, 'amount'));
        $totalLiability = array_sum(array_column($liability, 'amount'));
        $totalEquity    = array_sum(array_column($equity, 'amount')) + $currentEarnings;

        return [
            'asset'             => $asset,
            'liability'         => $liability,
            'equity'            => $equity,
            'current_earnings'  => $currentEarnings,
            'total_asset'       => $totalAsset,
            'total_liability'   => $totalLiability,
            'total_equity'      => $totalEquity,
            'total_liab_equity' => $totalLiability + $totalEquity,
            'is_balanced'       => round($totalAsset, 2) === round($totalLiability + $totalEquity, 2),
        ];
    }

    private function accountRow(Account $account, float $amount): array
    {
        return [
            'account_id'   => $account->id,
            'account_code' => $account->code,
            'account_name' => $account->name,
            'amount'       => $amount,
        ];
    }

    // -----------------------------------------------------------------------
    // Arus Kas (Cash Flow) — ledger-based
    // -----------------------------------------------------------------------

    public function cashFlow(int $companyId, string $from, string $to): array
    {
        // Cash/bank account IDs for this company
        $cashAccountIds = Account::where('company_id', $companyId)
            ->whereIn('subtype', ['cash', 'bank'])
            ->pluck('id');

        $lines = JournalLine::select(
                'journal_lines.account_id',
                'journal_entries.source_type',
                DB::raw('SUM(journal_lines.debit) as total_debit'),
                DB::raw('SUM(journal_lines.credit) as total_credit')
            )
            ->join('journal_entries', 'journal_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.company_id', $companyId)
            // Sertakan jurnal Voided dan Corrected agar pasangan reversal-nya
            // saling meniadakan secara natural di laporan arus kas.
            ->whereIn('journal_entries.status', [TransactionStatus::Posted, TransactionStatus::Voided, TransactionStatus::Corrected])
            ->whereDate('journal_entries.date', '>=', $from)
            ->whereDate('journal_entries.date', '<=', $to)
            ->whereIn('journal_lines.account_id', $cashAccountIds)
            ->groupBy('journal_lines.account_id', 'journal_entries.source_type')
            ->get();

        $accounts = Account::whereIn('id', $cashAccountIds)->get()->keyBy('id');

        $inflows  = [];
        $outflows = [];

        foreach ($lines as $line) {
            $account = $accounts[$line->account_id] ?? null;
            $label   = JournalEntry::labelForSourceType($line->source_type);
            $acctName = $account ? $account->name : '—';

            // Hitung net movement: debit = inflow, credit = outflow untuk akun kas
            // Net positif = inflow, net negatif = outflow
            $netMovement = (float) $line->total_debit - (float) $line->total_credit;

            if ($netMovement > 0) {
                $inflows[] = [
                    'account' => $acctName,
                    'source'  => $label,
                    'amount'  => $netMovement,
                ];
            } elseif ($netMovement < 0) {
                $outflows[] = [
                    'account' => $acctName,
                    'source'  => $label,
                    'amount'  => abs($netMovement),
                ];
            }
        }

        // Sort by amount desc
        usort($inflows, fn($a, $b) => $b['amount'] <=> $a['amount']);
        usort($outflows, fn($a, $b) => $b['amount'] <=> $a['amount']);

        $totalIn  = array_sum(array_column($inflows, 'amount'));
        $totalOut = array_sum(array_column($outflows, 'amount'));

        return [
            'inflows'    => $inflows,
            'outflows'   => $outflows,
            'total_in'   => $totalIn,
            'total_out'  => $totalOut,
            'net_flow'   => $totalIn - $totalOut,
        ];
    }
}
