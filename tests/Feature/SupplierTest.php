<?php

namespace Tests\Feature;

use App\Models\Supplier;
use App\Models\User;
use App\Models\Payable;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Pemasok'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_supplier_list_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/master/supplier')
            ->assertOk();
    }

    public function test_supplier_create_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/master/supplier/tambah')
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/master/supplier')->assertRedirect('/login');
        $this->post('/master/supplier', $this->validPayload())->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Create
    // -----------------------------------------------------------------------

    public function test_valid_supplier_is_created(): void
    {
        $this->actingAs($this->user)
            ->post('/master/supplier', $this->validPayload())
            ->assertRedirect('/master/supplier')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('suppliers', [
            'company_id' => $this->companyId,
            'name'       => 'PT Bahan Jaya',
            'code'       => 'SUP-001',
            'email'      => 'bahan@example.com',
            'phone'      => '08198765432',
            'is_active'  => true,
        ]);
    }

    public function test_supplier_is_scoped_to_company(): void
    {
        $this->actingAs($this->user)
            ->post('/master/supplier', $this->validPayload());

        $this->assertDatabaseCount('suppliers', 1);
        $this->assertEquals($this->companyId, Supplier::withoutGlobalScope('company')->first()->company_id);
    }

    public function test_supplier_without_optional_fields_is_created(): void
    {
        $this->actingAs($this->user)
            ->post('/master/supplier', ['name' => 'Minimal Supplier'])
            ->assertRedirect('/master/supplier');

        $this->assertDatabaseHas('suppliers', [
            'company_id' => $this->companyId,
            'name'       => 'Minimal Supplier',
            'is_active'  => true,
        ]);
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    public function test_supplier_can_be_updated(): void
    {
        $supplier = $this->createSupplier(['name' => 'Lama']);

        $this->actingAs($this->user)
            ->put("/master/supplier/{$supplier->id}", $this->validPayload(['name' => 'Baru']))
            ->assertRedirect('/master/supplier')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('suppliers', [
            'id'   => $supplier->id,
            'name' => 'Baru',
        ]);
    }

    public function test_update_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanySupplier();

        $this->actingAs($this->user)
            ->put("/master/supplier/{$other->id}", $this->validPayload(['name' => 'Hacked']))
            ->assertNotFound();

        $this->assertDatabaseMissing('suppliers', ['id' => $other->id, 'name' => 'Hacked']);
    }

    // -----------------------------------------------------------------------
    // Toggle active
    // -----------------------------------------------------------------------

    public function test_supplier_can_be_deactivated(): void
    {
        $supplier = $this->createSupplier(['is_active' => true]);

        $this->actingAs($this->user)
            ->post("/master/supplier/{$supplier->id}/toggle")
            ->assertRedirect();

        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'is_active' => false]);
    }

    public function test_supplier_can_be_reactivated(): void
    {
        $supplier = $this->createSupplier(['is_active' => false]);

        $this->actingAs($this->user)
            ->post("/master/supplier/{$supplier->id}/toggle")
            ->assertRedirect();

        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'is_active' => true]);
    }

    // -----------------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------------

    public function test_supplier_with_no_payables_can_be_deleted(): void
    {
        $supplier = $this->createSupplier();

        $this->actingAs($this->user)
            ->delete("/master/supplier/{$supplier->id}")
            ->assertRedirect('/master/supplier')
            ->assertSessionHas('success');

        $this->assertSoftDeleted('suppliers', ['id' => $supplier->id]);
    }

    public function test_supplier_with_active_payable_cannot_be_deleted(): void
    {
        $supplier = $this->createSupplier();

        Payable::withoutGlobalScope('company')->create([
            'company_id'      => $this->companyId,
            'payable_number'  => 'AP-TEST-001',
            'supplier_id'     => $supplier->id,
            'date'            => now()->toDateString(),
            'due_date'        => now()->addDays(30)->toDateString(),
            'amount'          => 500000,
            'paid_amount'     => 0,
            'description'     => 'Test payable',
            'status'          => TransactionStatus::Posted,
            'payment_status'  => PaymentStatus::Unpaid,
            'created_by'      => $this->user->id,
        ]);

        $this->actingAs($this->user)
            ->delete("/master/supplier/{$supplier->id}")
            ->assertSessionHas('error');

        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'deleted_at' => null]);
    }

    public function test_delete_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanySupplier();

        $this->actingAs($this->user)
            ->delete("/master/supplier/{$other->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('suppliers', ['id' => $other->id, 'deleted_at' => null]);
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_name_is_required(): void
    {
        $this->actingAs($this->user)
            ->post('/master/supplier', [])
            ->assertSessionHasErrors('name');
    }

    public function test_duplicate_code_within_company_is_rejected(): void
    {
        $this->createSupplier(['code' => 'SUP-001']);

        $this->actingAs($this->user)
            ->post('/master/supplier', $this->validPayload(['code' => 'SUP-001']))
            ->assertSessionHasErrors('code');
    }

    public function test_same_code_in_different_companies_is_allowed(): void
    {
        $this->createSupplier(['code' => 'SUP-001']);

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Lain'], $otherUser);
        $otherUser->refresh();

        $this->actingAs($otherUser)
            ->post('/master/supplier', $this->validPayload(['code' => 'SUP-001']))
            ->assertRedirect('/master/supplier');
    }

    public function test_invalid_email_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/master/supplier', $this->validPayload(['email' => 'bukan-email']))
            ->assertSessionHasErrors('email');
    }

    // -----------------------------------------------------------------------
    // Search & filter
    // -----------------------------------------------------------------------

    public function test_search_filters_by_name(): void
    {
        $this->createSupplier(['name' => 'PT Maju']);
        $this->createSupplier(['name' => 'CV Mundur']);

        $response = $this->actingAs($this->user)
            ->get('/master/supplier?search=Maju')
            ->assertOk();

        $suppliers = $response->original->getData()['page']['props']['suppliers'];

        $this->assertCount(1, $suppliers);
        $this->assertEquals('PT Maju', $suppliers[0]['name']);
    }

    public function test_filter_active_only_returns_active_suppliers(): void
    {
        $this->createSupplier(['name' => 'Aktif', 'is_active' => true]);
        $this->createSupplier(['name' => 'Nonaktif', 'is_active' => false]);

        $response = $this->actingAs($this->user)
            ->get('/master/supplier?status=active')
            ->assertOk();

        $suppliers = $response->original->getData()['page']['props']['suppliers'];

        $this->assertCount(1, $suppliers);
        $this->assertEquals('Aktif', $suppliers[0]['name']);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name'    => 'PT Bahan Jaya',
            'code'    => 'SUP-001',
            'email'   => 'bahan@example.com',
            'phone'   => '08198765432',
            'address' => 'Jl. Industri No. 5, Surabaya',
            'tax_id'  => '01.234.567.8-901.000',
            'notes'   => 'Pemasok utama bahan baku',
        ], $overrides);
    }

    private function createSupplier(array $overrides = []): Supplier
    {
        return Supplier::withoutGlobalScope('company')->create(array_merge([
            'company_id' => $this->companyId,
            'name'       => 'Pemasok Test ' . uniqid(),
            'is_active'  => true,
        ], $overrides));
    }

    private function createOtherCompanySupplier(): Supplier
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Pemasok'],
            $otherUser
        );

        return Supplier::withoutGlobalScope('company')->create([
            'company_id' => $otherCompany->id,
            'name'       => 'Pemasok Asing',
            'is_active'  => true,
        ]);
    }
}
