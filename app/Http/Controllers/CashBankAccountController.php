<?php

namespace App\Http\Controllers;

use App\Models\CashBankAccount;
use App\Models\Account;
use App\Enums\CashBankType;
use App\Http\Requests\CashBankAccountRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CashBankAccountController extends Controller
{
    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $accounts = CashBankAccount::where('company_id', $companyId)
            ->with('account:id,code,name')
            ->orderBy('type')
            ->orderBy('name')
            ->get()
            ->map(fn($acc) => [
                'id' => $acc->id,
                'name' => $acc->name,
                'type' => $acc->type->value,
                'type_label' => $acc->type->label(),
                'bank_name' => $acc->bank_name,
                'account_number' => $acc->account_number,
                'opening_balance' => (float) $acc->opening_balance,
                'is_active' => $acc->is_active,
                'account_code' => $acc->account->code,
            ]);

        return Inertia::render('MasterData/CashBank/Index', [
            'accounts' => $accounts,
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
        ]);
    }

    public function store(CashBankAccountRequest $request): RedirectResponse
    {
        $companyId = auth()->user()->current_company_id;

        CashBankAccount::create([
            'company_id' => $companyId,
            'account_id' => $request->account_id,
            'name' => $request->name,
            'type' => $request->type,
            'bank_name' => $request->bank_name,
            'account_number' => $request->account_number,
            'opening_balance' => $request->opening_balance ?? 0,
            'opening_balance_date' => $request->opening_balance_date ?? now()->startOfMonth(),
            'is_active' => true,
        ]);

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

        return Inertia::render('MasterData/CashBank/Form', [
            'cashBank' => [
                'id' => $cashBank->id,
                'account_id' => $cashBank->account_id,
                'name' => $cashBank->name,
                'type' => $cashBank->type->value,
                'bank_name' => $cashBank->bank_name,
                'account_number' => $cashBank->account_number,
                'opening_balance' => (float) $cashBank->opening_balance,
                'opening_balance_date' => $cashBank->opening_balance_date?->format('Y-m-d'),
            ],
            'ledgerAccounts' => $ledgerAccounts,
            'types' => collect(CashBankType::cases())->map(fn($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ]),
        ]);
    }

    public function update(CashBankAccountRequest $request, CashBankAccount $cashBank): RedirectResponse
    {
        $this->authorizeCompany($cashBank);

        $cashBank->update([
            'account_id' => $request->account_id,
            'name' => $request->name,
            'type' => $request->type,
            'bank_name' => $request->bank_name,
            'account_number' => $request->account_number,
            'opening_balance' => $request->opening_balance ?? 0,
            'opening_balance_date' => $request->opening_balance_date,
        ]);

        return redirect()->route('cash-bank.index')
            ->with('success', 'Akun kas/bank berhasil diperbarui');
    }

    public function destroy(CashBankAccount $cashBank): RedirectResponse
    {
        $this->authorizeCompany($cashBank);

        if ($cashBank->transactions()->exists()) {
            return back()->with('error', 'Tidak dapat menghapus akun yang sudah memiliki transaksi');
        }

        $cashBank->delete();

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
            abort(403);
        }
    }
}
