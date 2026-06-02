<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\CompanyUser;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DevCompanyController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $companies = Company::withoutTrashed()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('legal_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->withCount([
                'users',
                'transactions' => fn ($query) => $query->withoutGlobalScope('company'),
                'cashBankAccounts' => fn ($query) => $query->withoutGlobalScope('company'),
                'partners' => fn ($query) => $query->withoutGlobalScope('company'),
            ])
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Company $company) => [
                'id' => $company->id,
                'name' => $company->name,
                'legal_name' => $company->legal_name,
                'email' => $company->email,
                'phone' => $company->phone,
                'currency' => $company->currency,
                'created_at' => $company->created_at?->format('Y-m-d'),
                'users_count' => $company->users_count,
                'transactions_count' => $company->transactions_count,
                'cash_bank_accounts_count' => $company->cash_bank_accounts_count,
                'partners_count' => $company->partners_count,
            ]);

        return Inertia::render('Dev/Companies/Index', [
            'companies' => $companies,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function show(Company $company): Response
    {
        $company = Company::withoutTrashed()->findOrFail($company->id);

        $owner = CompanyUser::with([
            'user:id,name,email,email_verified_at,current_company_id',
            'role' => fn ($query) => $query->withoutGlobalScope('company')->select('id', 'name'),
        ])
            ->where('company_id', $company->id)
            ->whereHas('role', fn ($query) => $query->withoutGlobalScope('company')->where('name', 'Owner'))
            ->oldest()
            ->first();

        return Inertia::render('Dev/Companies/Show', [
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'legal_name' => $company->legal_name,
                'tax_id' => $company->tax_id,
                'address' => $company->address,
                'phone' => $company->phone,
                'email' => $company->email,
                'currency' => $company->currency,
                'timezone' => $company->timezone,
                'fiscal_year_start' => $company->fiscal_year_start,
                'logo_path' => $company->logo_path,
                'created_at' => $company->created_at?->format('Y-m-d H:i'),
                'updated_at' => $company->updated_at?->format('Y-m-d H:i'),
                'counts' => [
                    'users' => $company->users()->count(),
                    'transactions' => $company->transactions()->withoutGlobalScope('company')->count(),
                    'cash_bank_accounts' => $company->cashBankAccounts()->withoutGlobalScope('company')->count(),
                    'partners' => $company->partners()->withoutGlobalScope('company')->count(),
                    'roles' => $company->roles()->withoutGlobalScope('company')->count(),
                    'accounts' => $company->accounts()->withoutGlobalScope('company')->count(),
                ],
            ],
            'owner' => $owner ? [
                'id' => $owner->user?->id,
                'name' => $owner->user?->name,
                'email' => $owner->user?->email,
                'email_verified_at' => $owner->user?->email_verified_at?->format('Y-m-d H:i'),
                'current_company_id' => $owner->user?->current_company_id,
                'role' => $owner->role?->name,
                'is_active' => $owner->is_active,
                'joined_at' => $owner->created_at?->format('Y-m-d H:i'),
            ] : null,
        ]);
    }
}
