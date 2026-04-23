<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CashBankAccountController;
use App\Http\Controllers\TransactionCategoryController;
use App\Http\Controllers\IncomeTransactionController;
use App\Http\Controllers\ExpenseTransactionController;
use App\Http\Controllers\JournalEntryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PayableController;
use App\Http\Controllers\ReceivableController;
use App\Http\Controllers\ReceivablePaymentController;
use App\Http\Controllers\PayablePaymentController;
use App\Http\Controllers\ReportController;
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
        
        // Master Data - Pelanggan
        Route::prefix('master')->group(function () {
            Route::get('pelanggan', [CustomerController::class, 'index'])->name('customers.index');
            Route::get('pelanggan/tambah', [CustomerController::class, 'create'])->name('customers.create');
            Route::post('pelanggan', [CustomerController::class, 'store'])->name('customers.store');
            Route::get('pelanggan/{customer}/edit', [CustomerController::class, 'edit'])->name('customers.edit');
            Route::put('pelanggan/{customer}', [CustomerController::class, 'update'])->name('customers.update');
            Route::delete('pelanggan/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');
            Route::post('pelanggan/{customer}/toggle', [CustomerController::class, 'toggleActive'])->name('customers.toggle');

            // Master Data - Pemasok
            Route::get('pemasok', [SupplierController::class, 'index'])->name('suppliers.index');
            Route::get('pemasok/tambah', [SupplierController::class, 'create'])->name('suppliers.create');
            Route::post('pemasok', [SupplierController::class, 'store'])->name('suppliers.store');
            Route::get('pemasok/{supplier}/edit', [SupplierController::class, 'edit'])->name('suppliers.edit');
            Route::put('pemasok/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
            Route::delete('pemasok/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');
            Route::post('pemasok/{supplier}/toggle', [SupplierController::class, 'toggleActive'])->name('suppliers.toggle');

        // Master Data - Kas & Bank
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

        // Transaksi
        Route::prefix('transaksi')->group(function () {
            // Uang Masuk
            Route::get('uang-masuk', [IncomeTransactionController::class, 'index'])->name('income.index');
            Route::get('uang-masuk/catat', [IncomeTransactionController::class, 'create'])->name('income.create');
            Route::post('uang-masuk', [IncomeTransactionController::class, 'store'])->name('income.store');
            Route::get('uang-masuk/{income}', [IncomeTransactionController::class, 'show'])->name('income.show');
            Route::post('uang-masuk/{income}/batal', [IncomeTransactionController::class, 'void'])->name('income.void');

            // Uang Keluar
            Route::get('uang-keluar', [ExpenseTransactionController::class, 'index'])->name('expense.index');
            Route::get('uang-keluar/catat', [ExpenseTransactionController::class, 'create'])->name('expense.create');
            Route::post('uang-keluar', [ExpenseTransactionController::class, 'store'])->name('expense.store');
            Route::get('uang-keluar/{expense}', [ExpenseTransactionController::class, 'show'])->name('expense.show');
            Route::post('uang-keluar/{expense}/batal', [ExpenseTransactionController::class, 'void'])->name('expense.void');

            // Piutang
            Route::get('piutang', [ReceivableController::class, 'index'])->name('receivables.index');
            Route::get('piutang/buat', [ReceivableController::class, 'create'])->name('receivables.create');
            Route::post('piutang', [ReceivableController::class, 'store'])->name('receivables.store');
            Route::get('piutang/{receivable}', [ReceivableController::class, 'show'])->name('receivables.show');
            Route::post('piutang/{receivable}/batal', [ReceivableController::class, 'void'])->name('receivables.void');

            // Hutang
            Route::get('hutang', [PayableController::class, 'index'])->name('payables.index');
            Route::get('hutang/buat', [PayableController::class, 'create'])->name('payables.create');
            Route::post('hutang', [PayableController::class, 'store'])->name('payables.store');
            Route::get('hutang/{payable}', [PayableController::class, 'show'])->name('payables.show');
            Route::post('hutang/{payable}/batal', [PayableController::class, 'void'])->name('payables.void');

            // Pembayaran Piutang
            Route::get('piutang-bayar', [ReceivablePaymentController::class, 'index'])->name('receivable-payments.index');
            Route::get('piutang-bayar/catat', [ReceivablePaymentController::class, 'create'])->name('receivable-payments.create');
            Route::post('piutang-bayar', [ReceivablePaymentController::class, 'store'])->name('receivable-payments.store');
            Route::get('piutang-bayar/{payment}', [ReceivablePaymentController::class, 'show'])->name('receivable-payments.show');
            Route::post('piutang-bayar/{payment}/batal', [ReceivablePaymentController::class, 'void'])->name('receivable-payments.void');

            // Pembayaran Hutang
            Route::get('hutang-bayar', [PayablePaymentController::class, 'index'])->name('payable-payments.index');
            Route::get('hutang-bayar/catat', [PayablePaymentController::class, 'create'])->name('payable-payments.create');
            Route::post('hutang-bayar', [PayablePaymentController::class, 'store'])->name('payable-payments.store');
            Route::get('hutang-bayar/{payment}', [PayablePaymentController::class, 'show'])->name('payable-payments.show');
            Route::post('hutang-bayar/{payment}/batal', [PayablePaymentController::class, 'void'])->name('payable-payments.void');
        });

        // Jurnal Umum
        Route::prefix('jurnal')->group(function () {
            Route::get('/', [JournalEntryController::class, 'index'])->name('journals.index');
            Route::get('buat', [JournalEntryController::class, 'create'])->name('journals.create');
            Route::post('/', [JournalEntryController::class, 'store'])->name('journals.store');
            Route::get('{journal}', [JournalEntryController::class, 'show'])->name('journals.show');
            Route::get('{journal}/edit', [JournalEntryController::class, 'edit'])->name('journals.edit');
            Route::put('{journal}', [JournalEntryController::class, 'update'])->name('journals.update');
            Route::post('{journal}/posting', [JournalEntryController::class, 'post'])->name('journals.post');
            Route::post('{journal}/batal', [JournalEntryController::class, 'void'])->name('journals.void');
            Route::delete('{journal}', [JournalEntryController::class, 'destroy'])->name('journals.destroy');
        });

        // Laporan
        Route::prefix('laporan')->group(function () {
            Route::get('transaksi', [ReportController::class, 'transactionList'])->name('reports.transactions');
            Route::get('piutang', [ReportController::class, 'receivableList'])->name('reports.receivables');
            Route::get('hutang', [ReportController::class, 'payableList'])->name('reports.payables');
            Route::get('laba-rugi', [ReportController::class, 'incomeStatement'])->name('reports.income-statement');
            Route::get('neraca', [ReportController::class, 'balanceSheet'])->name('reports.balance-sheet');
            Route::get('arus-kas', [ReportController::class, 'cashFlow'])->name('reports.cash-flow');
            Route::get('buku-besar', [ReportController::class, 'generalLedger'])->name('reports.general-ledger');
        });
    });
});
