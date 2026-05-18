<?php

namespace App\Http\Controllers;

use App\Enums\TransactionType;
use App\Http\Requests\IncomeTransactionRequest;
use App\Models\CashBankAccount;
use App\Models\Customer;
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
            ->with(['customer:id,name'])
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
                'customer_name'        => $t->customer?->name,
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

        $customers = Customer::where('company_id', $companyId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Transactions/Income/Create', [
            'cashBankAccounts' => $cashBankAccounts,
            'categories'       => $categories,
            'customers'        => $customers,
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
            'customer:id,name',
            'journalEntries.lines.account:id,code,name',
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
                'customer_name'      => $income->customer?->name,
                'posted_at'          => $income->posted_at?->format('Y-m-d H:i'),
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

        $reason = request()->validate([
            'reason' => ['required', 'string', 'max:255'],
        ])['reason'];

        $this->incomeService->void($income, $reason);

        return redirect()->route('income.index')
            ->with('success', 'Transaksi berhasil dibatalkan');
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
}
