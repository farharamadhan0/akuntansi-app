<?php

namespace Tests\Feature;

use App\Models\CompanyUser;
use App\Models\Role;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private int $companyId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Permission'],
            $this->owner,
        );

        $this->owner->refresh();
        $this->companyId = $company->id;
    }

    private function makeMember(array $permissions): User
    {
        $user = User::factory()->create();

        $role = Role::create([
            'company_id' => $this->companyId,
            'name' => 'Custom-' . uniqid(),
            'permissions' => $permissions,
            'is_system' => false,
        ]);

        CompanyUser::create([
            'company_id' => $this->companyId,
            'user_id' => $user->id,
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $user->update(['current_company_id' => $this->companyId]);

        return $user->fresh();
    }

    public function test_owner_with_wildcard_can_access_everything(): void
    {
        $this->actingAs($this->owner)
            ->get('/master/pelanggan')
            ->assertOk();

        $this->actingAs($this->owner)
            ->get('/transaksi/uang-masuk')
            ->assertOk();
    }

    public function test_user_without_permission_is_forbidden(): void
    {
        $member = $this->makeMember(['dashboard.view']);

        $this->actingAs($member)->get('/master/pelanggan')->assertForbidden();
        $this->actingAs($member)->get('/master/pelanggan/tambah')->assertForbidden();
        $this->actingAs($member)->get('/transaksi/uang-masuk')->assertForbidden();
        $this->actingAs($member)->get('/laporan/laba-rugi')->assertForbidden();
    }

    public function test_user_with_view_permission_can_access_index_only(): void
    {
        $member = $this->makeMember(['customers.view']);

        $this->actingAs($member)->get('/master/pelanggan')->assertOk();
        $this->actingAs($member)->get('/master/pelanggan/tambah')->assertForbidden();
        $this->actingAs($member)
            ->post('/master/pelanggan', ['name' => 'X'])
            ->assertForbidden();
    }

    public function test_create_permission_does_not_grant_delete(): void
    {
        $member = $this->makeMember(['customers.view', 'customers.create']);

        $this->actingAs($member)
            ->post('/master/pelanggan', [
                'name' => 'Test',
            ])
            // create lolos middleware (validasi/redirect setelahnya tidak 403)
            ->assertStatus(302);

        // delete tetap dilarang
        $customer = \App\Models\Customer::create([
            'company_id' => $this->companyId,
            'name' => 'Delete Me',
        ]);

        $this->actingAs($member)
            ->delete("/master/pelanggan/{$customer->id}")
            ->assertForbidden();
    }

    public function test_report_permissions_are_independent_per_report(): void
    {
        $member = $this->makeMember(['reports.income_statement']);

        $this->actingAs($member)->get('/laporan/laba-rugi')->assertOk();
        $this->actingAs($member)->get('/laporan/neraca')->assertForbidden();
        $this->actingAs($member)->get('/laporan/arus-kas')->assertForbidden();
    }

    public function test_inertia_shares_permissions_to_frontend(): void
    {
        $member = $this->makeMember(['dashboard.view', 'customers.view']);

        $this->actingAs($member)
            ->get('/')
            ->assertInertia(fn ($page) => $page
                ->where('auth.user.permissions', ['dashboard.view', 'customers.view'])
                ->where('auth.user.is_owner', false));
    }

    public function test_owner_inertia_shares_wildcard(): void
    {
        $this->actingAs($this->owner)
            ->get('/')
            ->assertInertia(fn ($page) => $page
                ->where('auth.user.permissions', ['*'])
                ->where('auth.user.is_owner', true));
    }
}
