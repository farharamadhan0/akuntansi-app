<?php

namespace Tests\Feature;

use App\Models\CompanyUser;
use App\Models\Role;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private int $companyId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Role'],
            $this->owner,
        );

        $this->owner->refresh();
        $this->companyId = $company->id;
    }

    private function staffRoleId(): int
    {
        return Role::where('company_id', $this->companyId)
            ->where('name', 'Staff')
            ->value('id');
    }

    // -----------------------------------------------------------------------
    // Access control
    // -----------------------------------------------------------------------

    public function test_owner_can_access_role_management(): void
    {
        $this->actingAs($this->owner)
            ->get('/pengaturan/role')
            ->assertOk();
    }

    public function test_non_owner_member_cannot_access_role_management(): void
    {
        $staff = User::factory()->create();
        CompanyUser::create([
            'company_id' => $this->companyId,
            'user_id' => $staff->id,
            'role_id' => $this->staffRoleId(),
            'is_active' => true,
        ]);
        $staff->update(['current_company_id' => $this->companyId]);

        $this->actingAs($staff)
            ->get('/pengaturan/role')
            ->assertForbidden();

        $this->actingAs($staff)
            ->post('/pengaturan/role', [
                'name' => 'X',
                'permissions' => ['accounts.view'],
            ])
            ->assertForbidden();
    }

    public function test_guest_is_redirected(): void
    {
        $this->get('/pengaturan/role')->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Create
    // -----------------------------------------------------------------------

    public function test_owner_can_create_custom_role(): void
    {
        $this->actingAs($this->owner)
            ->post('/pengaturan/role', [
                'name' => 'Akuntan',
                'permissions' => ['accounts.view', 'income.view', 'income.create'],
            ])
            ->assertRedirect('/pengaturan/role');

        $role = Role::where('company_id', $this->companyId)
            ->where('name', 'Akuntan')
            ->first();

        $this->assertNotNull($role);
        $this->assertFalse($role->is_system);
        $this->assertEqualsCanonicalizing(
            ['accounts.view', 'income.view', 'income.create'],
            $role->permissions,
        );
    }

    public function test_create_rejects_invalid_permission(): void
    {
        $this->actingAs($this->owner)
            ->from('/pengaturan/role/tambah')
            ->post('/pengaturan/role', [
                'name' => 'Aneh',
                'permissions' => ['accounts.view', 'foo.bar'],
            ])
            ->assertSessionHasErrors('permissions.1');

        $this->assertDatabaseMissing('roles', [
            'company_id' => $this->companyId,
            'name' => 'Aneh',
        ]);
    }

    public function test_create_rejects_empty_permissions(): void
    {
        $this->actingAs($this->owner)
            ->from('/pengaturan/role/tambah')
            ->post('/pengaturan/role', [
                'name' => 'Kosong',
                'permissions' => [],
            ])
            ->assertSessionHasErrors('permissions');
    }

    public function test_create_rejects_duplicate_name_in_same_company(): void
    {
        $this->actingAs($this->owner)
            ->from('/pengaturan/role/tambah')
            ->post('/pengaturan/role', [
                'name' => 'Admin', // sudah ada (system)
                'permissions' => ['accounts.view'],
            ])
            ->assertSessionHasErrors('name');
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    public function test_owner_can_update_custom_role(): void
    {
        $role = Role::create([
            'company_id' => $this->companyId,
            'name' => 'Kasir',
            'permissions' => ['income.view'],
            'is_system' => false,
        ]);

        $this->actingAs($this->owner)
            ->put("/pengaturan/role/{$role->id}", [
                'name' => 'Kasir Senior',
                'permissions' => ['income.view', 'income.create'],
            ])
            ->assertRedirect('/pengaturan/role');

        $role->refresh();
        $this->assertSame('Kasir Senior', $role->name);
        $this->assertEqualsCanonicalizing(
            ['income.view', 'income.create'],
            $role->permissions,
        );
    }

    public function test_system_role_cannot_be_edited(): void
    {
        $admin = Role::where('company_id', $this->companyId)
            ->where('name', 'Admin')
            ->first();

        $this->actingAs($this->owner)
            ->get("/pengaturan/role/{$admin->id}/edit")
            ->assertForbidden();

        $this->actingAs($this->owner)
            ->put("/pengaturan/role/{$admin->id}", [
                'name' => 'Admin Baru',
                'permissions' => ['accounts.view'],
            ])
            ->assertForbidden();

        $admin->refresh();
        $this->assertSame('Admin', $admin->name);
    }

    // -----------------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------------

    public function test_owner_can_delete_unused_custom_role(): void
    {
        $role = Role::create([
            'company_id' => $this->companyId,
            'name' => 'Sementara',
            'permissions' => ['accounts.view'],
            'is_system' => false,
        ]);

        $this->actingAs($this->owner)
            ->delete("/pengaturan/role/{$role->id}")
            ->assertRedirect('/pengaturan/role');

        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    public function test_cannot_delete_system_role(): void
    {
        $admin = Role::where('company_id', $this->companyId)
            ->where('name', 'Admin')
            ->first();

        $this->actingAs($this->owner)
            ->from('/pengaturan/role')
            ->delete("/pengaturan/role/{$admin->id}")
            ->assertRedirect('/pengaturan/role')
            ->assertSessionHas('error');

        $this->assertDatabaseHas('roles', ['id' => $admin->id]);
    }

    public function test_cannot_delete_role_in_use(): void
    {
        $role = Role::create([
            'company_id' => $this->companyId,
            'name' => 'Dipakai',
            'permissions' => ['accounts.view'],
            'is_system' => false,
        ]);

        $user = User::factory()->create();
        CompanyUser::create([
            'company_id' => $this->companyId,
            'user_id' => $user->id,
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $this->actingAs($this->owner)
            ->from('/pengaturan/role')
            ->delete("/pengaturan/role/{$role->id}")
            ->assertRedirect('/pengaturan/role')
            ->assertSessionHas('error');

        $this->assertDatabaseHas('roles', ['id' => $role->id]);
    }

    // -----------------------------------------------------------------------
    // Tenant isolation
    // -----------------------------------------------------------------------

    public function test_cannot_access_role_from_other_company(): void
    {
        $otherOwner = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Luar'],
            $otherOwner,
        );

        $otherRole = Role::where('company_id', $otherCompany->id)
            ->where('name', 'Staff')
            ->first();

        // BelongsToCompany global scope -> 404 saat route binding lintas tenant
        $this->actingAs($this->owner)
            ->get("/pengaturan/role/{$otherRole->id}/edit")
            ->assertNotFound();
    }

    // -----------------------------------------------------------------------
    // Integrasi: custom role tampil di dropdown invite user
    // -----------------------------------------------------------------------

    public function test_custom_role_is_assignable_to_users(): void
    {
        $custom = Role::create([
            'company_id' => $this->companyId,
            'name' => 'Akuntan',
            'permissions' => ['accounts.view'],
            'is_system' => false,
        ]);

        $this->actingAs($this->owner)
            ->post('/pengaturan/pengguna', [
                'name' => 'Andi',
                'email' => 'andi@test.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $custom->id,
            ])
            ->assertRedirect('/pengaturan/pengguna');

        $user = User::where('email', 'andi@test.com')->first();
        $this->assertDatabaseHas('company_users', [
            'company_id' => $this->companyId,
            'user_id' => $user->id,
            'role_id' => $custom->id,
        ]);
    }
}
