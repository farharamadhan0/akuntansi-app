<?php

namespace App\Services;

use App\Enums\TransactionStatus;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalLine;

class GeneralLedgerService
{
    /**
     * Ambil data buku besar untuk satu akun pada periode tertentu.
     *
     * Return:
     *  - account         : info akun
     *  - opening_balance : saldo awal sebelum $from (sesuai normal_balance)
     *  - lines           : array baris mutasi dengan running balance
     *  - total_debit     : total debit dalam periode
     *  - total_credit    : total kredit dalam periode
     *  - closing_balance : saldo akhir setelah baris terakhir
     */
    public function getLedger(
        int $companyId,
        int $accountId,
        string $from,
        string $to,
        bool $includeVoided = false
    ): array {
        /** @var Account $account */
        $account = Account::where('company_id', $companyId)->findOrFail($accountId);

        $displayStatuses = $includeVoided
            ? [TransactionStatus::Posted->value, TransactionStatus::Voided->value]
            : [TransactionStatus::Posted->value];

        // -------------------------------------------------------------
        // Saldo awal = akumulasi seluruh mutasi sebelum $from
        // -------------------------------------------------------------
        $openingAgg = JournalLine::where('journal_lines.account_id', $accountId)
            ->join('journal_entries', 'journal_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.company_id', $companyId)
            ->where('journal_entries.status', TransactionStatus::Posted)
            ->where(function ($query) {
                $query->where('journal_entries.is_adjusting', false)
                    ->orWhere('journal_entries.description', 'not like', 'Pembalikan:%');
            })
            ->whereDate('journal_entries.date', '<', $from)
            ->selectRaw('COALESCE(SUM(journal_lines.debit),0) as d, COALESCE(SUM(journal_lines.credit),0) as c')
            ->first();

        $opening = $account->normal_balance === 'debit'
            ? (float) $openingAgg->d - (float) $openingAgg->c
            : (float) $openingAgg->c - (float) $openingAgg->d;

        // -------------------------------------------------------------
        // Baris mutasi dalam periode
        // -------------------------------------------------------------
        $lines = JournalLine::with([
                'journalEntry:id,entry_number,date,description,status,source_type,source_id,is_adjusting',
            ])
            ->where('journal_lines.account_id', $accountId)
            ->join('journal_entries', 'journal_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.company_id', $companyId)
            ->whereIn('journal_entries.status', $displayStatuses)
            ->whereDate('journal_entries.date', '>=', $from)
            ->whereDate('journal_entries.date', '<=', $to)
            ->orderBy('journal_entries.date')
            ->orderBy('journal_entries.entry_number')
            ->orderBy('journal_lines.id')
            ->select('journal_lines.*')
            ->get();

        $running     = $opening;
        $totalDebit  = 0.0;
        $totalCredit = 0.0;

        $rows = $lines->map(function (JournalLine $line) use ($account, $includeVoided, &$running, &$totalDebit, &$totalCredit) {
            $debit  = (float) $line->debit;
            $credit = (float) $line->credit;
            $entry = $line->journalEntry;
            $isCancellationRow = $entry->status === TransactionStatus::Voided
                || $this->isReversalEntry($entry);
            $shouldDisplay = $includeVoided || ! $isCancellationRow;
            $description = $this->ledgerDescription($line, $entry);

            if (! $isCancellationRow) {
                $running += $account->normal_balance === 'debit'
                    ? ($debit - $credit)
                    : ($credit - $debit);
            }

            if (! $shouldDisplay) {
                return null;
            }

            if (! $isCancellationRow) {
                $totalDebit  += $debit;
                $totalCredit += $credit;
            }

            return [
                'line_id'         => $line->id,
                'date'            => $entry->date->format('Y-m-d'),
                'entry_id'        => $entry->id,
                'entry_number'    => $entry->entry_number,
                'description'     => $description,
                'source_type'     => $entry->source_type,
                'source_id'       => $entry->source_id,
                'source_label'    => $entry->source_label,
                'status'          => $entry->status->value,
                'debit'           => $debit,
                'credit'          => $credit,
                'running_balance' => $running,
                'is_cancellation' => $isCancellationRow,
                'is_reversal'     => $this->isReversalEntry($entry),
            ];
        })->filter()->values();

        if ($includeVoided) {
            $rows = $this->groupCancellationRows($rows);
        }

        return [
            'account' => [
                'id'             => $account->id,
                'code'           => $account->code,
                'name'           => $account->name,
                'type'           => $account->type->value,
                'type_label'     => $account->type->label(),
                'normal_balance' => $account->normal_balance,
            ],
            'opening_balance' => $opening,
            'total_debit'     => $totalDebit,
            'total_credit'    => $totalCredit,
            'closing_balance' => $running,
            'lines'           => $rows->values()->all(),
        ];
    }

    private function groupCancellationRows($rows)
    {
        $reversalsByKey = $rows
            ->filter(fn (array $row) => $row['is_reversal'])
            ->groupBy(fn (array $row) => $this->cancellationKey($row));

        $usedReversalLineIds = [];
        $grouped = collect();

        foreach ($rows as $row) {
            if ($row['is_reversal']) {
                if (! in_array($row['line_id'], $usedReversalLineIds, true)) {
                    $grouped->push($row);
                }

                continue;
            }

            $grouped->push($row);

            if ($row['status'] !== TransactionStatus::Voided->value) {
                continue;
            }

            foreach ($reversalsByKey->get($this->cancellationKey($row), collect()) as $reversal) {
                if (in_array($reversal['line_id'], $usedReversalLineIds, true)) {
                    continue;
                }

                $reversal['running_balance'] = $row['running_balance'];
                $grouped->push($reversal);
                $usedReversalLineIds[] = $reversal['line_id'];
            }
        }

        return $grouped;
    }

    private function ledgerDescription(JournalLine $line, JournalEntry $entry): ?string
    {
        $lineDescription = trim((string) $line->description);

        if ($this->isReversalEntry($entry) && $lineDescription === 'Pembalikan:') {
            return $entry->description;
        }

        return $line->description ?: $entry->description;
    }

    private function cancellationKey(array $row): string
    {
        return $row['date'] . '|' . $this->normalizedCancellationDescription($row['description']);
    }

    private function normalizedCancellationDescription(?string $description): string
    {
        $description = trim((string) $description);

        if (str_starts_with($description, 'Pembalikan:')) {
            $description = trim(substr($description, strlen('Pembalikan:')));
        }

        return strtolower(preg_replace('/\s+/', ' ', $description));
    }

    private function isReversalEntry(JournalEntry $entry): bool
    {
        return (bool) $entry->is_adjusting
            && str_starts_with((string) $entry->description, 'Pembalikan:');
    }

}
