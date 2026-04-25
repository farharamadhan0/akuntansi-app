<?php

namespace Tests\Feature;

use App\Models\CompanyUser;
use App\Models\Role;
use App\Models\User;
use App\Services\CompanySetupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CompanyUserTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private int $companyId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();

        $company = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Test Pengguna'],
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

    private function adminRoleId(): int
    {
        return Role::where('company_id', $this->companyId)
            ->where('name', 'Admin')
            ->value('id');
    }

    private function ownerRoleId(): int
    {
        return Role::where('company_id', $this->companyId)
            ->where('name', 'Owner')
            ->value('id');
    }

    // -----------------------------------------------------------------------
    // Access control
    // -----------------------------------------------------------------------

    public function test_owner_can_access_user_management(): void
    {
        $this->actingAs($this->owner)
            ->get('/pengaturan/pengguna')
            ->assertOk();
    }

    public function test_non_owner_member_cannot_access_user_management(): void
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
            ->get('/pengaturan/pengguna')
            ->assertForbidden();

        $this->actingAs($staff)
            ->post('/pengaturan/pengguna', [
                'name' => 'X',
                'email' => 'x@x.test',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $this->staffRoleId(),
            ])
            ->assertForbidden();
    }

    public function test_guest_is_redirected(): void
    {
        $this->get('/pengaturan/pengguna')->assertRedirect('/login');
    }

    // -----------------------------------------------------------------------
    // Invite / create
    // -----------------------------------------------------------------------

    public function test_owner_can_invite_new_user(): void
    {
        $this->actingAs($this->owner)
            ->post('/pengaturan/pengguna', [
                'name' => 'Budi',
                'email' => 'budi@test.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $this->staffRoleId(),
            ])
            ->assertRedirect('/pengaturan/pengguna');

        $user = User::where('email', 'budi@test.com')->first();
        $this->assertNotNull($user);
        $this->assertDatabaseHas('company_users', [
            'company_id' => $this->companyId,
            'user_id' => $user->id,
            'role_id' => $this->staffRoleId(),
            'is_active' => true,
        ]);
    }

    public function test_owner_role_cannot_be_assigned_via_invite(): void
    {
        $this->actingAs($this->owner)
            ->from('/pengaturan/pengguna/tambah')
            ->post('/pengaturan/pengguna', [
                'name' => 'Coba',
                'email' => 'coba@test.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $this->ownerRoleId(),
            ])
            ->assertSessionHasErrors('role_id');

        $this->assertDatabaseMissing('users', ['email' => 'coba@test.com']);
    }

    public function test_existing_user_in_other_company_can_be_invited_without_password(): void
    {
        $existing = User::factory()->create([
            'email' => 'dipakai@test.com',
            'password' => Hash::make('original-secret'),
        ]);
        $otherOwner = User::factory()->create();
        app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Lain'],
            $otherOwner,
        );

        $this->actingAs($this->owner)
            ->post('/pengaturan/pengguna', [
                'name' => 'Diabaikan',
                'email' => 'dipakai@test.com',
                'role_id' => $this->staffRoleId(),
            ])
            ->assertRedirect('/pengaturan/pengguna');

        $this->assertDatabaseHas('company_users', [
            'company_id' => $this->companyId,
            'user_id' => $existing->id,
            'role_id' => $this->staffRoleId(),
        ]);

        $existing->refresh();
        $this->assertTrue(Hash::check('original-secret', $existing->password));
    }

    public function test_duplicate_member_in_same_company_is_rejected(): void
    {
        $staff = User::factory()->create();
        CompanyUser::create([
            'company_id' => $this->companyId,
            'user_id' => $staff->id,
            'role_id' => $this->staffRoleId(),
            'is_active' => true,
        ]);

        $this->actingAs($this->owner)
            ->post('/pengaturan/pengguna', [
                'name' => 'Ulang',
                'email' => $staff->email,
                'role_id' => $this->adminRoleId(),
            ])
            ->assertSessionHasErrors('email');
    }

    // -----------------------------------------------------------------------
    // Update / delete
    // -----------------------------------------------------------------------

    public function test_owner_can_update_member_role(): void
    {
        $staff = User::factory()->create();
        $member = CompanyUser::create([
            'company_id' => $this->companyId,
            'user_id' => $staff->id,
            'role_id' => $this->staffRoleId(),
            'is_active' => true,
        ]);

        $this->actingAs($this->owner)
            ->put("/pengaturan/pengguna/{$member->id}", [
                'name' => $staff->name,
                'role_id' => $this->adminRoleId(),
                'is_active' => true,
            ])
            ->assertRedirect('/pengaturan/pengguna');

        $this->assertDatabaseHas('company_users', [
            'id' => $member->id,
            'role_id' => $this->adminRoleId(),
        ]);
    }

    public function test_cannot_change_role_to_owner(): void
    {
        $staff = User::factory()->create();
        $member = CompanyUser::create([
            'company_id' => $this->companyId,
            'user_id' => $staff->id,
            'role_id' => $this->staffRoleId(),
            'is_active' => true,
        ]);

        $this->actingAs($this->owner)
            ->from('/pengaturan/pengguna')
            ->put("/pengaturan/pengguna/{$member->id}", [
                'name' => $staff->name,
                'role_id' => $this->ownerRoleId(),
                'is_active' => true,
            ])
            ->assertSessionHasErrors('role_id');

        $this->assertDatabaseHas('company_users', [
            'id' => $member->id,
            'role_id' => $this->staffRoleId(),
        ]);
    }

    public function test_owner_cannot_be_edited(): void
    {
        $ownerMember = CompanyUser::where('company_id', $this->companyId)
            ->where('user_id', $this->owner->id)
            ->firstOrFail();

        $this->actingAs($this->owner)
            ->get("/pengaturan/pengguna/{$ownerMember->id}/edit")
            ->assertForbidden();
    }

    public function test_owner_can_remove_staff(): void
    {
        $staff = User::factory()->create();
        $member = CompanyUser::create([
            'company_id' => $this->companyId,
            'user_id' => $staff->id,
            'role_id' => $this->staffRoleId(),
            'is_active' => true,
        ]);

        $this->actingAs($this->owner)
            ->delete("/pengaturan/pengguna/{$member->id}")
            ->assertRedirect('/pengaturan/pengguna');

        $this->assertDatabaseMissing('company_users', ['id' => $member->id]);
        $this->assertDatabaseHas('users', ['id' => $staff->id]);
    }

    public function test_owner_cannot_remove_self(): void
    {
        $ownerMember = CompanyUser::where('company_id', $this->companyId)
            ->where('user_id', $this->owner->id)
            ->firstOrFail();

        $this->actingAs($this->owner)
            ->from('/pengaturan/pengguna')
            ->delete("/pengaturan/pengguna/{$ownerMember->id}")
            ->assertRedirect('/pengaturan/pengguna');

        $this->assertDatabaseHas('company_users', ['id' => $ownerMember->id]);
    }

    public function test_cannot_access_member_from_other_company(): void
    {
        $otherOwner = User::factory()->create();
        $otherCompany = app(CompanySetupService::class)->createCompany(
            ['name' => 'PT Luar'],
            $otherOwner,
        );
        $otherMember = CompanyUser::where('company_id', $otherCompany->id)
            ->where('user_id', $otherOwner->id)
            ->firstOrFail();

        $this->actingAs($this->owner)
            ->get("/pengaturan/pengguna/{$otherMember->id}/edit")
            ->assertForbidden();
    }

    // -----------------------------------------------------------------------
    // Middleware regression: invited user without current_company_id
    // -----------------------------------------------------------------------

    public function test_invited_user_with_null_current_company_is_auto_assigned(): void
    {
        $staff = User::factory()->create(['current_company_id' => null]);
        CompanyUser::create([
            'company_id' => $this->companyId,
            'user_id' => $staff->id,
            'role_id' => $this->staffRoleId(),
            'is_active' => true,
        ]);

        $this->actingAs($staff)
            ->get('/')
            ->assertOk();

        $staff->refresh();
        $this->assertSame($this->companyId, $staff->current_company_id);
    }

    public function test_user_without_any_membership_is_redirected_to_setup(): void
    {
        $orphan = User::factory()->create(['current_company_id' => null]);

        $this->actingAs($orphan)
            ->get('/')
            ->assertRedirect('/company/setup');
    }
}