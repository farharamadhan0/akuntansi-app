<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReceivablePaymentRequest;
use App\Models\Payment;
use App\Models\Receivable;
use App\Models\CashBankAccount;
use App\Services\PaymentService;
use App\Enums\PaymentType;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReceivablePaymentController extends Controller
{
    public function __construct(
        protected PaymentService $paymentService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $payments = Payment::where('company_id', $companyId)
            ->where('type', PaymentType::Receivable)
            ->with(['customer:id,name', 'cashBankAccount:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn(Payment $p) => [
                'id' => $p->id,
                'payment_number' => $p->payment_number,
                'customer_name' => $p->customer->name,
                'cash_bank_name' => $p->cashBankAccount->name,
                'date' => $p->date->format('Y-m-d'),
                'amount' => (float) $p->amount,
                'description' => $p->description,
                'status' => $p->status->value,
                'status_label' => $p->status->label(),
            ]);

        return Inertia::render('Receivables/Payments/Index', [
            'payments' => $payments,
        ]);
    }

    public function create(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        // Get outstanding receivables
        $receivables = Receivable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->with('customer:id,name')
            ->orderBy('due_date')
            ->get()
            ->map(fn(Receivable $r) => [
                'id' => $r->id,
                'receivable_number' => $r->receivable_number,
                'customer_id' => $r->customer_id,
                'customer_name' => $r->customer->name,
                'date' => $r->date->format('Y-m-d'),
                'due_date' => $r->due_date->format('Y-m-d'),
                'amount' => (float) $r->amount,
                'paid_amount' => (float) $r->paid_amount,
                'remaining_amount' => (float) $r->remaining_amount,
                'description' => $r->description,
                'is_overdue' => $r->isOverdue(),
            ]);

        // Filter by customer if specified
        $customerId = $request->query('customer_id');

        $cashBankAccounts = CashBankAccount::where('company_id', $companyId)
            ->active()
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        return Inertia::render('Receivables/Payments/Create', [
            'receivables' => $receivables,
            'cashBankAccounts' => $cashBankAccounts,
            'preselectedCustomerId' => $customerId ? (int) $customerId : null,
        ]);
    }

    public function store(ReceivablePaymentRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Calculate total from allocations
        $totalAmount = array_sum(array_column($validated['allocations'], 'amount'));

        // Get customer from first allocation
        $firstReceivable = Receivable::find($validated['allocations'][0]['id']);

        try {
            $payment = $this->paymentService->createReceivablePayment([
                'date' => $validated['date'],
                'amount' => $totalAmount,
                'description' => $validated['description'] ?? null,
                'cash_bank_account_id' => $validated['cash_bank_account_id'],
                'customer_id' => $firstReceivable->customer_id,
                'reference' => $validated['reference'] ?? null,
                'allocations' => $validated['allocations'],
            ]);

            $this->paymentService->post($payment);

            return redirect()
                ->route('receivable-payments.show', $payment)
                ->with('success', 'Pembayaran piutang berhasil dicatat.');
        } catch (\Exception $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(Payment $payment): Response
    {
        $companyId = auth()->user()->current_company_id;

        if ($payment->company_id !== $companyId || $payment->type !== PaymentType::Receivable) {
            abort(403);
        }

        $payment->load([
            'customer:id,name,code',
            'cashBankAccount:id,name,type',
            'allocations.allocatable',
            'createdBy:id,name',
        ]);

        // Get journal entries
        $journalEntries = $payment->journalEntries()
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

        return Inertia::render('Receivables/Payments/Show', [
            'payment' => [
                'id' => $payment->id,
                'payment_number' => $payment->payment_number,
                'customer' => $payment->customer,
                'cash_bank_name' => $payment->cashBankAccount->name,
                'date' => $payment->date->format('Y-m-d'),
                'amount' => (float) $payment->amount,
                'description' => $payment->description,
                'reference' => $payment->reference,
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'posted_at' => $payment->posted_at?->format('Y-m-d H:i'),
                'voided_at' => $payment->voided_at?->format('Y-m-d H:i'),
                'void_reason' => $payment->void_reason,
                'created_by_name' => $payment->createdBy?->name,
                'allocations' => $payment->allocations->map(fn($a) => [
                    'receivable_number' => $a->allocatable->receivable_number,
                    'receivable_id' => $a->allocatable->id,
                    'amount' => (float) $a->amount,
                ]),
            ],
            'journalEntries' => $journalEntries,
        ]);
    }

    public function void(Request $request, Payment $payment): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        if ($payment->company_id !== $companyId || $payment->type !== PaymentType::Receivable) {
            abort(403);
        }

        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->paymentService->void($payment, $request->reason);

            return redirect()
                ->route('receivable-payments.show', $payment)
                ->with('success', 'Pembayaran berhasil dibatalkan.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
