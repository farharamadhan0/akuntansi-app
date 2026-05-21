<?php

namespace App\Http\Controllers;

use App\Enums\TransactionStatus;
use App\Http\Requests\JournalEntryRequest;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Services\JournalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class JournalEntryController extends Controller
{
    public function __construct(protected JournalService $journalService) {}

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $entries = JournalEntry::where('company_id', $companyId)
            ->with(['lines:id,journal_entry_id,debit,credit'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn(JournalEntry $e) => [
                'id'           => $e->id,
                'entry_number' => $e->entry_number,
                'date'         => $e->date->format('Y-m-d'),
                'description'  => $e->description,
                'status'       => $e->status->value,
                'status_label' => $e->status->label(),
                'status_color' => $e->status->color(),
                'is_manual'    => (bool) $e->is_manual,
                'is_adjusting' => (bool) $e->is_adjusting,
                'source_type'  => $e->source_type,
                'total_debit'  => (float) $e->lines->sum('debit'),
                'total_credit' => (float) $e->lines->sum('credit'),
                'line_count'   => $e->lines->count(),
            ]);

        return Inertia::render('Journals/Index', [
            'entries' => $entries,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Journals/Form', [
            'entry'       => null,
            'accounts'    => $this->accountOptions(),
            'defaultDate' => now()->format('Y-m-d'),
        ]);
    }

    public function store(JournalEntryRequest $request): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        try {
            $entry = $this->journalService->createManualDraft(
                $companyId,
                $request->validated()
            );
        } catch (\Throwable $e) {
            Log::error('Gagal menyimpan jurnal umum', [
                'user_id' => auth()->id(),
                'error'   => $e->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal menyimpan jurnal: ' . $e->getMessage());
        }

        return redirect()->route('journals.show', $entry->id)
            ->with('success', 'Jurnal berhasil disimpan sebagai draft');
    }

    public function show(JournalEntry $journal): Response
    {
        $this->authorizeEntry($journal);

        $journal->load(['lines.account:id,code,name', 'createdBy:id,name']);

        return Inertia::render('Journals/Show', [
            'entry' => $this->serializeEntry($journal),
        ]);
    }

    public function edit(JournalEntry $journal): Response
    {
        $this->authorizeEntry($journal);
        $this->assertEditable($journal);

        $journal->load('lines.account:id,code,name');

        return Inertia::render('Journals/Form', [
            'entry' => [
                'id'           => $journal->id,
                'entry_number' => $journal->entry_number,
                'date'         => $journal->date->format('Y-m-d'),
                'description'  => $journal->description,
                'is_adjusting' => (bool) $journal->is_adjusting,
                'lines'        => $journal->lines->map(fn($l) => [
                    'account_id'  => $l->account_id,
                    'description' => $l->description,
                    'debit'       => (float) $l->debit,
                    'credit'      => (float) $l->credit,
                ])->values(),
            ],
            'accounts'    => $this->accountOptions(),
            'defaultDate' => $journal->date->format('Y-m-d'),
        ]);
    }

    public function update(JournalEntryRequest $request, JournalEntry $journal): RedirectResponse
    {
        $this->authorizeEntry($journal);
        $this->assertEditable($journal);

        try {
            $this->journalService->updateDraft($journal, $request->validated());
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', 'Gagal memperbarui jurnal: ' . $e->getMessage());
        }

        return redirect()->route('journals.show', $journal->id)
            ->with('success', 'Jurnal berhasil diperbarui');
    }

    public function post(JournalEntry $journal): RedirectResponse
    {
        $this->authorizeEntry($journal);

        if ($journal->status !== TransactionStatus::Draft) {
            return back()->with('error', 'Hanya jurnal draft yang dapat diposting.');
        }

        try {
            $this->journalService->post($journal);
        } catch (\Throwable $e) {
            return back()->with('error', 'Gagal memposting jurnal: ' . $e->getMessage());
        }

        return redirect()->route('journals.show', $journal->id)
            ->with('success', 'Jurnal berhasil diposting');
    }

    public function void(JournalEntry $journal): RedirectResponse
    {
        $this->authorizeEntry($journal);

        if ($journal->status !== TransactionStatus::Posted) {
            return back()->with('error', 'Hanya jurnal yang sudah diposting yang dapat dibatalkan.');
        }

        $reason = request()->validate([
            'reason' => ['required', 'string', 'max:255'],
        ])['reason'];

        try {
            $this->journalService->voidEntry($journal, $reason);
        } catch (\Throwable $e) {
            return back()->with('error', 'Gagal membatalkan jurnal: ' . $e->getMessage());
        }

        return redirect()->route('journals.show', $journal->id)
            ->with('success', 'Jurnal berhasil dibatalkan (jurnal pembalikan dibuat otomatis)');
    }

    public function destroy(JournalEntry $journal): RedirectResponse
    {
        $this->authorizeEntry($journal);

        try {
            $this->journalService->deleteDraft($journal);
        } catch (\Throwable $e) {
            return back()->with('error', 'Gagal menghapus jurnal: ' . $e->getMessage());
        }

        return redirect()->route('journals.index')
            ->with('success', 'Jurnal draft berhasil dihapus');
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    protected function authorizeEntry(JournalEntry $entry): void
    {
        if ($entry->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }

    protected function assertEditable(JournalEntry $entry): void
    {
        if (! $entry->is_manual) {
            abort(403, 'Jurnal otomatis tidak dapat diedit.');
        }

        if ($entry->status !== TransactionStatus::Draft) {
            abort(403, 'Hanya jurnal draft yang dapat diedit.');
        }
    }

    protected function accountOptions(): array
    {
        $companyId = auth()->user()->current_company_id;

        return Account::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'type'])
            ->map(fn($a) => [
                'id'         => $a->id,
                'code'       => $a->code,
                'name'       => $a->name,
                'type'       => $a->type->value,
                'type_label' => $a->type->label(),
            ])
            ->toArray();
    }

    protected function serializeEntry(JournalEntry $entry): array
    {
        return [
            'id'           => $entry->id,
            'entry_number' => $entry->entry_number,
            'date'         => $entry->date->format('Y-m-d'),
            'description'  => $entry->description,
            'status'       => $entry->status->value,
            'status_label' => $entry->status->label(),
            'status_color' => $entry->status->color(),
            'is_manual'    => (bool) $entry->is_manual,
            'is_adjusting' => (bool) $entry->is_adjusting,
            'source_type'  => $entry->source_type,
            'source_label' => $entry->source_label,
            'source_id'    => $entry->source_id,
            'voided_at'    => $entry->voided_at?->format('Y-m-d H:i'),
            'void_reason'  => $entry->void_reason,
            'created_by'   => $entry->createdBy?->name,
            'created_at'   => $entry->created_at?->format('Y-m-d H:i'),
            'total_debit'  => (float) $entry->lines->sum('debit'),
            'total_credit' => (float) $entry->lines->sum('credit'),
            'lines'        => $entry->lines->map(fn($l) => [
                'account_id'   => $l->account_id,
                'account_code' => $l->account->code,
                'account_name' => $l->account->name,
                'description'  => $l->description,
                'debit'        => (float) $l->debit,
                'credit'       => (float) $l->credit,
            ])->values(),
        ];
    }
}
