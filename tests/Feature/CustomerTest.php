<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use App\Models\Receivable;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private int $companyId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Pelanggan'],
            $this->user
        );

        $this->user->refresh();
        $this->companyId = $company->id;
    }

    // -----------------------------------------------------------------------
    // Page access
    // -----------------------------------------------------------------------

    public function test_customer_list_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/master/pelanggan')
            ->assertOk();
    }

    public function test_customer_create_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get('/master/pelanggan/tambah')
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/master/pelanggan')->assertRedirect('/login');
        $this->post('/master/pelanggan', $this->validPayload())->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Create
    // -----------------------------------------------------------------------

    public function test_valid_customer_is_created(): void
    {
        $this->actingAs($this->user)
            ->post('/master/pelanggan', $this->validPayload())
            ->assertRedirect('/master/pelanggan')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('customers', [
            'company_id' => $this->companyId,
            'name'       => 'Budi Santoso',
            'code'       => 'CUST-001',
            'email'      => 'budi@example.com',
            'phone'      => '08123456789',
            'is_active'  => true,
        ]);
    }

    public function test_customer_is_scoped_to_company(): void
    {
        $this->actingAs($this->user)
            ->post('/master/pelanggan', $this->validPayload());

        $this->assertDatabaseCount('customers', 1);
        $this->assertEquals($this->companyId, Customer::withoutGlobalScope('company')->first()->company_id);
    }

    public function test_customer_without_optional_fields_is_created(): void
    {
        $this->actingAs($this->user)
            ->post('/master/pelanggan', ['name' => 'Minimal Customer'])
            ->assertRedirect('/master/pelanggan');

        $this->assertDatabaseHas('customers', [
            'company_id' => $this->companyId,
            'name'       => 'Minimal Customer',
            'is_active'  => true,
        ]);
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    public function test_customer_can_be_updated(): void
    {
        $customer = $this->createCustomer(['name' => 'Lama']);

        $this->actingAs($this->user)
            ->put("/master/pelanggan/{$customer->id}", $this->validPayload(['name' => 'Baru']))
            ->assertRedirect('/master/pelanggan')
            ->assertSessionHas('success');

        $this->assertDatabaseHas('customers', [
            'id'   => $customer->id,
            'name' => 'Baru',
        ]);
    }

    public function test_update_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanyCustomer();

        // BelongsToCompany global scope causes model-not-found (404) before
        // authorizeCompany even runs — 404 is the correct security response.
        $this->actingAs($this->user)
            ->put("/master/pelanggan/{$other->id}", $this->validPayload(['name' => 'Hacked']))
            ->assertNotFound();

        $this->assertDatabaseMissing('customers', ['id' => $other->id, 'name' => 'Hacked']);
    }

    // -----------------------------------------------------------------------
    // Toggle active
    // -----------------------------------------------------------------------

    public function test_customer_can_be_deactivated(): void
    {
        $customer = $this->createCustomer(['is_active' => true]);

        $this->actingAs($this->user)
            ->post("/master/pelanggan/{$customer->id}/toggle")
            ->assertRedirect();

        $this->assertDatabaseHas('customers', ['id' => $customer->id, 'is_active' => false]);
    }

    public function test_customer_can_be_reactivated(): void
    {
        $customer = $this->createCustomer(['is_active' => false]);

        $this->actingAs($this->user)
            ->post("/master/pelanggan/{$customer->id}/toggle")
            ->assertRedirect();

        $this->assertDatabaseHas('customers', ['id' => $customer->id, 'is_active' => true]);
    }

    // -----------------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------------

    public function test_customer_with_no_receivables_can_be_deleted(): void
    {
        $customer = $this->createCustomer();

        $this->actingAs($this->user)
            ->delete("/master/pelanggan/{$customer->id}")
            ->assertRedirect('/master/pelanggan')
            ->assertSessionHas('success');

        $this->assertSoftDeleted('customers', ['id' => $customer->id]);
    }

    public function test_customer_with_active_receivable_cannot_be_deleted(): void
    {
        $customer = $this->createCustomer();

        Receivable::withoutGlobalScope('company')->create([
            'company_id'       => $this->companyId,
            'receivable_number' => 'RCV-TEST-001',
            'customer_id'      => $customer->id,
            'date'             => now()->toDateString(),
            'due_date'         => now()->addDays(30)->toDateString(),
            'amount'           => 500000,
            'paid_amount'      => 0,
            'description'      => 'Test receivable',
            'status'           => TransactionStatus::Posted,
            'payment_status'   => PaymentStatus::Unpaid,
            'created_by'       => $this->user->id,
        ]);

        $this->actingAs($this->user)
            ->delete("/master/pelanggan/{$customer->id}")
            ->assertSessionHas('error');

        $this->assertDatabaseHas('customers', ['id' => $customer->id, 'deleted_at' => null]);
    }

    public function test_delete_from_other_company_is_rejected(): void
    {
        $other = $this->createOtherCompanyCustomer();

        // BelongsToCompany global scope causes model-not-found (404) before
        // authorizeCompany even runs — 404 is the correct security response.
        $this->actingAs($this->user)
            ->delete("/master/pelanggan/{$other->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('customers', ['id' => $other->id, 'deleted_at' => null]);
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_name_is_required(): void
    {
        $this->actingAs($this->user)
            ->post('/master/pelanggan', [])
            ->assertSessionHasErrors('name');
    }

    public function test_duplicate_code_within_company_is_rejected(): void
    {
        $this->createCustomer(['code' => 'CUST-001']);

        $this->actingAs($this->user)
            ->post('/master/pelanggan', $this->validPayload(['code' => 'CUST-001']))
            ->assertSessionHasErrors('code');
    }

    public function test_same_code_in_different_companies_is_allowed(): void
    {
        $this->createCustomer(['code' => 'CUST-001']);

        $otherUser = User::factory()->create();
        app(CompanySetupService::class)->createCompany(['name' => 'PT Lain'], $otherUser);
        $otherUser->refresh();

        // Other company user can use the same code
        $this->actingAs($otherUser)
            ->post('/master/pelanggan', $this->validPayload(['code' => 'CUST-001']))
            ->assertRedirect('/master/pelanggan');
    }

    public function test_invalid_email_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/master/pelanggan', $this->validPayload(['email' => 'bukan-email']))
            ->assertSessionHasErrors('email');
    }

    public function test_negative_credit_limit_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->post('/master/pelanggan', $this->validPayload(['credit_limit' => -100]))
            ->assertSessionHasErrors('credit_limit');
    }

    // -----------------------------------------------------------------------
    // Search & filter
    // -----------------------------------------------------------------------

    public function test_search_filters_by_name(): void
    {
        $this->createCustomer(['name' => 'Andi Wijaya']);
        $this->createCustomer(['name' => 'Budi Santoso']);

        $response = $this->actingAs($this->user)
            ->get('/master/pelanggan?search=Andi')
            ->assertOk();

        $customers = $response->original->getData()['page']['props']['customers'];

        $this->assertCount(1, $customers);
        $this->assertEquals('Andi Wijaya', $customers[0]['name']);
    }

    public function test_filter_active_only_returns_active_customers(): void
    {
        $this->createCustomer(['name' => 'Aktif', 'is_active' => true]);
        $this->createCustomer(['name' => 'Nonaktif', 'is_active' => false]);

        $response = $this->actingAs($this->user)
            ->get('/master/pelanggan?status=active')
            ->assertOk();

        $customers = $response->original->getData()['page']['props']['customers'];

        $this->assertCount(1, $customers);
        $this->assertEquals('Aktif', $customers[0]['name']);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name'         => 'Budi Santoso',
            'code'         => 'CUST-001',
            'email'        => 'budi@example.com',
            'phone'        => '08123456789',
            'address'      => 'Jl. Raya No. 1, Jakarta',
            'credit_limit' => 5000000,
        ], $overrides);
    }

    private function createCustomer(array $overrides = []): Customer
    {
        return Customer::withoutGlobalScope('company')->create(array_merge([
            'company_id' => $this->companyId,
            'name'       => 'Pelanggan Test ' . uniqid(),
            'is_active'  => true,
        ], $overrides));
    }

    private function createOtherCompanyCustomer(): Customer
    {
        $otherUser = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Asing Pelanggan'],
            $otherUser
        );

        return Customer::withoutGlobalScope('company')->create([
            'company_id' => $otherCompany->id,
            'name'       => 'Pelanggan Asing',
            'is_active'  => true,
        ]);
    }
}
