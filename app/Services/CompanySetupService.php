<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use App\Models\Role;
use App\Models\CompanyUser;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\TransactionCategory;
use App\Models\FiscalPeriod;
use App\Enums\AccountType;
use App\Enums\CashBankType;
use Illuminate\Support\Facades\DB;

class CompanySetupService
{
    public function createCompany(array $data, User $owner): Company
    {
        return DB::transaction(function () use ($data, $owner) {
            $company = Company::create([
                'name' => $data['name'],
                'legal_name' => $data['legal_name'] ?? $data['name'],
                'tax_id' => $data['tax_id'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'currency' => $data['currency'] ?? 'IDR',
                'timezone' => $data['timezone'] ?? 'Asia/Jakarta',
                'fiscal_year_start' => $data['fiscal_year_start'] ?? 1,
                'settings' => $data['settings'] ?? [],
            ]);

            $this->createDefaultRoles($company);
            $this->assignOwner($company, $owner);
            $this->createDefaultChartOfAccounts($company);
            $this->createDefaultCashAccount($company);
            $this->createDefaultCategories($company);
            $this->createCurrentFiscalPeriod($company);

            $owner->update(['current_company_id' => $company->id]);

            return $company;
        });
    }

    protected function createDefaultRoles(Company $company): void
    {
        Role::create([
            'company_id' => $company->id,
            'name' => 'Owner',
            'permissions' => ['*'],
            'is_system' => true,
        ]);

        Role::create([
            'company_id' => $company->id,
            'name' => 'Admin',
            'permissions' => [
                'dashboard.view',
                'income.view', 'income.create', 'income.edit', 'income.delete',
                'expense.view', 'expense.create', 'expense.edit', 'expense.delete',
                'receivables.view', 'receivables.create', 'receivables.edit', 'receivables.delete',
                'payables.view', 'payables.create', 'payables.edit', 'payables.delete',
                'journals.view', 'journals.create', 'journals.edit', 'journals.delete',
                'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
                'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
                'cash_bank.view', 'cash_bank.create', 'cash_bank.edit', 'cash_bank.delete',
                'accounts.view', 'accounts.create', 'accounts.edit', 'accounts.delete',
                'products.view', 'products.create', 'products.edit', 'products.delete',
                'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.delete',
                'sales.view', 'sales.create', 'sales.edit', 'sales.delete',
                'inventory_adjustments.view', 'inventory_adjustments.create', 'inventory_adjustments.edit', 'inventory_adjustments.delete',
                'reports.transactions', 'reports.receivables', 'reports.payables',
                'reports.general_ledger', 'reports.income_statement',
                'reports.balance_sheet', 'reports.cash_flow',
            ],
            'is_system' => true,
        ]);

        Role::create([
            'company_id' => $company->id,
            'name' => 'Staff',
            'permissions' => [
                'dashboard.view',
                'income.view', 'income.create',
                'expense.view', 'expense.create',
                'receivables.view',
                'payables.view',
                'customers.view',
                'suppliers.view',
                'cash_bank.view',
                'accounts.view',
                'products.view',
                'purchases.view', 'purchases.create',
                'sales.view', 'sales.create',
                'inventory_adjustments.view', 'inventory_adjustments.create',
            ],
            'is_system' => true,
        ]);
    }

    protected function assignOwner(Company $company, User $owner): void
    {
        $ownerRole = Role::withoutGlobalScope('company')
            ->where('company_id', $company->id)
            ->where('name', 'Owner')
            ->first();

        CompanyUser::create([
            'company_id' => $company->id,
            'user_id' => $owner->id,
            'role_id' => $ownerRole->id,
            'is_active' => true,
        ]);
    }

    protected function createDefaultChartOfAccounts(Company $company): void
    {
        $accounts = [
            // ASET (1xxx)
            ['code' => '1000', 'name' => 'Aset', 'type' => AccountType::Asset, 'subtype' => null, 'is_system' => true],
            ['code' => '1100', 'name' => 'Aset Lancar', 'type' => AccountType::Asset, 'subtype' => 'current_asset', 'parent_code' => '1000'],
            ['code' => '1110', 'name' => 'Kas', 'type' => AccountType::Asset, 'subtype' => 'cash', 'parent_code' => '1100', 'is_system' => true],
            ['code' => '1120', 'name' => 'Bank', 'type' => AccountType::Asset, 'subtype' => 'bank', 'parent_code' => '1100', 'is_system' => true],
            ['code' => '1130', 'name' => 'Piutang Usaha', 'type' => AccountType::Asset, 'subtype' => 'receivable', 'parent_code' => '1100', 'is_system' => true],
            ['code' => '1140', 'name' => 'Persediaan', 'type' => AccountType::Asset, 'subtype' => 'inventory', 'parent_code' => '1100', 'is_system' => true],
            ['code' => '1200', 'name' => 'Aset Tetap', 'type' => AccountType::Asset, 'subtype' => 'fixed_asset', 'parent_code' => '1000'],
            
            // KEWAJIBAN (2xxx)
            ['code' => '2000', 'name' => 'Kewajiban', 'type' => AccountType::Liability, 'subtype' => null, 'is_system' => true],
            ['code' => '2100', 'name' => 'Kewajiban Lancar', 'type' => AccountType::Liability, 'subtype' => 'current_liability', 'parent_code' => '2000'],
            ['code' => '2110', 'name' => 'Hutang Usaha', 'type' => AccountType::Liability, 'subtype' => 'payable', 'parent_code' => '2100', 'is_system' => true],
            ['code' => '2200', 'name' => 'Kewajiban Jangka Panjang', 'type' => AccountType::Liability, 'subtype' => 'long_term_liability', 'parent_code' => '2000'],
            
            // MODAL (3xxx)
            ['code' => '3000', 'name' => 'Modal', 'type' => AccountType::Equity, 'subtype' => null, 'is_system' => true],
            ['code' => '3100', 'name' => 'Modal Pemilik', 'type' => AccountType::Equity, 'subtype' => 'owner_equity', 'parent_code' => '3000', 'is_system' => true],
            ['code' => '3200', 'name' => 'Laba Ditahan', 'type' => AccountType::Equity, 'subtype' => 'retained_earnings', 'parent_code' => '3000', 'is_system' => true],
            
            // PENDAPATAN (4xxx)
            ['code' => '4000', 'name' => 'Pendapatan', 'type' => AccountType::Revenue, 'subtype' => null, 'is_system' => true],
            ['code' => '4100', 'name' => 'Pendapatan Usaha', 'type' => AccountType::Revenue, 'subtype' => 'operating_revenue', 'parent_code' => '4000', 'is_system' => true],
            ['code' => '4200', 'name' => 'Pendapatan Lain-lain', 'type' => AccountType::Revenue, 'subtype' => 'other_revenue', 'parent_code' => '4000'],
            
            // BEBAN (5xxx)
            ['code' => '5000', 'name' => 'Beban', 'type' => AccountType::Expense, 'subtype' => null, 'is_system' => true],
            ['code' => '5050', 'name' => 'Harga Pokok Penjualan', 'type' => AccountType::Expense, 'subtype' => 'cogs', 'parent_code' => '5000', 'is_system' => true],
            ['code' => '5100', 'name' => 'Beban Operasional', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'parent_code' => '5000', 'is_system' => true],
            ['code' => '5110', 'name' => 'Beban Gaji', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'parent_code' => '5100'],
            ['code' => '5120', 'name' => 'Beban Sewa', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'parent_code' => '5100'],
            ['code' => '5130', 'name' => 'Beban Listrik & Air', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'parent_code' => '5100'],
            ['code' => '5140', 'name' => 'Beban Telepon & Internet', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'parent_code' => '5100'],
            ['code' => '5150', 'name' => 'Beban Transportasi', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'parent_code' => '5100'],
            ['code' => '5160', 'name' => 'Beban Perlengkapan', 'type' => AccountType::Expense, 'subtype' => 'operating_expense', 'parent_code' => '5100'],
            ['code' => '5170', 'name' => 'Selisih Stok', 'type' => AccountType::Expense, 'subtype' => 'inventory_adjustment', 'parent_code' => '5100', 'is_system' => true],
            ['code' => '5200', 'name' => 'Beban Lain-lain', 'type' => AccountType::Expense, 'subtype' => 'other_expense', 'parent_code' => '5000'],
        ];

        $createdAccounts = [];

        foreach ($accounts as $accountData) {
            $parentId = null;
            if (isset($accountData['parent_code']) && isset($createdAccounts[$accountData['parent_code']])) {
                $parentId = $createdAccounts[$accountData['parent_code']]->id;
            }

            $account = Account::create([
                'company_id' => $company->id,
                'parent_id' => $parentId,
                'code' => $accountData['code'],
                'name' => $accountData['name'],
                'type' => $accountData['type'],
                'subtype' => $accountData['subtype'],
                'normal_balance' => $accountData['type']->normalBalance(),
                'is_system' => $accountData['is_system'] ?? false,
                'is_active' => true,
            ]);

            $createdAccounts[$accountData['code']] = $account;
        }
    }

    protected function createDefaultCashAccount(Company $company): void
    {
        $cashAccount = Account::withoutGlobalScope('company')
            ->where('company_id', $company->id)
            ->where('code', '1110')
            ->first();

        CashBankAccount::create([
            'company_id' => $company->id,
            'account_id' => $cashAccount->id,
            'name' => 'Kas Utama',
            'type' => CashBankType::Cash,
            'opening_balance' => 0,
            'opening_balance_date' => now()->startOfMonth(),
            'is_active' => true,
        ]);
    }

    protected function createDefaultCategories(Company $company): void
    {
        $revenueAccount = Account::withoutGlobalScope('company')
            ->where('company_id', $company->id)
            ->where('code', '4100')
            ->first();

        $expenseAccount = Account::withoutGlobalScope('company')
            ->where('company_id', $company->id)
            ->where('code', '5100')
            ->first();

        $incomeCategories = [
            'Penjualan Produk',
            'Penjualan Jasa',
            'Pendapatan Lainnya',
        ];

        $expenseCategories = [
            'Pembelian Bahan',
            'Biaya Operasional',
            'Biaya Transportasi',
            'Biaya Makan & Minum',
            'Biaya Lainnya',
        ];

        foreach ($incomeCategories as $name) {
            TransactionCategory::create([
                'company_id' => $company->id,
                'account_id' => $revenueAccount->id,
                'name' => $name,
                'type' => 'income',
                'is_active' => true,
            ]);
        }

        foreach ($expenseCategories as $name) {
            TransactionCategory::create([
                'company_id' => $company->id,
                'account_id' => $expenseAccount->id,
                'name' => $name,
                'type' => 'expense',
                'is_active' => true,
            ]);
        }
    }

    protected function createCurrentFiscalPeriod(Company $company): void
    {
        $now = now();
        $fiscalStart = $company->fiscal_year_start;
        
        $startDate = $now->copy()->month($fiscalStart)->startOfMonth();
        if ($startDate->greaterThan($now)) {
            $startDate->subYear();
        }
        
        $endDate = $startDate->copy()->addYear()->subDay();

        FiscalPeriod::create([
            'company_id' => $company->id,
            'name' => 'Tahun Fiskal ' . $startDate->year . '/' . $endDate->year,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_closed' => false,
        ]);
    }
}
