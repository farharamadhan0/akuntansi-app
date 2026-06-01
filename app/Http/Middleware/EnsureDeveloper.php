<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDeveloper
{
    public function handle(Request $request, Closure $next): Response
    {
        $devEmails = array_filter(
            array_map('trim', explode(',', config('app.dev_emails', '')))
        );

        if (empty($devEmails) || !in_array($request->user()?->email, $devEmails, true)) {
            abort(403, 'Akses hanya untuk developer.');
        }

        return $next($request);
    }
}
