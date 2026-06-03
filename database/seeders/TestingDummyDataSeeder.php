<?php

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\CashBankType;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Company;
use App\Models\Partner;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\ExpenseService;
use App\Services\IncomeService;
use App\Services\JournalService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TestingDummyDataSeeder extends Seeder
{
    private const COMPANY_NAME = 'PT Nusantara Testing';

    public function run(): void
    {
        DB::transaction(function () {
            $user = $this->createUser();
            Auth::login($user);

            $company = $this->createCompany($user);
            $user->forceFill(['current_company_id' => $company->id])->save();

            $this->createAdditionalAccounts($company);
            $cashBankAccounts = $this->createCashBankAccounts($company);
            $partners = $this->createPartners($company);
            $categories = $this->createAdditionalCategories($company);

            $this->createOpeningJournals($company, $cashBankAccounts);

            if (Transaction::withoutGlobalScope('company')->where('company_id', $company->id)->count() >= 200) {
                return;
            }

            $this->createTransactions($company, $cashBankAccounts, $partners, $categories);
            $this->createManualJournals($company);
        });
    }

    private function createUser(): User
    {
        return User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );
    }

    private function createCompany(User $user): Company
    {
        $company = Company::where('name', self::COMPANY_NAME)->first();

        if ($company) {
            return $company;
        }

        return app(CompanySetupService::class)->createCompany([
            'name' => self::COMPANY_NAME,
            'legal_name' => 'PT Nusantara Testing Indonesia',
            'tax_id' => '09.123.456.7-890.000',
            'address' => 'Jl. Merdeka No. 45, Jakarta Pusat',
            'phone' => '021-5550-2026',
            'email' => 'finance@nusantara-testing.test',
            'currency' => 'IDR',
            'timezone' => 'Asia/Jakarta',
            'fiscal_year_start' => 1,
            'enabled_menus' => [
                'income',
                'expense',
                'receivables',
                'payables',
                'partners',
                'cash_bank',
                'journals',
                'accounts',
                'products',
                'purchases',
                'sales',
                'inventory_adjustments',
                'reports',
            ],
        ], $user);
    }

    private function createAdditionalAccounts(Company $company): void
    {
        $definitions = [
            ['4110', 'Pendapatan Konsultasi', AccountType::Revenue, 'operating_revenue', '4000'],
            ['4120', 'Pendapatan Implementasi', AccountType::Revenue, 'operating_revenue', '4000'],
            ['4130', 'Pendapatan Maintenance', AccountType::Revenue, 'operating_revenue', '4000'],
            ['5180', 'Beban Marketing', AccountType::Expense, 'operating_expense', '5100'],
            ['5190', 'Beban Software & Tools', AccountType::Expense, 'operating_expense', '5100'],
            ['5210', 'Beban Bank', AccountType::Expense, 'other_expense', '5000'],
        ];

        foreach ($definitions as [$code, $name, $type, $subtype, $parentCode]) {
            Account::withoutGlobalScope('company')->firstOrCreate(
                ['company_id' => $company->id, 'code' => $code],
                [
                    'parent_id' => $this->account($company, $parentCode)?->id,
                    'name' => $name,
                    'type' => $type,
                    'subtype' => $subtype,
                    'normal_balance' => $type->normalBalance(),
                    'is_system' => false,
                    'is_active' => true,
                ],
            );
        }
    }

    /**
     * @return array<string, CashBankAccount>
     */
    private function createCashBankAccounts(Company $company): array
    {
        $items = [
            'cash' => ['Kas Operasional', CashBankType::Cash, '1110', null, null],
            'bca' => ['Bank BCA Utama', CashBankType::Bank, '1120', 'BCA', '0012345678'],
            'mandiri' => ['Bank Mandiri Payroll', CashBankType::Bank, '1120', 'Mandiri', '1400012345678'],
        ];

        $result = [];

        foreach ($items as $key => [$name, $type, $accountCode, $bankName, $accountNumber]) {
            $result[$key] = CashBankAccount::withoutGlobalScope('company')->firstOrCreate(
                ['company_id' => $company->id, 'name' => $name],
                [
                    'account_id' => $this->account($company, $accountCode)->id,
                    'type' => $type,
                    'bank_name' => $bankName,
                    'account_number' => $accountNumber,
                    'is_active' => true,
                ],
            );
        }

        return $result;
    }

    /**
     * @return array<string, array<int, Partner>>
     */
    private function createPartners(Company $company): array
    {
        $customers = [
            'CV Sinar Digital',
            'PT Maju Bersama',
            'PT Lintas Data',
            'Koperasi Sejahtera',
            'PT Ritel Nusantara',
            'Yayasan Cendekia',
            'PT Karya Sentosa',
            'UD Prima Jaya',
            'PT Bumi Teknologi',
            'CV Artha Mandiri',
        ];

        $suppliers = [
            'PT Solusi Perangkat',
            'CV ATK Jaya',
            'PT Internet Cepat',
            'PT Logistik Prima',
            'CV Konsultan Pajak',
            'PT Sewa Kantor',
            'PT Energi Kota',
            'CV Kopi Kantor',
        ];

        return [
            'customers' => $this->makePartners($company, $customers, Partner::TYPE_CUSTOMER, 'CUST'),
            'suppliers' => $this->makePartners($company, $suppliers, Partner::TYPE_SUPPLIER, 'SUP'),
        ];
    }

    /**
     * @return array<int, Partner>
     */
    private function makePartners(Company $company, array $names, string $type, string $prefix): array
    {
        $partners = [];

        foreach ($names as $index => $name) {
            $code = sprintf('%s-%03d', $prefix, $index + 1);
            $partner = Partner::withoutGlobalScope('company')->firstOrCreate(
                ['company_id' => $company->id, 'code' => $code],
                [
                    'name' => $name,
                    'email' => strtolower(str_replace([' ', '.'], ['.', ''], $name)) . '@example.test',
                    'phone' => '08' . fake()->numerify('##########'),
                    'address' => fake()->address(),
                    'credit_limit' => $type === Partner::TYPE_CUSTOMER
                        ? fake()->numberBetween(25_000_000, 200_000_000)
                        : null,
                    'is_active' => true,
                ],
            );

            $partner->syncTypes([$type]);
            $partners[] = $partner;
        }

        return $partners;
    }

    /**
     * @return array<string, array<int, TransactionCategory>>
     */
    private function createAdditionalCategories(Company $company): array
    {
        $income = [
            ['Konsultasi Akuntansi', '4110'],
            ['Implementasi Sistem', '4120'],
            ['Maintenance Bulanan', '4130'],
            ['Training Pengguna', '4100'],
        ];

        $expense = [
            ['Langganan Software', '5190'],
            ['Iklan & Promosi', '5180'],
            ['Biaya Admin Bank', '5210'],
            ['Sewa Kantor', '5120'],
            ['Internet Kantor', '5140'],
            ['Perjalanan Dinas', '5150'],
        ];

        return [
            'income' => $this->makeCategories($company, $income, 'income'),
            'expense' => $this->makeCategories($company, $expense, 'expense'),
        ];
    }

    /**
     * @return array<int, TransactionCategory>
     */
    private function makeCategories(Company $company, array $items, string $type): array
    {
        $categories = [];

        foreach ($items as [$name, $accountCode]) {
            $categories[] = TransactionCategory::withoutGlobalScope('company')->firstOrCreate(
                ['company_id' => $company->id, 'name' => $name, 'type' => $type],
                [
                    'account_id' => $this->account($company, $accountCode)->id,
                    'description' => 'Kategori dummy untuk testing.',
                    'is_active' => true,
                ],
            );
        }

        return $categories;
    }

    private function createOpeningJournals(Company $company, array $cashBankAccounts): void
    {
        $exists = $company->journalEntries()
            ->withoutGlobalScope('company')
            ->where('description', 'Saldo awal testing')
            ->exists();

        if ($exists) {
            return;
        }

        app(JournalService::class)->createEntry(
            $company->id,
            Carbon::now()->startOfYear()->toDateString(),
            'Saldo awal testing',
            [
                ['account_id' => $cashBankAccounts['cash']->account_id, 'description' => 'Saldo awal kas', 'debit' => 35_000_000, 'credit' => 0],
                ['account_id' => $cashBankAccounts['bca']->account_id, 'description' => 'Saldo awal bank', 'debit' => 160_000_000, 'credit' => 0],
                ['account_id' => $this->account($company, '3100')->id, 'description' => 'Modal awal pemilik', 'debit' => 0, 'credit' => 195_000_000],
            ],
            null,
            true,
        );
    }

    private function createTransactions(Company $company, array $cashBankAccounts, array $partners, array $categories): void
    {
        $incomeService = app(IncomeService::class);
        $expenseService = app(ExpenseService::class);
        $start = Carbon::now()->subMonths(8)->startOfMonth();

        $incomeDescriptions = [
            'Pembayaran invoice konsultasi',
            'Termin implementasi aplikasi',
            'Retainer maintenance bulanan',
            'Pelatihan tim finance',
            'Pelunasan jasa setup laporan',
            'Pendapatan support onsite',
        ];

        $expenseDescriptions = [
            'Pembelian perlengkapan kantor',
            'Pembayaran langganan software',
            'Biaya internet dan komunikasi',
            'Biaya transportasi meeting',
            'Pembayaran vendor operasional',
            'Biaya makan meeting proyek',
            'Pembayaran sewa kantor',
            'Biaya admin bank bulanan',
        ];

        for ($i = 0; $i < 120; $i++) {
            $transaction = $incomeService->create([
                'company_id' => $company->id,
                'date' => $start->copy()->addDays($i * 2 + ($i % 5))->toDateString(),
                'amount' => fake()->numberBetween(2_500_000, 45_000_000),
                'description' => fake()->randomElement($incomeDescriptions) . ' #' . str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
                'cash_bank_account_id' => fake()->randomElement([$cashBankAccounts['bca']->id, $cashBankAccounts['mandiri']->id, $cashBankAccounts['cash']->id]),
                'category_id' => fake()->randomElement($categories['income'])->id,
                'partner_id' => fake()->randomElement($partners['customers'])->id,
                'reference' => 'INV-TST-' . str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
            ]);

            if ($i % 12 !== 0) {
                $incomeService->post($transaction);
            }
        }

        for ($i = 0; $i < 150; $i++) {
            $transaction = $expenseService->create([
                'company_id' => $company->id,
                'date' => $start->copy()->addDays($i + ($i % 9))->toDateString(),
                'amount' => fake()->numberBetween(150_000, 18_000_000),
                'description' => fake()->randomElement($expenseDescriptions) . ' #' . str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
                'cash_bank_account_id' => fake()->randomElement([$cashBankAccounts['bca']->id, $cashBankAccounts['mandiri']->id, $cashBankAccounts['cash']->id]),
                'category_id' => fake()->randomElement($categories['expense'])->id,
                'partner_id' => fake()->randomElement($partners['suppliers'])->id,
                'reference' => 'BILL-TST-' . str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
            ]);

            if ($i % 15 !== 0) {
                $expenseService->post($transaction);
            }
        }
    }

    private function createManualJournals(Company $company): void
    {
        $journalService = app(JournalService::class);
        $baseDate = Carbon::now()->subMonths(6)->startOfMonth();

        $entries = [
            [
                'date' => $baseDate->copy()->addDays(4),
                'description' => 'Akrual biaya utilitas testing',
                'debit_account' => '5130',
                'credit_account' => '2110',
                'amount' => 2_750_000,
                'is_adjusting' => true,
            ],
            [
                'date' => $baseDate->copy()->addMonth()->addDays(12),
                'description' => 'Akrual jasa profesional testing',
                'debit_account' => '5100',
                'credit_account' => '2110',
                'amount' => 4_500_000,
                'is_adjusting' => true,
            ],
            [
                'date' => $baseDate->copy()->addMonths(2)->addDays(20),
                'description' => 'Setoran modal tambahan testing',
                'debit_account' => '1120',
                'credit_account' => '3100',
                'amount' => 50_000_000,
                'is_adjusting' => false,
            ],
            [
                'date' => $baseDate->copy()->addMonths(4)->addDays(7),
                'description' => 'Koreksi klasifikasi beban testing',
                'debit_account' => '5190',
                'credit_account' => '5100',
                'amount' => 1_850_000,
                'is_adjusting' => true,
            ],
        ];

        foreach ($entries as $entry) {
            $exists = $company->journalEntries()
                ->withoutGlobalScope('company')
                ->where('description', $entry['description'])
                ->exists();

            if ($exists) {
                continue;
            }

            $journalService->createEntry(
                $company->id,
                $entry['date']->toDateString(),
                $entry['description'],
                [
                    ['account_id' => $this->account($company, $entry['debit_account'])->id, 'description' => $entry['description'], 'debit' => $entry['amount'], 'credit' => 0],
                    ['account_id' => $this->account($company, $entry['credit_account'])->id, 'description' => $entry['description'], 'debit' => 0, 'credit' => $entry['amount']],
                ],
                null,
                true,
                $entry['is_adjusting'],
            );
        }
    }

    private function account(Company $company, string $code): ?Account
    {
        return Account::withoutGlobalScope('company')
            ->where('company_id', $company->id)
            ->where('code', $code)
            ->first();
    }
}
