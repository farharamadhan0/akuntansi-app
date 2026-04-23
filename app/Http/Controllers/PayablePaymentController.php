<?php

namespace App\Http\Controllers;

use App\Http\Requests\PayablePaymentRequest;
use App\Models\Payment;
use App\Models\Payable;
use App\Models\CashBankAccount;
use App\Services\PaymentService;
use App\Enums\PaymentType;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayablePaymentController extends Controller
{
    public function __construct(
        protected PaymentService $paymentService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $payments = Payment::where('company_id', $companyId)
            ->where('type', PaymentType::Payable)
            ->with(['supplier:id,name', 'cashBankAccount:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn(Payment $p) => [
                'id' => $p->id,
                'payment_number' => $p->payment_number,
                'supplier_name' => $p->supplier->name,
                'cash_bank_name' => $p->cashBankAccount->name,
                'date' => $p->date->format('Y-m-d'),
                'amount' => (float) $p->amount,
                'description' => $p->description,
                'status' => $p->status->value,
                'status_label' => $p->status->label(),
            ]);

        return Inertia::render('Payables/Payments/Index', [
            'payments' => $payments,
        ]);
    }

    public function create(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;

        $payables = Payable::where('company_id', $companyId)
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->with('supplier:id,name')
            ->orderBy('due_date')
            ->get()
            ->map(fn(Payable $p) => [
                'id' => $p->id,
                'payable_number' => $p->payable_number,
                'supplier_id' => $p->supplier_id,
                'supplier_name' => $p->supplier->name,
                'date' => $p->date->format('Y-m-d'),
                'due_date' => $p->due_date->format('Y-m-d'),
                'amount' => (float) $p->amount,
                'paid_amount' => (float) $p->paid_amount,
                'remaining_amount' => (float) $p->remaining_amount,
                'description' => $p->description,
                'is_overdue' => $p->isOverdue(),
            ]);

        $supplierId = $request->query('supplier_id');

        $cashBankAccounts = CashBankAccount::where('company_id', $companyId)
            ->active()
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        return Inertia::render('Payables/Payments/Create', [
            'payables' => $payables,
            'cashBankAccounts' => $cashBankAccounts,
            'preselectedSupplierId' => $supplierId ? (int) $supplierId : null,
        ]);
    }

    public function store(PayablePaymentRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $companyId = auth()->user()->current_company_id;

        $totalAmount = array_sum(array_column($validated['allocations'], 'amount'));

        $firstPayable = Payable::where('company_id', $companyId)
            ->find($validated['allocations'][0]['id']);

        if (!$firstPayable) {
            return back()->withInput()->with('error', 'Hutang tidak valid untuk perusahaan ini.');
        }

        try {
            $payment = $this->paymentService->createPayablePayment([
                'date' => $validated['date'],
                'amount' => $totalAmount,
                'description' => $validated['description'] ?? null,
                'cash_bank_account_id' => $validated['cash_bank_account_id'],
                'supplier_id' => $firstPayable->supplier_id,
                'reference' => $validated['reference'] ?? null,
                'allocations' => $validated['allocations'],
            ]);

            $this->paymentService->post($payment);

            return redirect()
                ->route('payable-payments.show', $payment)
                ->with('success', 'Pembayaran hutang berhasil dicatat.');
        } catch (\Exception $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(Payment $payment): Response
    {
        $companyId = auth()->user()->current_company_id;

        if ($payment->company_id !== $companyId || $payment->type !== PaymentType::Payable) {
            abort(403);
        }

        $payment->load([
            'supplier:id,name,code',
            'cashBankAccount:id,name,type',
            'allocations.allocatable',
            'createdBy:id,name',
        ]);

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

        return Inertia::render('Payables/Payments/Show', [
            'payment' => [
                'id' => $payment->id,
                'payment_number' => $payment->payment_number,
                'supplier' => $payment->supplier,
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
                    'payable_number' => $a->allocatable->payable_number,
                    'payable_id' => $a->allocatable->id,
                    'amount' => (float) $a->amount,
                ]),
            ],
            'journalEntries' => $journalEntries,
        ]);
    }

    public function void(Request $request, Payment $payment): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        if ($payment->company_id !== $companyId || $payment->type !== PaymentType::Payable) {
            abort(403);
        }

        $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->paymentService->void($payment, $request->reason);

            return redirect()
                ->route('payable-payments.show', $payment)
                ->with('success', 'Pembayaran berhasil dibatalkan.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
