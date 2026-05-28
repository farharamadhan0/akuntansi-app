<?php

namespace App\Http\Controllers;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Http\Requests\IncomeTransactionRequest;
use App\Models\CashBankAccount;
use App\Models\Partner;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Services\IncomeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class IncomeTransactionController extends Controller
{
    public function __construct(protected IncomeService $incomeService) {}

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $transactions = Transaction::where('company_id', $companyId)
            ->ofType(TransactionType::Income)
            ->with(['partner:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn(Transaction $t) => [
                'id'                   => $t->id,
                'transaction_number'   => $t->transaction_number,
                'date'                 => $t->date->format('Y-m-d'),
                'amount'               => (float) $t->amount,
                'description'          => $t->description,
                'reference'            => $t->reference,
                'status'               => $t->status->value,
                'status_label'         => $t->status->label(),
                'status_color'         => $t->status->color(),
                'partner_name'         => $t->partner?->name,
                'source_type'          => $t->source_type,
                'source_id'            => $t->source_id,
                'source_label'         => $this->resolveSourceLabel($t),
            ]);

        return Inertia::render('Transactions/Income/Index', [
            'transactions' => $transactions,
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $cashBankAccounts = CashBankAccount::where('company_id', $companyId)
            ->active()
            ->with('account:id,code,name')
            ->orderBy('type')
            ->orderBy('name')
            ->get()
            ->map(fn($a) => [
                'id'       => $a->id,
                'name'     => $a->name,
                'type'     => $a->type->value,
                'type_label' => $a->type->label(),
            ]);

        $categories = TransactionCategory::where('company_id', $companyId)
            ->income()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        $partners = Partner::where('company_id', $companyId)
            ->active()
            ->customer()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Transactions/Income/Create', [
            'cashBankAccounts' => $cashBankAccounts,
            'categories'       => $categories,
            'partners'         => $partners,
            'defaultDate'      => now()->format('Y-m-d'),
        ]);
    }

    public function store(IncomeTransactionRequest $request): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        $this->authorizeAccount($request->cash_bank_account_id, $companyId);

        try {
            DB::transaction(function () use ($request, $companyId) {
                $transaction = $this->incomeService->create(array_merge(
                    $request->validated(),
                    ['company_id' => $companyId]
                ));

                $this->incomeService->post($transaction);
            });
        } catch (\Throwable $e) {
            Log::error('Gagal mencatat uang masuk', [
                'user_id'    => auth()->id(),
                'company_id' => $companyId,
                'error'      => $e->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal menyimpan transaksi: ' . $e->getMessage());
        }

        return redirect()->route('income.index')
            ->with('success', 'Uang masuk berhasil dicatat dan dijurnal');
    }

    public function show(Transaction $income): Response
    {
        $this->authorizeTransaction($income);

        $income->load([
            'cashBankAccount:id,name,type',
            'category:id,name',
            'partner:id,name',
            'journalEntries.lines.account:id,code,name',
            'correctedBy:id,transaction_number',
            'corrects:id,transaction_number',
        ]);

        return Inertia::render('Transactions/Income/Show', [
            'transaction' => [
                'id'                 => $income->id,
                'transaction_number' => $income->transaction_number,
                'date'               => $income->date->format('Y-m-d'),
                'amount'             => (float) $income->amount,
                'description'        => $income->description,
                'reference'          => $income->reference,
                'status'             => $income->status->value,
                'status_label'       => $income->status->label(),
                'status_color'       => $income->status->color(),
                'cash_bank_name'     => $income->cashBankAccount->name,
                'cash_bank_type'     => $income->cashBankAccount->type->value,
                'category_name'      => $income->category?->name,
                'partner_name'       => $income->partner?->name,
                'posted_at'          => $income->posted_at?->format('Y-m-d H:i'),
                'corrected_at'       => $income->corrected_at?->format('Y-m-d H:i'),
                'corrected_by'       => $income->correctedBy ? [
                    'id'                 => $income->correctedBy->id,
                    'transaction_number' => $income->correctedBy->transaction_number,
                ] : null,
                'corrects'           => $income->corrects ? [
                    'id'                 => $income->corrects->id,
                    'transaction_number' => $income->corrects->transaction_number,
                ] : null,
                'source_type'        => $income->source_type,
                'source_id'          => $income->source_id,
                'source_label'       => $this->resolveSourceLabel($income),
                'source_url'         => $this->resolveSourceUrl($income),
                'journal_entries'    => $income->journalEntries->map(fn($entry) => [
                    'entry_number' => $entry->entry_number,
                    'date'         => $entry->date->format('Y-m-d'),
                    'lines'        => $entry->lines->map(fn($line) => [
                        'account_code' => $line->account->code,
                        'account_name' => $line->account->name,
                        'debit'        => (float) $line->debit,
                        'credit'       => (float) $line->credit,
                    ]),
                ]),
            ],
        ]);
    }

    public function void(Transaction $income): RedirectResponse
    {
        $this->authorizeTransaction($income);

        if ($income->source_type) {
            return back()->with('error', 'Transaksi ini berasal dari penjualan/penerimaan piutang. Lakukan pembatalan dari halaman sumbernya.');
        }

        $reason = request()->validate([
            'reason' => ['required', 'string', 'max:255'],
        ])['reason'];

        $this->incomeService->void($income, $reason);

        return redirect()->route('income.index')
            ->with('success', 'Transaksi berhasil dibatalkan');
    }

    public function edit(Transaction $income): Response
    {
        $this->authorizeTransaction($income);

        if ($income->status !== TransactionStatus::Posted) {
            abort(403, 'Hanya transaksi yang sudah diposting yang dapat dikoreksi.');
        }

        if ($income->source_type) {
            abort(403, 'Transaksi ini berasal dari penjualan/penerimaan piutang. Lakukan koreksi dari halaman sumbernya.');
        }

        $companyId = auth()->user()->current_company_id;

        $cashBankAccounts = CashBankAccount::where('company_id', $companyId)
            ->active()
            ->with('account:id,code,name')
            ->orderBy('type')
            ->orderBy('name')
            ->get()
            ->map(fn($a) => [
                'id'         => $a->id,
                'name'       => $a->name,
                'type'       => $a->type->value,
                'type_label' => $a->type->label(),
            ]);

        $categories = TransactionCategory::where('company_id', $companyId)
            ->income()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        $partners = Partner::where('company_id', $companyId)
            ->active()
            ->customer()
            ->orderBy('name')
            ->get(['id', 'name']);

        $income->load(['partner:id,name', 'category:id,name', 'cashBankAccount:id,name,type']);

        return Inertia::render('Transactions/Income/Edit', [
            'transaction' => [
                'id'                   => $income->id,
                'transaction_number'   => $income->transaction_number,
                'date'                 => $income->date->format('Y-m-d'),
                'amount'               => (float) $income->amount,
                'description'          => $income->description,
                'reference'            => $income->reference,
                'cash_bank_account_id' => $income->cash_bank_account_id,
                'category_id'          => $income->category_id,
                'partner_id'           => $income->partner_id,
            ],
            'cashBankAccounts' => $cashBankAccounts,
            'categories'       => $categories,
            'partners'         => $partners,
            'defaultDate'      => now()->format('Y-m-d'),
        ]);
    }

    public function correct(IncomeTransactionRequest $request, Transaction $income): RedirectResponse
    {
        $this->authorizeTransaction($income);

        $companyId = auth()->user()->current_company_id;
        $this->authorizeAccount($request->cash_bank_account_id, $companyId);

        try {
            DB::transaction(function () use ($request, $income) {
                $this->incomeService->correct($income, $request->validated());
            });
        } catch (\Throwable $e) {
            Log::error('Gagal mengoreksi uang masuk', [
                'user_id'        => auth()->id(),
                'company_id'     => $companyId,
                'transaction_id' => $income->id,
                'error'          => $e->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal mengoreksi transaksi: ' . $e->getMessage());
        }

        return redirect()->route('income.index')
            ->with('success', 'Transaksi berhasil dikoreksi');
    }

    protected function authorizeTransaction(Transaction $transaction): void
    {
        if ($transaction->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
        if ($transaction->type !== TransactionType::Income) {
            abort(404);
        }
    }

    protected function authorizeAccount(int $cashBankAccountId, int $companyId): void
    {
        $exists = CashBankAccount::where('id', $cashBankAccountId)
            ->where('company_id', $companyId)
            ->exists();

        if (!$exists) {
            abort(403, 'Akun kas/bank tidak valid untuk perusahaan ini.');
        }
    }

    protected function resolveSourceLabel(Transaction $transaction): ?string
    {
        if (! $transaction->source_type || ! $transaction->source_id) {
            return null;
        }

        if ($transaction->source_type === Sale::class) {
            $sale = Sale::find($transaction->source_id);
            return $sale ? 'Penjualan: ' . $sale->sale_number : null;
        }

        if ($transaction->source_type === Payment::class) {
            $payment = Payment::find($transaction->source_id);
            return $payment ? 'Penerimaan Piutang: ' . $payment->payment_number : null;
        }

        return null;
    }

    protected function resolveSourceUrl(Transaction $transaction): ?string
    {
        if (! $transaction->source_type || ! $transaction->source_id) {
            return null;
        }

        if ($transaction->source_type === Sale::class) {
            return route('sales.show', $transaction->source_id);
        }

        if ($transaction->source_type === Payment::class) {
            return route('receivable-payments.show', $transaction->source_id);
        }

        return null;
    }
}
