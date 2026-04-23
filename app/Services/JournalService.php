<?php

namespace App\Services;

use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Account;
use App\Enums\TransactionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class JournalService
{
    public function __construct(
        protected NumberGeneratorService $numberGenerator
    ) {}

    public function createEntry(
        int $companyId,
        string $date,
        string $description,
        array $lines,
        ?Model $source = null,
        bool $isManual = false,
        bool $isAdjusting = false
    ): JournalEntry {
        $this->validateLines($lines);

        return DB::transaction(function () use ($companyId, $date, $description, $lines, $source, $isManual, $isAdjusting) {
            $entry = JournalEntry::create([
                'company_id' => $companyId,
                'entry_number' => $this->numberGenerator->generateJournalNumber($companyId),
                'date' => $date,
                'description' => $description,
                'source_type' => $source ? get_class($source) : null,
                'source_id' => $source?->id,
                'is_manual' => $isManual,
                'is_adjusting' => $isAdjusting,
                'is_closing' => false,
                'status' => TransactionStatus::Posted,
                'created_by' => auth()->id(),
            ]);

            foreach ($lines as $line) {
                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $line['account_id'],
                    'description' => $line['description'] ?? null,
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                ]);
            }

            return $entry->load('lines.account');
        });
    }

    public function createManualDraft(int $companyId, array $data): JournalEntry
    {
        $this->validateLines($data['lines']);

        return DB::transaction(function () use ($companyId, $data) {
            $entry = JournalEntry::create([
                'company_id' => $companyId,
                'entry_number' => $this->numberGenerator->generateJournalNumber($companyId),
                'date' => $data['date'],
                'description' => $data['description'],
                'source_type' => null,
                'source_id' => null,
                'is_manual' => true,
                'is_adjusting' => (bool) ($data['is_adjusting'] ?? false),
                'is_closing' => false,
                'status' => TransactionStatus::Draft,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['lines'] as $line) {
                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $line['account_id'],
                    'description' => $line['description'] ?? null,
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                ]);
            }

            return $entry->load('lines.account');
        });
    }

    public function updateDraft(JournalEntry $entry, array $data): JournalEntry
    {
        if (! $entry->is_manual) {
            throw new \Exception('Hanya jurnal manual yang dapat diedit.');
        }

        if ($entry->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya jurnal draft yang dapat diedit.');
        }

        $this->validateLines($data['lines']);

        return DB::transaction(function () use ($entry, $data) {
            $entry->update([
                'date' => $data['date'],
                'description' => $data['description'],
                'is_adjusting' => (bool) ($data['is_adjusting'] ?? false),
            ]);

            $entry->lines()->delete();

            foreach ($data['lines'] as $line) {
                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $line['account_id'],
                    'description' => $line['description'] ?? null,
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                ]);
            }

            return $entry->fresh()->load('lines.account');
        });
    }

    public function post(JournalEntry $entry): JournalEntry
    {
        if ($entry->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya jurnal draft yang dapat diposting.');
        }

        $lines = $entry->lines->map(fn($l) => [
            'account_id' => $l->account_id,
            'debit' => (float) $l->debit,
            'credit' => (float) $l->credit,
        ])->toArray();

        $this->validateLines($lines);

        $entry->update(['status' => TransactionStatus::Posted]);

        return $entry->fresh();
    }

    public function deleteDraft(JournalEntry $entry): void
    {
        if ($entry->status !== TransactionStatus::Draft) {
            throw new \Exception('Hanya jurnal draft yang dapat dihapus.');
        }

        if (! $entry->is_manual) {
            throw new \Exception('Jurnal otomatis tidak dapat dihapus.');
        }

        DB::transaction(function () use ($entry) {
            $entry->lines()->delete();
            $entry->delete();
        });
    }

    public function voidEntry(JournalEntry $entry, string $reason): JournalEntry
    {
        if ($entry->status === TransactionStatus::Voided) {
            throw new \Exception('Jurnal sudah dibatalkan.');
        }

        return DB::transaction(function () use ($entry, $reason) {
            $entry->update([
                'status' => TransactionStatus::Voided,
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            $this->createReversalEntry($entry);

            return $entry->fresh();
        });
    }

    protected function createReversalEntry(JournalEntry $originalEntry): JournalEntry
    {
        $reversalLines = $originalEntry->lines->map(function ($line) {
            return [
                'account_id' => $line->account_id,
                'description' => 'Pembalikan: ' . ($line->description ?? ''),
                'debit' => $line->credit,
                'credit' => $line->debit,
            ];
        })->toArray();

        return $this->createEntry(
            $originalEntry->company_id,
            now()->toDateString(),
            'Pembalikan: ' . $originalEntry->description,
            $reversalLines,
            $originalEntry->source,
            false,
            true
        );
    }

    protected function validateLines(array $lines): void
    {
        if (count($lines) < 2) {
            throw new \InvalidArgumentException('Jurnal harus memiliki minimal 2 baris.');
        }

        $totalDebit = array_sum(array_column($lines, 'debit'));
        $totalCredit = array_sum(array_column($lines, 'credit'));

        if (bccomp($totalDebit, $totalCredit, 2) !== 0) {
            throw new \InvalidArgumentException(
                "Jurnal tidak seimbang. Debit: {$totalDebit}, Kredit: {$totalCredit}"
            );
        }

        foreach ($lines as $line) {
            if (empty($line['account_id'])) {
                throw new \InvalidArgumentException('Setiap baris harus memiliki akun.');
            }

            $debit = $line['debit'] ?? 0;
            $credit = $line['credit'] ?? 0;

            if ($debit == 0 && $credit == 0) {
                throw new \InvalidArgumentException('Setiap baris harus memiliki nilai debit atau kredit.');
            }

            if ($debit > 0 && $credit > 0) {
                throw new \InvalidArgumentException('Baris tidak boleh memiliki debit dan kredit bersamaan.');
            }
        }
    }

    public function getAccountBalance(int $accountId, ?string $startDate = null, ?string $endDate = null): array
    {
        $query = JournalLine::where('account_id', $accountId)
            ->whereHas('journalEntry', function ($q) use ($startDate, $endDate) {
                $q->where('status', TransactionStatus::Posted);
                
                if ($startDate) {
                    $q->where('date', '>=', $startDate);
                }
                if ($endDate) {
                    $q->where('date', '<=', $endDate);
                }
            });

        $totals = $query->selectRaw('COALESCE(SUM(debit), 0) as total_debit, COALESCE(SUM(credit), 0) as total_credit')
            ->first();

        $account = Account::find($accountId);
        $balance = $account->normal_balance === 'debit'
            ? $totals->total_debit - $totals->total_credit
            : $totals->total_credit - $totals->total_debit;

        return [
            'account_id' => $accountId,
            'total_debit' => (float) $totals->total_debit,
            'total_credit' => (float) $totals->total_credit,
            'balance' => $balance,
        ];
    }
}
