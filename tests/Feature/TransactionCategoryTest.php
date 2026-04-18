<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionCategoryTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;
    private Account $incomeAccount;
    private Account $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Kategori'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;

        $this->incomeAccount = Account::where('company_id', $this->companyId)
            ->where('type', 'revenue')
            ->first();

        $this->expenseAccount = Account::where('company_id', $this->companyId)
            ->where('type', 'expense')
            ->first();
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_index_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/master/kategori')
            ->assertOk();
    }

    public function test_create_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/master/kategori/tambah')
            ->assertOk();
    }

    public function test_edit_page_loads(): void
    {
        $category = $this->existingIncomeCategory();

        $this->actingAs($this->user)
            ->get("/master/kategori/{$category->id}/edit")
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/master/kategori')->assertRedirect('/login');
        $this->post('/master/kategori', $this->incomePayload())->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Store
    // -----------------------------------------------------------------------

    public function test_valid_income_category_is_stored(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', $this->incomePayload())
            ->assertRedirect('/master/kategori')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('transaction_categories', [
            'company_id'  => $this->companyId,
            'name'        => 'Jasa Konsultasi',
            'type'        => 'income',
            'account_id'  => $this->incomeAccount->id,
            'is_active'   => true,
        ]);
    }

    public function test_valid_expense_category_is_stored(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', $this->expensePayload())
            ->assertRedirect('/master/kategori')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('transaction_categories', [
            'company_id' => $this->companyId,
            'name'       => 'Biaya Operasional',
            'type'       => 'expense',
            'account_id' => $this->expenseAccount->id,
        ]);
    }

    public function test_category_is_scoped_to_company(): void
    {
        $before = TransactionCategory::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->count();

        $this->actingAs($this->user)
            ->post('/master/kategori', $this->incomePayload());

        $after = TransactionCategory::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->count();

        $this->assertEquals($before + 1, $after);
    }

    public function test_store_with_description(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', $this->incomePayload([
                'description' => 'Pendapatan dari jasa konsultasi manajemen',
            ]));

        $this->assertDatabaseHas('transaction_categories', [
            'name'        => 'Jasa Konsultasi',
            'description' => 'Pendapatan dari jasa konsultasi manajemen',
        ]);
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    public function test_category_can_be_updated(): void
    {
        $category = $this->existingIncomeCategory();

        $this->actingAs($this->user)
            ->put("/master/kategori/{$category->id}", $this->incomePayload(['name' => 'Jasa Audit']))
            ->assertRedirect('/master/kategori')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('transaction_categories', [
            'id'   => $category->id,
            'name' => 'Jasa Audit',
        ]);
    }

    public function test_update_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanyCategory();

        $this->actingAs($this->user)
            ->put("/master/kategori/{$other->id}", $this->incomePayload(['name' => 'Hacked']))
            ->assertNotFound();

        $this->assertDatabaseMissing('transaction_categories', ['id' => $other->id, 'name' => 'Hacked']);
    }

    // -----------------------------------------------------------------------
    // Toggle active
    // -----------------------------------------------------------------------

    public function test_category_can_be_deactivated(): void
    {
        $category = $this->existingIncomeCategory();
        $this->assertTrue($category->is_active);

        $this->actingAs($this->user)
            ->post("/master/kategori/{$category->id}/toggle")
            ->assertRedirect();

        $this->assertDatabaseHas('transaction_categories', ['id' => $category->id, 'is_active' => false]);
    }

    public function test_category_can_be_reactivated(): void
    {
        $category = $this->existingIncomeCategory();
        $category->update(['is_active' => false]);

        $this->actingAs($this->user)
            ->post("/master/kategori/{$category->id}/toggle")
            ->assertRedirect();

        $this->assertDatabaseHas('transaction_categories', ['id' => $category->id, 'is_active' => true]);
    }

    public function test_toggle_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanyCategory();

        $this->actingAs($this->user)
            ->post("/master/kategori/{$other->id}/toggle")
            ->assertNotFound();
    }

    // -----------------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------------

    public function test_category_can_be_deleted(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', $this->incomePayload());

        $category = TransactionCategory::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('name', 'Jasa Konsultasi')
            ->firstOrFail();

        $this->actingAs($this->user)
            ->delete("/master/kategori/{$category->id}")
            ->assertRedirect('/master/kategori')
            ->assertSessionHas('success');

        $this->assertSoftDeleted('transaction_categories', ['id' => $category->id]);
    }

    public function test_delete_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanyCategory();

        $this->actingAs($this->user)
            ->delete("/master/kategori/{$other->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('transaction_categories', ['id' => $other->id]);
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_required_fields_are_validated(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', [])
            ->assertSessionHasErrors(['account_id', 'name', 'type']);
    }

    public function test_invalid_type_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', $this->incomePayload(['type' => 'transfer']))
            ->assertSessionHasErrors('type');
    }

    public function test_nonexistent_account_id_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', $this->incomePayload(['account_id' => 99999]))
            ->assertSessionHasErrors('account_id');
    }

    public function test_name_max_length_is_enforced(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', $this->incomePayload(['name' => str_repeat('A', 101)]))
            ->assertSessionHasErrors('name');
    }

    public function test_description_max_length_is_enforced(): void
    {
        $this->actingAs($this->user)
            ->post('/master/kategori', $this->incomePayload([
                'description' => str_repeat('A', 256),
            ]))
            ->assertSessionHasErrors('description');
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function incomePayload(array $overrides = []): array
    {
        return array_merge([
            'account_id'  => $this->incomeAccount->id,
            'name'        => 'Jasa Konsultasi',
            'type'        => 'income',
            'description' => null,
        ], $overrides);
    }

    private function expensePayload(array $overrides = []): array
    {
        return array_merge([
            'account_id'  => $this->expenseAccount->id,
            'name'        => 'Biaya Operasional',
            'type'        => 'expense',
            'description' => null,
        ], $overrides);
    }

    /** Returns a seeded category (created by CompanySetupService). */
    private function existingIncomeCategory(): TransactionCategory
    {
        return TransactionCategory::withoutGlobalScope('company')
            ->where('company_id', $this->companyId)
            ->where('type', 'income')
            ->firstOrFail();
    }

    private function createOtherCompanyCategory(): TransactionCategory
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Kategori'],
            $otherUser
        );

        return TransactionCategory::withoutGlobalScope('company')
            ->where('company_id', $otherCompany->id)
            ->where('type', 'income')
            ->firstOrFail();
    }
}
