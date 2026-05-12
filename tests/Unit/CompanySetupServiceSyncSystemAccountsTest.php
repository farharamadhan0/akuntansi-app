<?php

namespace Tests\Unit;

use App\Enums\AccountType;
use App\Models\Account;
use App\Models\Company;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompanySetupServiceSyncSystemAccountsTest extends TestCase
{
    use RefreshDatabase;

    private CompanySetupService $service;
    private User $user;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(CompanySetupService::class);
        $this->user    = User::factory()->create();
        $this->company = $this->service->createCompany(
            ['name' => 'PT Sync Test'],
            $this->user
        );

        $this->user->refresh();
        $this->actingAs($this->user);
    }

    // -----------------------------------------------------------------------
    // Idempotency
    // -----------------------------------------------------------------------

    public function test_sync_on_freshly_created_company_creates_nothing(): void
    {
        $created = $this->service->syncSystemAccounts($this->company);

        $this->assertSame(0, $created);
    }

    public function test_sync_is_idempotent_when_called_repeatedly(): void
    {
        $this->service->syncSystemAccounts($this->company);
        $countBefore = Account::where('company_id', $this->company->id)->count();

        $this->service->syncSystemAccounts($this->company);
        $countAfter = Account::where('company_id', $this->company->id)->count();

        $this->assertSame($countBefore, $countAfter);
    }

    // -----------------------------------------------------------------------
    // Backfill missing system accounts
    // -----------------------------------------------------------------------

    public function test_sync_recreates_missing_inventory_adjustment_account(): void
    {
        // Simulate an older company whose COA was seeded before the
        // inventory_adjustment account was added.
        Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->forceDelete();

        $this->assertDatabaseMissing('accounts', [
            'company_id' => $this->company->id,
            'subtype'    => 'inventory_adjustment',
        ]);

        $created = $this->service->syncSystemAccounts($this->company);

        $this->assertSame(1, $created);

        $account = Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->first();

        $this->assertNotNull($account);
        $this->assertSame(AccountType::Expense, $account->type);
        $this->assertTrue((bool) $account->is_system);
        $this->assertTrue((bool) $account->is_active);
    }

    public function test_sync_links_recreated_account_to_existing_parent(): void
    {
        Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->forceDelete();

        $this->service->syncSystemAccounts($this->company);

        $parent = Account::where('company_id', $this->company->id)
            ->where('code', '5100')
            ->first();

        $account = Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->first();

        $this->assertNotNull($parent);
        $this->assertNotNull($account);
        $this->assertSame($parent->id, $account->parent_id);
    }

    public function test_sync_uses_default_code_when_available(): void
    {
        Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->forceDelete();

        $this->service->syncSystemAccounts($this->company);

        $account = Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->first();

        $this->assertSame('5170', $account->code);
    }

    // -----------------------------------------------------------------------
    // Code-collision handling
    // -----------------------------------------------------------------------

    public function test_sync_falls_back_to_suffixed_code_when_default_code_taken(): void
    {
        // Remove the system inventory_adjustment account...
        Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->forceDelete();

        // ...and squat on its default code with an unrelated account.
        Account::create([
            'company_id'     => $this->company->id,
            'parent_id'      => null,
            'code'           => '5170',
            'name'           => 'Akun Custom User',
            'type'           => AccountType::Expense,
            'subtype'        => 'operating_expense',
            'normal_balance' => AccountType::Expense->normalBalance(),
            'is_system'      => false,
            'is_active'      => true,
        ]);

        $created = $this->service->syncSystemAccounts($this->company);

        $this->assertSame(1, $created);

        $account = Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->first();

        $this->assertNotNull($account);
        $this->assertSame('5170-1', $account->code);
        $this->assertTrue((bool) $account->is_system);
    }

    public function test_sync_does_not_touch_existing_account_occupying_default_code(): void
    {
        Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->forceDelete();

        $squatter = Account::create([
            'company_id'     => $this->company->id,
            'parent_id'      => null,
            'code'           => '5170',
            'name'           => 'Akun Custom User',
            'type'           => AccountType::Expense,
            'subtype'        => 'operating_expense',
            'normal_balance' => AccountType::Expense->normalBalance(),
            'is_system'      => false,
            'is_active'      => true,
        ]);

        $this->service->syncSystemAccounts($this->company);

        $squatter->refresh();
        $this->assertSame('5170', $squatter->code);
        $this->assertSame('Akun Custom User', $squatter->name);
        $this->assertSame('operating_expense', $squatter->subtype);
        $this->assertFalse((bool) $squatter->is_system);
    }

    // -----------------------------------------------------------------------
    // System-account identity is the subtype, not the code
    // -----------------------------------------------------------------------

    public function test_sync_skips_system_account_already_present_under_different_code(): void
    {
        // Move the existing system account to a non-default code.
        $account = Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->first();

        $account->update(['code' => '9999']);

        $created = $this->service->syncSystemAccounts($this->company);

        $this->assertSame(0, $created);

        $count = Account::where('company_id', $this->company->id)
            ->where('subtype', 'inventory_adjustment')
            ->count();
        $this->assertSame(1, $count);
    }

    // -----------------------------------------------------------------------
    // Scoping
    // -----------------------------------------------------------------------

    public function test_sync_does_not_affect_other_companies(): void
    {
        $otherUser    = User::factory()->create();
        $otherCompany = $this->service->createCompany(
            ['name' => 'PT Lain'],
            $otherUser
        );

        Account::withoutGlobalScope('company')
            ->where('company_id', $otherCompany->id)
            ->where('subtype', 'inventory_adjustment')
            ->forceDelete();

        $created = $this->service->syncSystemAccounts($this->company);

        $this->assertSame(0, $created);
        $this->assertDatabaseMissing('accounts', [
            'company_id' => $otherCompany->id,
            'subtype'    => 'inventory_adjustment',
        ]);
    }
}
