<?php

namespace App\Http\Controllers;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Http\Requests\ExpenseTransactionRequest;
use App\Models\CashBankAccount;
use App\Models\Partner;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Services\ExpenseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseTransactionController extends Controller
{
    public function __construct(protected ExpenseService $expenseService) {}

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $transactions = Transaction::where('company_id', $companyId)
            ->ofType(TransactionType::Expense)
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
            ]);

        return Inertia::render('Transactions/Expense/Index', [
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
                'id'         => $a->id,
                'name'       => $a->name,
                'type'       => $a->type->value,
                'type_label' => $a->type->label(),
            ]);

        $categories = TransactionCategory::where('company_id', $companyId)
            ->expense()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        $partners = Partner::where('company_id', $companyId)
            ->active()
            ->supplier()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Transactions/Expense/Create', [
            'cashBankAccounts' => $cashBankAccounts,
            'categories'       => $categories,
            'partners'         => $partners,
            'defaultDate'      => now()->format('Y-m-d'),
        ]);
    }

    public function store(ExpenseTransactionRequest $request): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        $this->authorizeAccount($request->cash_bank_account_id, $companyId);

        try {
            DB::transaction(function () use ($request, $companyId) {
                $transaction = $this->expenseService->create(array_merge(
                    $request->validated(),
                    ['company_id' => $companyId]
                ));

                $this->expenseService->post($transaction);
            });
        } catch (\Throwable $e) {
            Log::error('Gagal mencatat uang keluar', [
                'user_id'    => auth()->id(),
                'company_id' => $companyId,
                'error'      => $e->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal menyimpan transaksi: ' . $e->getMessage());
        }

        return redirect()->route('expense.index')
            ->with('success', 'Uang keluar berhasil dicatat dan dijurnal');
    }

    public function show(Transaction $expense): Response
    {
        $this->authorizeTransaction($expense);

        $expense->load([
            'cashBankAccount:id,name,type',
            'category:id,name',
            'partner:id,name',
            'journalEntries.lines.account:id,code,name',
            'correctedBy:id,transaction_number',
            'corrects:id,transaction_number',
        ]);

        return Inertia::render('Transactions/Expense/Show', [
            'transaction' => [
                'id'                 => $expense->id,
                'transaction_number' => $expense->transaction_number,
                'date'               => $expense->date->format('Y-m-d'),
                'amount'             => (float) $expense->amount,
                'description'        => $expense->description,
                'reference'          => $expense->reference,
                'status'             => $expense->status->value,
                'status_label'       => $expense->status->label(),
                'status_color'       => $expense->status->color(),
                'cash_bank_name'     => $expense->cashBankAccount->name,
                'cash_bank_type'     => $expense->cashBankAccount->type->value,
                'category_name'      => $expense->category?->name,
                'partner_name'       => $expense->partner?->name,
                'posted_at'          => $expense->posted_at?->format('Y-m-d H:i'),
                'corrected_at'       => $expense->corrected_at?->format('Y-m-d H:i'),
                'corrected_by'       => $expense->correctedBy ? [
                    'id'                 => $expense->correctedBy->id,
                    'transaction_number' => $expense->correctedBy->transaction_number,
                ] : null,
                'corrects'           => $expense->corrects ? [
                    'id'                 => $expense->corrects->id,
                    'transaction_number' => $expense->corrects->transaction_number,
                ] : null,
                'journal_entries'    => $expense->journalEntries->map(fn($entry) => [
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

    public function void(Transaction $expense): RedirectResponse
    {
        $this->authorizeTransaction($expense);

        $reason = request()->validate([
            'reason' => ['required', 'string', 'max:255'],
        ])['reason'];

        $this->expenseService->void($expense, $reason);

        return redirect()->route('expense.index')
            ->with('success', 'Transaksi berhasil dibatalkan');
    }

    public function edit(Transaction $expense): Response
    {
        $this->authorizeTransaction($expense);

        if ($expense->status !== TransactionStatus::Posted) {
            abort(403, 'Hanya transaksi yang sudah diposting yang dapat dikoreksi.');
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
            ->expense()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        $partners = Partner::where('company_id', $companyId)
            ->active()
            ->supplier()
            ->orderBy('name')
            ->get(['id', 'name']);

        $expense->load(['partner:id,name', 'category:id,name', 'cashBankAccount:id,name,type']);

        return Inertia::render('Transactions/Expense/Edit', [
            'transaction' => [
                'id'                   => $expense->id,
                'transaction_number'   => $expense->transaction_number,
                'date'                 => $expense->date->format('Y-m-d'),
                'amount'               => (float) $expense->amount,
                'description'          => $expense->description,
                'reference'            => $expense->reference,
                'cash_bank_account_id' => $expense->cash_bank_account_id,
                'category_id'          => $expense->category_id,
                'partner_id'           => $expense->partner_id,
            ],
            'cashBankAccounts' => $cashBankAccounts,
            'categories'       => $categories,
            'partners'         => $partners,
        ]);
    }

    public function correct(ExpenseTransactionRequest $request, Transaction $expense): RedirectResponse
    {
        $this->authorizeTransaction($expense);

        $companyId = auth()->user()->current_company_id;
        $this->authorizeAccount($request->cash_bank_account_id, $companyId);

        try {
            DB::transaction(function () use ($request, $expense) {
                $this->expenseService->correct($expense, $request->validated());
            });
        } catch (\Throwable $e) {
            Log::error('Gagal mengoreksi uang keluar', [
                'user_id'        => auth()->id(),
                'company_id'     => $companyId,
                'transaction_id' => $expense->id,
                'error'          => $e->getMessage(),
            ]);

            return back()
                ->withInput()
                ->with('error', 'Gagal mengoreksi transaksi: ' . $e->getMessage());
        }

        return redirect()->route('expense.index')
            ->with('success', 'Transaksi berhasil dikoreksi');
    }

    protected function authorizeTransaction(Transaction $transaction): void
    {
        if ($transaction->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
        if ($transaction->type !== TransactionType::Expense) {
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
}
