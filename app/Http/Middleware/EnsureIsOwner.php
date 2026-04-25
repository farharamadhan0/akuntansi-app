<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureIsOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()?->isOwnerOf()) {
            abort(403, 'Hanya pemilik usaha yang dapat mengakses halaman ini.');
        }

        return $next($request);
    }
}
