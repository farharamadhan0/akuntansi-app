<?php

namespace Tests;

use App\Enums\CashBankType;
use App\Models\Account;
use App\Models\CashBankAccount;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Stub Vite directives so backend tests don't depend on a built
        // frontend manifest (public/build/manifest.json).
        $this->withoutVite();
    }

    /**
     * Helper test: buat akun Kas/Bank default untuk sebuah company.
     * CompanySetupService tidak lagi auto-create kas, jadi tests memakai
     * helper ini saat butuh kas siap pakai.
     */
    protected function createDefaultCashBankAccount(int $companyId, string $name = 'Kas Utama'): CashBankAccount
    {
        $cashLedger = Account::withoutGlobalScope('company')
            ->where('company_id', $companyId)
            ->where('subtype', 'cash')
            ->firstOrFail();

        return CashBankAccount::withoutGlobalScope('company')->create([
            'company_id' => $companyId,
            'account_id' => $cashLedger->id,
            'name'       => $name,
            'type'       => CashBankType::Cash,
            'is_active'  => true,
        ]);
    }
}
