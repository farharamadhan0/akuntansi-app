<?php

namespace App\Services;

use App\Models\Company;
use App\Models\CompanyUser;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CompanyUserService
{
    public function invite(Company $company, array $data): User
    {
        $this->guardNotOwnerRole($company, $data['role_id']);
        $this->guardMemberLimit($company);

        return DB::transaction(function () use ($company, $data) {
            $user = User::where('email', $data['email'])->first();

            if ($user) {
                // Email sudah terdaftar (di company lain). Tidak ubah password user existing.
                $alreadyMember = CompanyUser::where('company_id', $company->id)
                    ->where('user_id', $user->id)
                    ->exists();

                if ($alreadyMember) {
                    throw ValidationException::withMessages([
                        'email' => 'Pengguna dengan email ini sudah menjadi anggota perusahaan.',
                    ]);
                }
            } else {
                $user = User::create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => Hash::make($data['password']),
                    'current_company_id' => $company->id,
                ]);

                $user->sendEmailVerificationNotification();
            }

            CompanyUser::create([
                'company_id' => $company->id,
                'user_id' => $user->id,
                'role_id' => $data['role_id'],
                'is_active' => $data['is_active'] ?? true,
            ]);

            if (!$user->current_company_id) {
                $user->update(['current_company_id' => $company->id]);
            }

            return $user;
        });
    }

    public function updateMembership(CompanyUser $member, array $data): void
    {
        // Tidak boleh mengubah role Owner atau menetapkan role Owner via UI
        $isOwnerMember = $member->role && $member->role->name === 'Owner';

        if ($isOwnerMember) {
            throw ValidationException::withMessages([
                'role_id' => 'Role Owner tidak dapat diubah.',
            ]);
        }

        $this->guardNotOwnerRole($member->company, $data['role_id']);

        $updates = ['role_id' => $data['role_id']];

        if (array_key_exists('is_active', $data)) {
            $updates['is_active'] = (bool) $data['is_active'];
        }

        $member->update($updates);

        // Update profil dasar pengguna jika diberikan
        if (!empty($data['name'])) {
            $member->user->update(['name' => $data['name']]);
        }
    }

    public function remove(CompanyUser $member): void
    {
        if ($member->role?->name === 'Owner') {
            throw ValidationException::withMessages([
                'id' => 'Owner tidak dapat dihapus.',
            ]);
        }

        $member->delete();
    }

    protected function guardMemberLimit(Company $company, int $limit = 3): void
    {
        $nonOwnerCount = CompanyUser::where('company_id', $company->id)
            ->whereHas('role', fn ($q) => $q->where('name', '!=', 'Owner'))
            ->count();

        if ($nonOwnerCount >= $limit) {
            throw ValidationException::withMessages([
                'email' => "Perusahaan ini sudah mencapai batas maksimal {$limit} pengguna.",
            ]);
        }
    }

    protected function guardNotOwnerRole(Company $company, int $roleId): void
    {
        $role = Role::where('company_id', $company->id)->find($roleId);

        if (!$role) {
            throw ValidationException::withMessages([
                'role_id' => 'Role tidak valid.',
            ]);
        }

        if ($role->name === 'Owner') {
            throw ValidationException::withMessages([
                'role_id' => 'Role Owner tidak dapat dipilih.',
            ]);
        }
    }
}
