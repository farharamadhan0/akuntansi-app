<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompanyUserRequest;
use App\Models\CompanyUser;
use App\Models\Role;
use App\Services\CompanyUserService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CompanyUserController extends Controller
{
    public function __construct(protected CompanyUserService $service) {}

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $members = CompanyUser::with(['user:id,name,email,email_verified_at', 'role:id,name'])
            ->where('company_id', $companyId)
            ->get()
            ->map(fn (CompanyUser $m) => [
                'id' => $m->id,
                'user_id' => $m->user_id,
                'name' => $m->user->name,
                'email' => $m->user->email,
                'role_id' => $m->role_id,
                'role_name' => $m->role->name,
                'is_active' => $m->is_active,
                'is_owner' => $m->role->name === 'Owner',
                'is_self' => $m->user_id === auth()->id(),
                'is_verified' => !is_null($m->user->email_verified_at),
            ])
            ->sortBy([
                fn ($a, $b) => $b['is_owner'] <=> $a['is_owner'],
                fn ($a, $b) => strcmp($a['name'], $b['name']),
            ])
            ->values();

        $nonOwnerCount = $members->filter(fn ($m) => !$m['is_owner'])->count();

        return Inertia::render('Users/Index', [
            'members' => $members,
            'roles' => $this->assignableRoles($companyId),
            'can_add_member' => $nonOwnerCount < 3,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Users/Form', [
            'roles' => $this->assignableRoles(auth()->user()->current_company_id),
        ]);
    }

    public function store(CompanyUserRequest $request): RedirectResponse
    {
        $this->service->invite(auth()->user()->currentCompany, $request->validated());

        return redirect()
            ->route('users.index')
            ->with('success', 'Pengguna berhasil ditambahkan.');
    }

    public function edit(CompanyUser $user): Response
    {
        $this->authorizeMember($user);

        if ($user->role->name === 'Owner') {
            abort(403, 'Owner tidak dapat diedit dari halaman ini.');
        }

        return Inertia::render('Users/Form', [
            'member' => [
                'id' => $user->id,
                'name' => $user->user->name,
                'email' => $user->user->email,
                'role_id' => $user->role_id,
                'is_active' => $user->is_active,
            ],
            'roles' => $this->assignableRoles($user->company_id),
        ]);
    }

    public function update(CompanyUserRequest $request, CompanyUser $user): RedirectResponse
    {
        $this->authorizeMember($user);

        $this->service->updateMembership($user, $request->validated());

        return redirect()
            ->route('users.index')
            ->with('success', 'Pengguna berhasil diperbarui.');
    }

    public function destroy(CompanyUser $user): RedirectResponse
    {
        $this->authorizeMember($user);

        if ($user->user_id === auth()->id()) {
            return back()->with('error', 'Tidak dapat menghapus diri sendiri.');
        }

        $this->service->remove($user);

        return redirect()
            ->route('users.index')
            ->with('success', 'Pengguna berhasil dihapus.');
    }

    protected function authorizeMember(CompanyUser $user): void
    {
        if ($user->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }

    protected function assignableRoles(int $companyId)
    {
        return Role::where('company_id', $companyId)
            ->where('name', '!=', 'Owner')
            ->orderBy('name')
            ->get(['id', 'name']);
    }
}
