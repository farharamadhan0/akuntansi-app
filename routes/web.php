<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

// Guest routes
Route::middleware('guest')->group(function () {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store']);
    
    Route::get('register', [RegisterController::class, 'create'])->name('register');
    Route::post('register', [RegisterController::class, 'store']);
});

// Authenticated routes
Route::middleware('auth')->group(function () {
    Route::post('logout', [LoginController::class, 'destroy'])->name('logout');
    
    // Company setup (for users without a company)
    Route::get('company/setup', [CompanyController::class, 'create'])->name('company.setup');
    Route::post('company/setup', [CompanyController::class, 'store']);
    
    // Routes requiring active company
    Route::middleware('has.company')->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    });
});
