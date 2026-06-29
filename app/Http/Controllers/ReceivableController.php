<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReceivableRequest;
use App\Models\Receivable;
use App\Models\Partner;
use App\Models\TransactionCategory;
use App\Services\ReceivableService;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReceivableController extends Controller
{
    public function __construct(
        protected ReceivableService $receivableService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $baseQuery = Receivable::where('company_id', $companyId);

        $summary = (object) [
            'totalOutstanding'  => (float) (clone $baseQuery)
                ->where('status', TransactionStatus::Posted)
                ->where('payment_status', '!=', PaymentStatus::Paid)
                ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total')
                ->value('total'),
            'totalOverdue'      => (float) (clone $baseQuery)
                ->where('status', TransactionStatus::Posted)
                ->where('payment_status', '!=', PaymentStatus::Paid)
                ->where('due_date', '<', now()->toDateString())
                ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total')
                ->value('total'),
            'count_all'         => (clone $baseQuery)
                ->where('status', '!=', TransactionStatus::Corrected)
                ->count(),
            'count_outstanding' => (clone $baseQuery)
                ->where('status', TransactionStatus::Posted)
                ->where('payment_status', '!=', PaymentStatus::Paid)
                ->count(),
            'count_overdue'     => (clone $baseQuery)
                ->where('status', TransactionStatus::Posted)
                ->where('payment_status', '!=', PaymentStatus::Paid)
                ->where('due_date', '<', now()->toDateString())
                ->count(),
            'count_paid'        => (clone $baseQuery)
                ->where('status', '!=', TransactionStatus::Corrected)
                ->where('payment_status', PaymentStatus::Paid)
                ->count(),
        ];

        $statusFilter = $request->query('status', 'outstanding');
        $statusFilter = in_array($statusFilter, ['all', 'outstanding', 'overdue', 'paid'])
            ? $statusFilter
            : 'outstanding';
        match ($statusFilter) {
            'all' => $baseQuery->where('status', '!=', TransactionStatus::Corrected),
            'overdue' => $baseQuery
                ->where('status', TransactionStatus::Posted)
                ->where('payment_status', '!=', PaymentStatus::Paid)
                ->where('due_date', '<', now()->toDateString()),
            'paid' => $baseQuery
                ->where('status', '!=', TransactionStatus::Corrected)
                ->where('payment_status', PaymentStatus::Paid),
            default => $baseQuery
                ->where('status', TransactionStatus::Posted)
                ->where('payment_status', '!=', PaymentStatus::Paid),
        };

        $perPage = (int) $request->query('per_page', 25);
        $perPage = in_array($perPage, [10, 25, 50, 100]) ? $perPage : 25;

        $receivables = $baseQuery
            ->with(['partner:id,name', 'category:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn(Receivable $r) => [
            'id' => $r->id,
            'receivable_number' => $r->receivable_number,
            'partner_name' => $r->partner->name,
            'date' => $r->date->format('Y-m-d'),
            'due_date' => $r->due_date->format('Y-m-d'),
            'amount' => (float) $r->amount,
            'paid_amount' => (float) $r->paid_amount,
            'remaining_amount' => (float) $r->remaining_amount,
            'description' => $r->description,
            'status' => $r->status->value,
            'status_label' => $r->status->label(),
            'payment_status' => $r->payment_status->value,
            'payment_status_label' => $r->payment_status->label(),
            'is_overdue' => $r->isOverdue(),
        ]);

        return Inertia::render('Receivables/Index', [
            'receivables' => $receivables,
            'summary' => $summary,
            'filters' => ['status' => $statusFilter, 'per_page' => $perPage],
            'prerequisites' => [
                'hasCustomers' => Partner::where('company_id', $companyId)
                    ->active()
                    ->customer()
                    ->exists(),
            ],
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $partners = Partner::where('company_id', $companyId)
            ->active()
            ->customer()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $categories = TransactionCategory::where('company_id', $companyId)
            ->where('type', 'income')
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Receivables/Create', [
            'partners' => $partners,
            'categories' => $categories,
        ]);
    }

    public function store(ReceivableRequest $request): RedirectResponse
    {
        try {
            $receivable = $this->receivableService->create($request->validated());
            $this->receivableService->post($receivable);

            return redirect()
                ->route('receivables.show', $receivable)
                ->with('success', 'Piutang berhasil dicatat.');
        } catch (\Exception $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(Receivable $receivable): Response
    {
        $companyId = auth()->user()->current_company_id;

        if ($receivable->company_id !== $companyId) {
            abort(403);
        }

        $receivable->load([
            'partner:id,name,code,phone,email',
            'category:id,name',
            'createdBy:id,name',
            'correctedBy:id,receivable_number',
            'corrects:id,receivable_number',
        ]);

        // Get journal entries
        $journalEntries = $receivable->journalEntries()
            ->with(['lines.account:id,code,name'])
            ->orderByDesc('date')
            ->get()
            ->map(fn($entry) => [
                'entry_number' => $entry->entry_number,
                'date' => $entry->date->format('Y-m-d'),
                'description' => $entry->description,
                'status' => $entry->status->value,
                'lines' => $entry->lines->map(fn($line) => [
                    'account_code' => $line->account->code,
                    'account_name' => $line->account->name,
                    'debit' => (float) $line->debit,
                    'credit' => (float) $line->credit,
                ]),
            ]);

        return Inertia::render('Receivables/Show', [
            'receivable' => [
                'id' => $receivable->id,
                'receivable_number' => $receivable->receivable_number,
                'partner' => $receivable->partner,
                'category_name' => $receivable->category?->name,
                'date' => $receivable->date->format('Y-m-d'),
                'due_date' => $receivable->due_date->format('Y-m-d'),
                'amount' => (float) $receivable->amount,
                'paid_amount' => (float) $receivable->paid_amount,
                'remaining_amount' => (float) $receivable->remaining_amount,
                'description' => $receivable->description,
                'reference' => $receivable->reference,
                'status' => $receivable->status->value,
                'status_label' => $receivable->status->label(),
                'payment_status' => $receivable->payment_status->value,
                'payment_status_label' => $receivable->payment_status->label(),
                'is_overdue' => $receivable->isOverdue(),
                'posted_at' => $receivable->posted_at?->format('Y-m-d H:i'),
                'voided_at' => $receivable->voided_at?->format('Y-m-d H:i'),
                'void_reason' => $receivable->void_reason,
                'corrected_at' => $receivable->corrected_at?->format('Y-m-d H:i'),
                'corrected_by' => $receivable->correctedBy ? [
                    'id' => $receivable->correctedBy->id,
                    'receivable_number' => $receivable->correctedBy->receivable_number,
                ] : null,
                'corrects' => $receivable->corrects ? [
                    'id' => $receivable->corrects->id,
                    'receivable_number' => $receivable->corrects->receivable_number,
                ] : null,
                'created_by_name' => $receivable->createdBy?->name,
            ],
            'journalEntries' => $journalEntries,
        ]);
    }

    public function void(Request $request, Receivable $receivable): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        if ($receivable->company_id !== $companyId) {
            abort(403);
        }

        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->receivableService->void($receivable, $request->reason);

            return redirect()
                ->route('receivables.show', $receivable)
                ->with('success', 'Piutang berhasil dibatalkan.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function edit(Receivable $receivable): Response
    {
        $companyId = auth()->user()->current_company_id;

        if ($receivable->company_id !== $companyId) {
            abort(403);
        }

        if ($receivable->status !== TransactionStatus::Posted) {
            abort(403, 'Hanya piutang yang sudah diposting yang dapat dikoreksi.');
        }

        $partners = Partner::where('company_id', $companyId)
            ->active()
            ->customer()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $categories = TransactionCategory::where('company_id', $companyId)
            ->where('type', 'income')
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        $receivable->load(['partner:id,name', 'category:id,name']);

        return Inertia::render('Receivables/Edit', [
            'receivable' => [
                'id' => $receivable->id,
                'receivable_number' => $receivable->receivable_number,
                'partner_id' => $receivable->partner_id,
                'date' => $receivable->date->format('Y-m-d'),
                'due_date' => $receivable->due_date->format('Y-m-d'),
                'amount' => (float) $receivable->amount,
                'paid_amount' => (float) $receivable->paid_amount,
                'description' => $receivable->description,
                'category_id' => $receivable->category_id,
                'reference' => $receivable->reference,
            ],
            'partners' => $partners,
            'categories' => $categories,
        ]);
    }

    public function correct(ReceivableRequest $request, Receivable $receivable): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        if ($receivable->company_id !== $companyId) {
            abort(403);
        }

        try {
            $newReceivable = $this->receivableService->correct($receivable, $request->validated());

            return redirect()
                ->route('receivables.show', $newReceivable)
                ->with('success', 'Piutang berhasil dikoreksi.');
        } catch (\Exception $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }
}
