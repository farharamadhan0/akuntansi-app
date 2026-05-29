<?php

namespace App\Http\Controllers;

use App\Models\CashBankAccount;
use App\Models\Account;
use App\Enums\CashBankType;
use App\Http\Requests\CashBankAccountRequest;
use App\Services\AccountBalanceService;
use App\Services\CashBankAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashBankAccountController extends Controller
{
    public function __construct(
        protected CashBankAccountService $service,
        protected AccountBalanceService $balanceService,
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $accounts = CashBankAccount::where('company_id', $companyId)
            ->with('account:id,code,name')
            ->orderBy('type')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn ($acc) => [
                'id' => $acc->id,
                'name' => $acc->name,
                'type' => $acc->type->value,
                'type_label' => $acc->type->label(),
                'bank_name' => $acc->bank_name,
                'account_number' => $acc->account_number,
                'current_balance' => $this->balanceService->getBalance($acc->account_id),
                'is_active' => $acc->is_active,
                'account_code' => $acc->account->code,
            ]);

        return Inertia::render('MasterData/CashBank/Index', [
            'accounts' => $accounts,
            'filters' => [
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $ledgerAccounts = Account::where('company_id', $companyId)
            ->whereIn('subtype', ['cash', 'bank'])
            ->active()
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'subtype']);

        return Inertia::render('MasterData/CashBank/Form', [
            'ledgerAccounts' => $ledgerAccounts,
            'types' => collect(CashBankType::cases())->map(fn($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
            'canEditOpeningBalance' => true,
            'openingBalance' => 0,
            'openingBalanceDate' => null,
        ]);
    }

    public function store(CashBankAccountRequest $request): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        $this->service->create(
            $companyId,
            $request->only(['account_id', 'name', 'type', 'bank_name', 'account_number']),
            $request->filled('opening_balance') ? (float) $request->opening_balance : null,
            $request->filled('opening_balance_date') ? $request->opening_balance_date : null,
        );

        return redirect()->route('cash-bank.index')
            ->with('success', 'Akun kas/bank berhasil ditambahkan');
    }

    public function edit(CashBankAccount $cashBank): Response
    {
        $this->authorizeCompany($cashBank);

        $companyId = auth()->user()->current_company_id;

        $ledgerAccounts = Account::where('company_id', $companyId)
            ->whereIn('subtype', ['cash', 'bank'])
            ->active()
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'subtype']);

        $opening = $this->service->getOpeningBalance($cashBank);
        $canEditOpeningBalance = ! $this->service->hasUserTransactions($cashBank);

        return Inertia::render('MasterData/CashBank/Form', [
            'cashBank' => [
                'id' => $cashBank->id,
                'account_id' => $cashBank->account_id,
                'name' => $cashBank->name,
                'type' => $cashBank->type->value,
                'bank_name' => $cashBank->bank_name,
                'account_number' => $cashBank->account_number,
            ],
            'ledgerAccounts' => $ledgerAccounts,
            'types' => collect(CashBankType::cases())->map(fn($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
            'canEditOpeningBalance' => $canEditOpeningBalance,
            'openingBalance' => $opening['amount'],
            'openingBalanceDate' => $opening['date'],
        ]);
    }

    public function update(CashBankAccountRequest $request, CashBankAccount $cashBank): RedirectResponse
    {
        $this->authorizeCompany($cashBank);

        $this->service->update(
            $cashBank,
            $request->only(['account_id', 'name', 'type', 'bank_name', 'account_number']),
            $request->filled('opening_balance') ? (float) $request->opening_balance : null,
            $request->filled('opening_balance_date') ? $request->opening_balance_date : null,
        );

        return redirect()->route('cash-bank.index')
            ->with('success', 'Akun kas/bank berhasil diperbarui');
    }

    public function destroy(CashBankAccount $cashBank): RedirectResponse
    {
        $this->authorizeCompany($cashBank);

        if ($this->service->hasUserTransactions($cashBank)) {
            return back()->with('error', 'Tidak dapat menghapus akun yang sudah memiliki transaksi');
        }

        $this->service->destroy($cashBank);

        return redirect()->route('cash-bank.index')
            ->with('success', 'Akun kas/bank berhasil dihapus');
    }

    public function toggleActive(CashBankAccount $cashBank): RedirectResponse
    {
        $this->authorizeCompany($cashBank);

        $cashBank->update(['is_active' => !$cashBank->is_active]);

        $status = $cashBank->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Akun kas/bank berhasil {$status}");
    }

    protected function authorizeCompany(CashBankAccount $cashBank): void
    {
        if ($cashBank->company_id !== auth()->user()->current_company_id) {
            abort(404);
        }
    }
}
