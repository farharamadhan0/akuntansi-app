<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\Company;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression guard for the assumption made by service-layer default-account
 * lookups (e.g. ProductService, SaleService, PurchaseService, PayableService,
 * PaymentService, ExpenseService, IncomeService, ReceivableService,
 * StockAdjustmentService): for every "anchor" subtype, there must be exactly
 * one is_system=true Account per company. Otherwise firstOrFail() on
 * (company_id, type, subtype, is_system=true) becomes non-deterministic.
 */
class DefaultSystemAccountUniquenessTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Subtypes that the application uses as default-account anchors.
     * Keep in sync with service-layer lookups.
     */
    private const ANCHOR_SUBTYPES = [
        'cash',
        'bank',
        'receivable',
        'inventory',
        'payable',
        'operating_revenue',
        'cogs',
        'operating_expense',
        'inventory_adjustment',
    ];

    public function test_each_anchor_subtype_has_exactly_one_system_account_per_company(): void
    {
        /** @var CompanySetupService $service */
        $service = app(CompanySetupService::class);
        $user    = User::factory()->create();
        /** @var Company $company */
        $company = $service->createCompany(['name' => 'PT Anchor Test'], $user);

        foreach (self::ANCHOR_SUBTYPES as $subtype) {
            $count = Account::where('company_id', $company->id)
                ->where('subtype', $subtype)
                ->where('is_system', true)
                ->count();

            $this->assertSame(
                1,
                $count,
                "Expected exactly 1 is_system=true account with subtype '{$subtype}' "
                . "for company {$company->id}, found {$count}. "
                . "Default-account lookups (firstOrFail) rely on this invariant."
            );
        }
    }

    public function test_anchor_lookup_is_deterministic_when_user_adds_custom_account_with_same_subtype(): void
    {
        /** @var CompanySetupService $service */
        $service = app(CompanySetupService::class);
        $user    = User::factory()->create();
        /** @var Company $company */
        $company = $service->createCompany(['name' => 'PT Custom'], $user);

        // The seed already creates several non-system accounts with subtype
        // 'operating_expense' (5110-5160). Simulate the user adding one more
        // custom expense account with the same subtype.
        $parent = Account::where('company_id', $company->id)->where('code', '5100')->first();

        Account::create([
            'company_id'     => $company->id,
            'parent_id'      => $parent->id,
            'code'           => '5180',
            'name'           => 'Beban Marketing (Custom)',
            'type'           => $parent->type,
            'subtype'        => 'operating_expense',
            'normal_balance' => $parent->type->normalBalance(),
            'is_system'      => false,
            'is_active'      => true,
        ]);

        // The default-expense lookup pattern used across services:
        $resolved = Account::where('company_id', $company->id)
            ->where('type', $parent->type)
            ->where('subtype', 'operating_expense')
            ->where('is_system', true)
            ->firstOrFail();

        $this->assertSame('5100', $resolved->code, 'Default expense anchor must always resolve to 5100.');
    }
}
