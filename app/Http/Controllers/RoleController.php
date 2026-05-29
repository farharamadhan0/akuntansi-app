<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
use App\Models\Role;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $roles = Role::where('company_id', $companyId)
            ->withCount('companyUsers')
            ->orderBy('is_system', 'desc')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Role $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'permissions' => $r->permissions ?? [],
                'is_system' => $r->is_system,
                'is_owner' => $r->name === 'Owner',
                'users_count' => $r->company_users_count,
            ]);

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'permissionGroups' => Permissions::groups(),
            'filters' => [
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Roles/Form', [
            'permissionGroups' => Permissions::groups(),
        ]);
    }

    public function store(RoleRequest $request): RedirectResponse
    {
        Role::create([
            'company_id' => auth()->user()->current_company_id,
            'name' => $request->input('name'),
            'permissions' => array_values(array_unique($request->input('permissions'))),
            'is_system' => false,
        ]);

        return redirect()
            ->route('roles.index')
            ->with('success', 'Role berhasil ditambahkan.');
    }

    public function edit(Role $role): Response
    {
        $this->authorizeRole($role);
        $this->guardSystem($role, 'Role bawaan tidak dapat diedit.');

        return Inertia::render('Roles/Form', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions ?? [],
            ],
            'permissionGroups' => Permissions::groups(),
        ]);
    }

    public function update(RoleRequest $request, Role $role): RedirectResponse
    {
        $this->authorizeRole($role);
        $this->guardSystem($role, 'Role bawaan tidak dapat diedit.');

        $role->update([
            'name' => $request->input('name'),
            'permissions' => array_values(array_unique($request->input('permissions'))),
        ]);

        return redirect()
            ->route('roles.index')
            ->with('success', 'Role berhasil diperbarui.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        $this->authorizeRole($role);

        if ($role->is_system) {
            return back()->with('error', 'Role bawaan tidak dapat dihapus.');
        }

        $usersCount = $role->companyUsers()->count();
        if ($usersCount > 0) {
            return back()->with(
                'error',
                "Role tidak dapat dihapus karena masih dipakai oleh {$usersCount} pengguna."
            );
        }

        $role->delete();

        return redirect()
            ->route('roles.index')
            ->with('success', 'Role berhasil dihapus.');
    }

    protected function authorizeRole(Role $role): void
    {
        if ($role->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }

    protected function guardSystem(Role $role, string $message): void
    {
        if ($role->is_system) {
            abort(403, $message);
        }
    }
}
