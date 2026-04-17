<?php

namespace App\Http\Controllers;

use App\Http\Requests\PayableRequest;
use App\Models\Payable;
use App\Models\Supplier;
use App\Models\TransactionCategory;
use App\Services\PayableService;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayableController extends Controller
{
    public function __construct(
        protected PayableService $payableService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $query = Payable::where('company_id', $companyId)
            ->with(['supplier:id,name', 'category:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        $payables = $query->get()->map(fn(Payable $p) => [
            'id' => $p->id,
            'payable_number' => $p->payable_number,
            'supplier_name' => $p->supplier->name,
            'date' => $p->date->format('Y-m-d'),
            'due_date' => $p->due_date->format('Y-m-d'),
            'amount' => (float) $p->amount,
            'paid_amount' => (float) $p->paid_amount,
            'remaining_amount' => (float) $p->remaining_amount,
            'description' => $p->description,
            'status' => $p->status->value,
            'status_label' => $p->status->label(),
            'payment_status' => $p->payment_status->value,
            'payment_status_label' => $p->payment_status->label(),
            'is_overdue' => $p->isOverdue(),
        ]);

        $totalOutstanding = Payable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total')
            ->value('total');

        $totalOverdue = Payable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->where('due_date', '<', now()->toDateString())
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) as total')
            ->value('total');

        return Inertia::render('Payables/Index', [
            'payables' => $payables,
            'summary' => [
                'totalOutstanding' => (float) $totalOutstanding,
                'totalOverdue' => (float) $totalOverdue,
            ],
            'filters' => $request->only(['status', 'payment_status']),
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $suppliers = Supplier::where('company_id', $companyId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $categories = TransactionCategory::where('company_id', $companyId)
            ->where('type', 'expense')
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Payables/Create', [
            'suppliers' => $suppliers,
            'categories' => $categories,
        ]);
    }

    public function store(PayableRequest $request): RedirectResponse
    {
        try {
            $payable = $this->payableService->create($request->validated());
            $this->payableService->post($payable);

            return redirect()
                ->route('payables.show', $payable)
                ->with('success', 'Hutang berhasil dicatat.');
        } catch (\Exception $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(Payable $payable): Response
    {
        $companyId = auth()->user()->current_company_id;

        if ($payable->company_id !== $companyId) {
            abort(403);
        }

        $payable->load(['supplier:id,name,code,phone,email', 'category:id,name', 'createdBy:id,name']);

        $journalEntries = $payable->journalEntries()
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

        return Inertia::render('Payables/Show', [
            'payable' => [
                'id' => $payable->id,
                'payable_number' => $payable->payable_number,
                'supplier' => $payable->supplier,
                'category_name' => $payable->category?->name,
                'date' => $payable->date->format('Y-m-d'),
                'due_date' => $payable->due_date->format('Y-m-d'),
                'amount' => (float) $payable->amount,
                'paid_amount' => (float) $payable->paid_amount,
                'remaining_amount' => (float) $payable->remaining_amount,
                'description' => $payable->description,
                'reference' => $payable->reference,
                'status' => $payable->status->value,
                'status_label' => $payable->status->label(),
                'payment_status' => $payable->payment_status->value,
                'payment_status_label' => $payable->payment_status->label(),
                'is_overdue' => $payable->isOverdue(),
                'posted_at' => $payable->posted_at?->format('Y-m-d H:i'),
                'voided_at' => $payable->voided_at?->format('Y-m-d H:i'),
                'void_reason' => $payable->void_reason,
                'created_by_name' => $payable->createdBy?->name,
            ],
            'journalEntries' => $journalEntries,
        ]);
    }

    public function void(Request $request, Payable $payable): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        if ($payable->company_id !== $companyId) {
            abort(403);
        }

        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->payableService->void($payable, $request->reason);

            return redirect()
                ->route('payables.show', $payable)
                ->with('success', 'Hutang berhasil dibatalkan.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
