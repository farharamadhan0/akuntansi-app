<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHasCompany
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()->current_company_id) {
            return redirect()->route('company.setup');
        }

        return $next($request);
    }
}
