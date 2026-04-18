<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHasCompany
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user->current_company_id) {
            return redirect()->route('company.setup');
        }

        $belongsToCompany = $user->companies()
            ->where('companies.id', $user->current_company_id)
            ->wherePivot('is_active', true)
            ->exists();

        if (!$belongsToCompany) {
            $user->update(['current_company_id' => null]);
            return redirect()->route('company.setup');
        }

        return $next($request);
    }
}
