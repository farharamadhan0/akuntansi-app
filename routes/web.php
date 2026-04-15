<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CashBankAccountController;
use App\Http\Controllers\TransactionCategoryController;
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
        
        // Master Data - Kas & Bank
        Route::prefix('master')->group(function () {
            Route::get('kas-bank', [CashBankAccountController::class, 'index'])->name('cash-bank.index');
            Route::get('kas-bank/tambah', [CashBankAccountController::class, 'create'])->name('cash-bank.create');
            Route::post('kas-bank', [CashBankAccountController::class, 'store'])->name('cash-bank.store');
            Route::get('kas-bank/{cashBank}/edit', [CashBankAccountController::class, 'edit'])->name('cash-bank.edit');
            Route::put('kas-bank/{cashBank}', [CashBankAccountController::class, 'update'])->name('cash-bank.update');
            Route::delete('kas-bank/{cashBank}', [CashBankAccountController::class, 'destroy'])->name('cash-bank.destroy');
            Route::post('kas-bank/{cashBank}/toggle', [CashBankAccountController::class, 'toggleActive'])->name('cash-bank.toggle');
            
            // Master Data - Kategori Transaksi
            Route::get('kategori', [TransactionCategoryController::class, 'index'])->name('categories.index');
            Route::get('kategori/tambah', [TransactionCategoryController::class, 'create'])->name('categories.create');
            Route::post('kategori', [TransactionCategoryController::class, 'store'])->name('categories.store');
            Route::get('kategori/{category}/edit', [TransactionCategoryController::class, 'edit'])->name('categories.edit');
            Route::put('kategori/{category}', [TransactionCategoryController::class, 'update'])->name('categories.update');
            Route::delete('kategori/{category}', [TransactionCategoryController::class, 'destroy'])->name('categories.destroy');
            Route::post('kategori/{category}/toggle', [TransactionCategoryController::class, 'toggleActive'])->name('categories.toggle');
        });
    });
});
