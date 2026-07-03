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

        if (! $user) {
            abort(403);
        }

        if (!$user->current_company_id) {
            $firstCompanyId = $user->companies()
                ->wherePivot('is_active', true)
                ->value('companies.id');

            if (!$firstCompanyId) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'User belum memiliki perusahaan aktif.',
                        'code' => 'company_required',
                    ], 409);
                }

                return redirect()->route('company.setup');
            }

            $user->update(['current_company_id' => $firstCompanyId]);
            $user->refresh();
        }

        $belongsToCompany = $user->companies()
            ->where('companies.id', $user->current_company_id)
            ->wherePivot('is_active', true)
            ->exists();

        if (!$belongsToCompany) {
            $firstCompanyId = $user->companies()
                ->wherePivot('is_active', true)
                ->value('companies.id');

            $user->update(['current_company_id' => $firstCompanyId]);
            $user->refresh();

            if (!$firstCompanyId) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'User belum memiliki perusahaan aktif.',
                        'code' => 'company_required',
                    ], 409);
                }

                return redirect()->route('company.setup');
            }
        }

        return $next($request);
    }
}
