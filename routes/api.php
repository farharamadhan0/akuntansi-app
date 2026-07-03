<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ContextController;
use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(ForceJsonResponse::class)->name('api.v1.')->group(function () {
    Route::get('health', fn () => response()->json([
        'status' => 'ok',
    ]))->name('health');

    Route::post('auth/login', [AuthController::class, 'login'])->name('auth.login');

    Route::middleware(['auth:sanctum', 'verified', 'has.company'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::post('auth/logout-all', [AuthController::class, 'logoutAll'])->name('auth.logout-all');

        Route::get('me', [ContextController::class, 'me'])->name('me');
        Route::get('company', [ContextController::class, 'company'])->name('company');
        Route::get('permissions', [ContextController::class, 'permissions'])->name('permissions');
        Route::get('mobile/bootstrap', [ContextController::class, 'bootstrap'])->name('mobile.bootstrap');
    });
});
