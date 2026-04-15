<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompanySetupRequest;
use App\Services\CompanySetupService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    public function __construct(
        protected CompanySetupService $companySetupService
    ) {}

    public function create(): Response
    {
        if (auth()->user()->current_company_id) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Company/Setup');
    }

    public function store(CompanySetupRequest $request): RedirectResponse
    {
        $this->companySetupService->createCompany(
            $request->validated(),
            $request->user()
        );

        return redirect()->route('dashboard');
    }
}
