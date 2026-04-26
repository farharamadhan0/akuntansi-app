<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Pastikan user terautentikasi memiliki minimal satu dari permission
     * yang diberikan (OR semantics). Owner role punya '*' yang otomatis lolos.
     *
     * Penggunaan: ->middleware('permission:customers.view')
     *              ->middleware('permission:customers.edit,customers.create')
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        abort(403, 'Anda tidak memiliki izin untuk tindakan ini.');
    }
}
