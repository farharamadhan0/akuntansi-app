<?php

namespace Tests\Feature;

use App\Enums\CashBankType;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Transaction;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashBankAccountTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private Account $cashLedgerAccount;
    private Account $bankLedgerAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Kas Bank'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->cashLedgerAccount = Account::where('company_id', $this->companyId)
            ->where('subtype', 'cash')
            ->first();

        $this->bankLedgerAccount = Account::where('company_id', $this->companyId)
            ->where('subtype', 'bank')
            ->first();
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_index_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/master/kas-bank')
            ->assertOk();
    }

    public function test_create_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/master/kas-bank/tambah')
            ->assertOk();
    }

    public function test_edit_page_loads(): void
    {
        $account = $this->existingAccount();

        $this->actingAs($this->user)
            ->get("/master/kas-bank/{$account->id}/edit")
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/master/kas-bank')->assertRedirect('/login');
        $this->post('/master/kas-bank', $this->cashPayload())->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Store – kas
    // -----------------------------------------------------------------------

    public function test_valid_cash_account_is_stored(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kas-bank', $this->cashPayload())
            ->assertRedirect('/master/kas-bank')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('cash_bank_accounts', [
            'company_id'      => $this->companyId,
            'name'            => 'Kas Operasional',
            'type'            => CashBankType::Cash->value,
            'account_id'      => $this->cashLedgerAccount->id,
            'opening_balance' => 500000,
            'is_active'       => true,
        ]);
    }

    public function test_valid_bank_account_is_stored(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kas-bank', $this->bankPayload())
            ->assertRedirect('/master/kas-bank')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('cash_bank_accounts', [
            'company_id'     => $this->companyId,
            'name'           => 'BCA Utama',
            'type'           => CashBankType::Bank->value,
            'bank_name'      => 'BCA',
            'account_number' => '1234567890',
        ]);
    }

    public function test_account_is_scoped_to_company(): void
    {
        // CompanySetupService creates a default cash account, so start with count
        $before = CashBankAccount::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->count();

        $this->actingAs($this->user)
            ->post('/master/kas-bank', $this->cashPayload());

        $after = CashBankAccount::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->count();

        $this->assertEquals($before + 1, $after);
    }

    public function test_store_without_opening_balance_defaults_to_zero(): void
    {
        $payload = $this->cashPayload();
        unset($payload['opening_balance']);

        $this->actingAs($this->user)
            ->post('/master/kas-bank', $payload);

        $account = CashBankAccount::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('name', 'Kas Operasional')
            ->first();

        $this->assertEquals(0, (float) $account->opening_balance);
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    public function test_account_can_be_updated(): void
    {
        $account = $this->existingAccount();

        $this->actingAs($this->user)
            ->put("/master/kas-bank/{$account->id}", $this->cashPayload(['name' => 'Kas Baru']))
            ->assertRedirect('/master/kas-bank')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('cash_bank_accounts', [
            'id'   => $account->id,
            'name' => 'Kas Baru',
        ]);
    }

    public function test_update_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanyAccount();

        $this->actingAs($this->user)
            ->put("/master/kas-bank/{$other->id}", $this->cashPayload(['name' => 'Hacked']))
            ->assertNotFound();

        $this->assertDatabaseMissing('cash_bank_accounts', ['id' => $other->id, 'name' => 'Hacked']);
    }

    // -----------------------------------------------------------------------
    // Toggle active
    // -----------------------------------------------------------------------

    public function test_account_can_be_deactivated(): void
    {
        $account = $this->existingAccount();
        $this->assertTrue($account->is_active);

        $this->actingAs($this->user)
            ->post("/master/kas-bank/{$account->id}/toggle")
            ->assertRedirect();

        $this->assertDatabaseHas('cash_bank_accounts', ['id' => $account->id, 'is_active' => false]);
    }

    public function test_account_can_be_reactivated(): void
    {
        $account = $this->existingAccount();
        $account->update(['is_active' => false]);

        $this->actingAs($this->user)
            ->post("/master/kas-bank/{$account->id}/toggle")
            ->assertRedirect();

        $this->assertDatabaseHas('cash_bank_accounts', ['id' => $account->id, 'is_active' => true]);
    }

    // -----------------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------------

    public function test_account_with_no_transactions_can_be_deleted(): void
    {
        $account = $this->existingAccount();

        $this->actingAs($this->user)
            ->delete("/master/kas-bank/{$account->id}")
            ->assertRedirect('/master/kas-bank')
            ->assertSessionHas('success');

        $this->assertSoftDeleted('cash_bank_accounts', ['id' => $account->id]);
    }

    public function test_account_with_transactions_cannot_be_deleted(): void
    {
        $account = $this->existingAccount();

        // Create a transaction attached to this account
        Transaction::withoutGlobalScope('company')->create([
            'company_id'          => $this->companyId,
            'transaction_number'  => 'TRX-TEST-001',
            'type'                => 'income',
            'status'              => 'draft',
            'date'                => now()->toDateString(),
            'amount'              => 100000,
            'description'         => 'Test transaksi',
            'cash_bank_account_id' => $account->id,
            'created_by'          => $this->user->id,
        ]);

        $this->actingAs($this->user)
            ->delete("/master/kas-bank/{$account->id}")
            ->assertSessionHas('error');

        $this->assertDatabaseHas('cash_bank_accounts', ['id' => $account->id, 'deleted_at' => null]);
    }

    public function test_delete_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanyAccount();

        $this->actingAs($this->user)
            ->delete("/master/kas-bank/{$other->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('cash_bank_accounts', ['id' => $other->id, 'deleted_at' => null]);
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_required_fields_are_validated(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kas-bank', [])
            ->assertSessionHasErrors(['account_id', 'name', 'type']);
    }

    public function test_invalid_type_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kas-bank', $this->cashPayload(['type' => 'giro']))
            ->assertSessionHasErrors('type');
    }

    public function test_negative_opening_balance_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kas-bank', $this->cashPayload(['opening_balance' => -100]))
            ->assertSessionHasErrors('opening_balance');
    }

    public function test_nonexistent_account_id_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kas-bank', $this->cashPayload(['account_id' => 99999]))
            ->assertSessionHasErrors('account_id');
    }

    public function test_name_max_length_is_enforced(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kas-bank', $this->cashPayload(['name' => str_repeat('A', 101)]))
            ->assertSessionHasErrors('name');
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function cashPayload(array $overrides = []): array
    {
        return array_merge([
            'account_id'           => $this->cashLedgerAccount->id,
            'name'                 => 'Kas Operasional',
            'type'                 => CashBankType::Cash->value,
            'opening_balance'      => 500000,
            'opening_balance_date' => now()->startOfMonth()->format('Y-m-d'),
        ], $overrides);
    }

    private function bankPayload(array $overrides = []): array
    {
        return array_merge([
            'account_id'           => $this->bankLedgerAccount->id,
            'name'                 => 'BCA Utama',
            'type'                 => CashBankType::Bank->value,
            'bank_name'            => 'BCA',
            'account_number'       => '1234567890',
            'opening_balance'      => 10000000,
            'opening_balance_date' => now()->startOfMonth()->format('Y-m-d'),
        ], $overrides);
    }

    /** The seeded default cash account from CompanySetupService. */
    private function existingAccount(): CashBankAccount
    {
        return CashBankAccount::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->firstOrFail();
    }

    private function createOtherCompanyAccount(): CashBankAccount
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Kas'],
            $otherUser
        );

        return CashBankAccount::withoutGlobalScope('company')
            ->where('company_id', $otherCompany->id)
            ->firstOrFail();
    }
}
