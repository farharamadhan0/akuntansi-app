<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\CompanyUserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CashBankAccountController;
use App\Http\Controllers\TransactionCategoryController;
use App\Http\Controllers\IncomeTransactionController;
use App\Http\Controllers\ExpenseTransactionController;
use App\Http\Controllers\JournalEntryController;
use App\Http\Controllers\MenuSettingController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\PayableController;
use App\Http\Controllers\ReceivableController;
use App\Http\Controllers\ReceivablePaymentController;
use App\Http\Controllers\PayablePaymentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductionController;
use App\Http\Controllers\RecipeController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockAdjustmentController;
use App\Http\Controllers\DevDashboardController;
use App\Http\Controllers\DevCompanyController;
use App\Http\Controllers\DevFeedbackController;
use App\Http\Controllers\DevErrorLogController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\FnbAnalyticsController;
use App\Models\User;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function (Request $request) {
    if ($request->user()) {
        if (! $request->user()->hasVerifiedEmail()) {
            return redirect()->route('verification.notice');
        }

        return app(\App\Http\Middleware\EnsureHasCompany::class)->handle(
            $request,
            fn () => app(DashboardController::class)->index()->toResponse($request)
        );
    }

    return Inertia::render('Landing/Index');
})->name('landing');

// Email Verification (tidak perlu login)
Route::get('email/verify/{id}/{hash}', function (Request $request, string $id, string $hash) {
    abort_unless(
        $request->hasValidSignature(),
        403,
        'Link verifikasi tidak valid atau sudah kedaluwarsa.'
    );

    $user = User::findOrFail($id);

    abort_if(
        ! hash_equals(sha1($user->getEmailForVerification()), $hash),
        403,
        'Link verifikasi tidak valid.'
    );

    if (! $user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
    }

    return redirect()->route('login')->with('status', 'email-verified');
})->middleware('signed')->name('verification.verify');

// Guest routes
Route::middleware('guest')->group(function () {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store']);
    Route::get('auth/google/redirect', [LoginController::class, 'redirectToGoogle'])->name('google.redirect');
    Route::get('auth/google/callback', [LoginController::class, 'handleGoogleCallback'])->name('google.callback');

    Route::get('forgot-password', [PasswordResetController::class, 'createForgotPassword'])->name('password.request');
    Route::post('forgot-password', [PasswordResetController::class, 'storeForgotPassword'])->name('password.email');
    Route::get('reset-password/{token}', [PasswordResetController::class, 'createResetPassword'])->name('password.reset');
    Route::post('reset-password', [PasswordResetController::class, 'storeResetPassword'])->name('password.update');
    
    Route::get('register', [RegisterController::class, 'create'])->name('register');
    Route::post('register', [RegisterController::class, 'store']);
});

// Authenticated routes
Route::middleware('auth')->group(function () {
    Route::post('logout', [LoginController::class, 'destroy'])->name('logout');

    // Email Verification
    Route::get('email/verify', function (Request $request) {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(
                $request->user()->current_company_id
                    ? route('dashboard')
                    : route('company.setup')
            );
        }
        return Inertia::render('Auth/VerifyEmail');
    })->name('verification.notice');


    Route::post('email/verification-notification', function (Request $request) {
        $request->user()->sendEmailVerificationNotification();
        return back()->with('status', 'verification-link-sent');
    })->middleware('throttle:6,1')->name('verification.send');

    // Company setup (for users without a company)
    Route::get('company/setup', [CompanyController::class, 'create'])->middleware('verified')->name('company.setup');
    Route::post('company/setup', [CompanyController::class, 'store'])->middleware('verified');

    // Routes requiring active company
    Route::middleware(['verified', 'has.company'])->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::post('/dashboard/preferences', [DashboardController::class, 'savePreferences'])->name('dashboard.preferences');
        Route::get('/bantuan', [FeedbackController::class, 'pageIndex'])->name('feedback.page.index');
        Route::get('/bantuan/ticket/{feedback}', [FeedbackController::class, 'show'])->name('feedback.show');
        Route::get('/bantuan/ticket/{feedback}/attachment', [FeedbackController::class, 'attachment'])->name('feedback.attachment');
        Route::post('/bantuan/ticket', [FeedbackController::class, 'store'])->name('feedback.page.store');
        Route::post('/bantuan/ticket/{feedback}/messages', [FeedbackController::class, 'reply'])->name('feedback.page.messages.store');
        Route::get('/feedback/tickets', [FeedbackController::class, 'index'])->name('feedback.index');
        Route::post('/feedback', [FeedbackController::class, 'store'])->name('feedback.store');
        Route::post('/feedback/{feedback}/messages', [FeedbackController::class, 'reply'])->name('feedback.messages.store');
        
        // Master Data - Mitra (gabungan pelanggan & supplier)
        Route::prefix('master')->group(function () {
            Route::get('mitra', [PartnerController::class, 'index'])->middleware('permission:partners.view')->name('partners.index');
            Route::get('mitra/template-import/{type}', [PartnerController::class, 'downloadImportTemplate'])->middleware('permission:partners.create')->name('partners.import.template');
            Route::post('mitra/import/{type}', [PartnerController::class, 'import'])->middleware('permission:partners.create')->name('partners.import');
            Route::get('mitra/tambah', [PartnerController::class, 'create'])->middleware('permission:partners.create')->name('partners.create');
            Route::post('mitra', [PartnerController::class, 'store'])->middleware('permission:partners.create')->name('partners.store');
            Route::get('mitra/{partner}', [PartnerController::class, 'show'])->middleware('permission:partners.view')->name('partners.show');
            Route::get('mitra/{partner}/edit', [PartnerController::class, 'edit'])->middleware('permission:partners.edit')->name('partners.edit');
            Route::put('mitra/{partner}', [PartnerController::class, 'update'])->middleware('permission:partners.edit')->name('partners.update');
            Route::delete('mitra/{partner}', [PartnerController::class, 'destroy'])->middleware('permission:partners.delete')->name('partners.destroy');
            Route::post('mitra/{partner}/toggle', [PartnerController::class, 'toggleActive'])->middleware('permission:partners.edit')->name('partners.toggle');

        // Master Data - Kas & Bank
            Route::get('kas-bank', [CashBankAccountController::class, 'index'])->middleware('permission:cash_bank.view')->name('cash-bank.index');
            Route::get('kas-bank/tambah', [CashBankAccountController::class, 'create'])->middleware('permission:cash_bank.create')->name('cash-bank.create');
            Route::post('kas-bank', [CashBankAccountController::class, 'store'])->middleware('permission:cash_bank.create')->name('cash-bank.store');
            Route::get('kas-bank/{cashBank}/edit', [CashBankAccountController::class, 'edit'])->middleware('permission:cash_bank.edit')->name('cash-bank.edit');
            Route::put('kas-bank/{cashBank}', [CashBankAccountController::class, 'update'])->middleware('permission:cash_bank.edit')->name('cash-bank.update');
            Route::delete('kas-bank/{cashBank}', [CashBankAccountController::class, 'destroy'])->middleware('permission:cash_bank.delete')->name('cash-bank.destroy');
            Route::post('kas-bank/{cashBank}/toggle', [CashBankAccountController::class, 'toggleActive'])->middleware('permission:cash_bank.edit')->name('cash-bank.toggle');
            
            // Master Data - Kategori Transaksi
            Route::get('kategori', [TransactionCategoryController::class, 'index'])->middleware('permission:accounts.view')->name('categories.index');
            Route::get('kategori/tambah', [TransactionCategoryController::class, 'create'])->middleware('permission:accounts.create')->name('categories.create');
            Route::post('kategori', [TransactionCategoryController::class, 'store'])->middleware('permission:accounts.create')->name('categories.store');
            Route::get('kategori/{category}/edit', [TransactionCategoryController::class, 'edit'])->middleware('permission:accounts.edit')->name('categories.edit');
            Route::put('kategori/{category}', [TransactionCategoryController::class, 'update'])->middleware('permission:accounts.edit')->name('categories.update');
            Route::delete('kategori/{category}', [TransactionCategoryController::class, 'destroy'])->middleware('permission:accounts.delete')->name('categories.destroy');
            Route::post('kategori/{category}/toggle', [TransactionCategoryController::class, 'toggleActive'])->middleware('permission:accounts.edit')->name('categories.toggle');

            // Master Data - Produk
            Route::get('produk', [ProductController::class, 'index'])->middleware('permission:products.view')->name('products.index');
            Route::get('produk/template-import/{type}', [ProductController::class, 'downloadImportTemplate'])->middleware('permission:products.create')->name('products.import.template');
            Route::post('produk/import/{type}', [ProductController::class, 'import'])->middleware('permission:products.create')->name('products.import');
            Route::get('produk/tambah', [ProductController::class, 'create'])->middleware('permission:products.create')->name('products.create');
            Route::post('produk', [ProductController::class, 'store'])->middleware('permission:products.create')->name('products.store');
            Route::get('produk/{product}', [ProductController::class, 'show'])->middleware('permission:products.view')->name('products.show');
            Route::get('produk/{product}/edit', [ProductController::class, 'edit'])->middleware('permission:products.edit')->name('products.edit');
            Route::put('produk/{product}', [ProductController::class, 'update'])->middleware('permission:products.edit')->name('products.update');
            Route::delete('produk/{product}', [ProductController::class, 'destroy'])->middleware('permission:products.delete')->name('products.destroy');
            Route::post('produk/{product}/toggle', [ProductController::class, 'toggleActive'])->middleware('permission:products.edit')->name('products.toggle');
        });

        // F&B
        Route::prefix('fnb')->group(function () {
            Route::get('resep', [RecipeController::class, 'index'])->middleware('permission:recipes.view')->name('recipes.index');
            Route::get('resep/tambah', [RecipeController::class, 'create'])->middleware('permission:recipes.create')->name('recipes.create');
            Route::post('resep', [RecipeController::class, 'store'])->middleware('permission:recipes.create')->name('recipes.store');
            Route::get('resep/{recipe}/edit', [RecipeController::class, 'edit'])->middleware('permission:recipes.edit')->name('recipes.edit');
            Route::put('resep/{recipe}', [RecipeController::class, 'update'])->middleware('permission:recipes.edit')->name('recipes.update');
            Route::delete('resep/{recipe}', [RecipeController::class, 'destroy'])->middleware('permission:recipes.delete')->name('recipes.destroy');
            Route::get('produksi', [ProductionController::class, 'index'])->middleware('permission:productions.view')->name('productions.index');
            Route::get('produksi/buat', [ProductionController::class, 'create'])->middleware('permission:productions.create')->name('productions.create');
            Route::post('produksi', [ProductionController::class, 'store'])->middleware('permission:productions.create')->name('productions.store');
            Route::get('produksi/{production}', [ProductionController::class, 'show'])->middleware('permission:productions.view')->name('productions.show');
            Route::post('produksi/{production}/batal', [ProductionController::class, 'void'])->middleware('permission:productions.delete')->name('productions.void');
            Route::get('analitik', [FnbAnalyticsController::class, 'index'])->middleware('permission:recipes.view')->name('fnb.analytics');
        });

        // Transaksi
        Route::prefix('transaksi')->group(function () {
            // Uang Masuk
            Route::get('uang-masuk', [IncomeTransactionController::class, 'index'])->middleware('permission:income.view')->name('income.index');
            Route::get('uang-masuk/catat', [IncomeTransactionController::class, 'create'])->middleware('permission:income.create')->name('income.create');
            Route::post('uang-masuk', [IncomeTransactionController::class, 'store'])->middleware('permission:income.create')->name('income.store');
            Route::get('uang-masuk/{income}', [IncomeTransactionController::class, 'show'])->middleware('permission:income.view')->name('income.show');
            Route::post('uang-masuk/{income}/batal', [IncomeTransactionController::class, 'void'])->middleware('permission:income.delete')->name('income.void');
            Route::get('uang-masuk/{income}/koreksi', [IncomeTransactionController::class, 'edit'])->middleware('permission:income.edit')->name('income.edit');
            Route::post('uang-masuk/{income}/koreksi', [IncomeTransactionController::class, 'correct'])->middleware('permission:income.edit')->name('income.correct');

            // Uang Keluar
            Route::get('uang-keluar', [ExpenseTransactionController::class, 'index'])->middleware('permission:expense.view')->name('expense.index');
            Route::get('uang-keluar/catat', [ExpenseTransactionController::class, 'create'])->middleware('permission:expense.create')->name('expense.create');
            Route::post('uang-keluar', [ExpenseTransactionController::class, 'store'])->middleware('permission:expense.create')->name('expense.store');
            Route::get('uang-keluar/{expense}', [ExpenseTransactionController::class, 'show'])->middleware('permission:expense.view')->name('expense.show');
            Route::post('uang-keluar/{expense}/batal', [ExpenseTransactionController::class, 'void'])->middleware('permission:expense.delete')->name('expense.void');
            Route::get('uang-keluar/{expense}/koreksi', [ExpenseTransactionController::class, 'edit'])->middleware('permission:expense.edit')->name('expense.edit');
            Route::post('uang-keluar/{expense}/koreksi', [ExpenseTransactionController::class, 'correct'])->middleware('permission:expense.edit')->name('expense.correct');

            // Piutang
            Route::get('piutang', [ReceivableController::class, 'index'])->middleware('permission:receivables.view')->name('receivables.index');
            Route::get('piutang/buat', [ReceivableController::class, 'create'])->middleware('permission:receivables.create')->name('receivables.create');
            Route::post('piutang', [ReceivableController::class, 'store'])->middleware('permission:receivables.create')->name('receivables.store');
            Route::get('piutang/{receivable}', [ReceivableController::class, 'show'])->middleware('permission:receivables.view')->name('receivables.show');
            Route::post('piutang/{receivable}/batal', [ReceivableController::class, 'void'])->middleware('permission:receivables.delete')->name('receivables.void');
            Route::get('piutang/{receivable}/koreksi', [ReceivableController::class, 'edit'])->middleware('permission:receivables.edit')->name('receivables.edit');
            Route::post('piutang/{receivable}/koreksi', [ReceivableController::class, 'correct'])->middleware('permission:receivables.edit')->name('receivables.correct');

            // Hutang
            Route::get('hutang', [PayableController::class, 'index'])->middleware('permission:payables.view')->name('payables.index');
            Route::get('hutang/buat', [PayableController::class, 'create'])->middleware('permission:payables.create')->name('payables.create');
            Route::post('hutang', [PayableController::class, 'store'])->middleware('permission:payables.create')->name('payables.store');
            Route::get('hutang/{payable}', [PayableController::class, 'show'])->middleware('permission:payables.view')->name('payables.show');
            Route::post('hutang/{payable}/batal', [PayableController::class, 'void'])->middleware('permission:payables.delete')->name('payables.void');
            Route::get('hutang/{payable}/koreksi', [PayableController::class, 'edit'])->middleware('permission:payables.edit')->name('payables.edit');
            Route::post('hutang/{payable}/koreksi', [PayableController::class, 'correct'])->middleware('permission:payables.edit')->name('payables.correct');

            // Pembayaran Piutang
            Route::get('piutang-bayar', [ReceivablePaymentController::class, 'index'])->middleware('permission:receivables.view')->name('receivable-payments.index');
            Route::get('piutang-bayar/catat', [ReceivablePaymentController::class, 'create'])->middleware('permission:receivables.edit')->name('receivable-payments.create');
            Route::post('piutang-bayar', [ReceivablePaymentController::class, 'store'])->middleware('permission:receivables.edit')->name('receivable-payments.store');
            Route::get('piutang-bayar/{payment}', [ReceivablePaymentController::class, 'show'])->middleware('permission:receivables.view')->name('receivable-payments.show');
            Route::post('piutang-bayar/{payment}/batal', [ReceivablePaymentController::class, 'void'])->middleware('permission:receivables.delete')->name('receivable-payments.void');

            // Pembayaran Hutang
            Route::get('hutang-bayar', [PayablePaymentController::class, 'index'])->middleware('permission:payables.view')->name('payable-payments.index');
            Route::get('hutang-bayar/catat', [PayablePaymentController::class, 'create'])->middleware('permission:payables.edit')->name('payable-payments.create');
            Route::post('hutang-bayar', [PayablePaymentController::class, 'store'])->middleware('permission:payables.edit')->name('payable-payments.store');
            Route::get('hutang-bayar/{payment}', [PayablePaymentController::class, 'show'])->middleware('permission:payables.view')->name('payable-payments.show');
            Route::post('hutang-bayar/{payment}/batal', [PayablePaymentController::class, 'void'])->middleware('permission:payables.delete')->name('payable-payments.void');

            // Pembelian
            Route::get('pembelian', [PurchaseController::class, 'index'])->middleware('permission:purchases.view')->name('purchases.index');
            Route::get('pembelian/buat', [PurchaseController::class, 'create'])->middleware('permission:purchases.create')->name('purchases.create');
            Route::post('pembelian', [PurchaseController::class, 'store'])->middleware('permission:purchases.create')->name('purchases.store');
            Route::get('pembelian/{purchase}', [PurchaseController::class, 'show'])->middleware('permission:purchases.view')->name('purchases.show');
            Route::post('pembelian/{purchase}/batal', [PurchaseController::class, 'void'])->middleware('permission:purchases.delete')->name('purchases.void');
            Route::get('pembelian/{purchase}/koreksi', [PurchaseController::class, 'edit'])->middleware('permission:purchases.edit')->name('purchases.edit');
            Route::post('pembelian/{purchase}/koreksi', [PurchaseController::class, 'correct'])->middleware('permission:purchases.edit')->name('purchases.correct');

            // Penjualan
            Route::get('penjualan', [SaleController::class, 'index'])->middleware('permission:sales.view')->name('sales.index');
            Route::get('penjualan/buat', [SaleController::class, 'create'])->middleware('permission:sales.create')->name('sales.create');
            Route::post('penjualan', [SaleController::class, 'store'])->middleware('permission:sales.create')->name('sales.store');
            Route::get('penjualan/{sale}', [SaleController::class, 'show'])->middleware('permission:sales.view')->name('sales.show');
            Route::get('penjualan/{sale}/koreksi', [SaleController::class, 'edit'])->middleware('permission:sales.edit')->name('sales.edit');
            Route::post('penjualan/{sale}/koreksi', [SaleController::class, 'correct'])->middleware('permission:sales.edit')->name('sales.correct');
            Route::post('penjualan/{sale}/batal', [SaleController::class, 'void'])->middleware('permission:sales.delete')->name('sales.void');

            // Penyesuaian Stok
            Route::get('stok-penyesuaian', [StockAdjustmentController::class, 'index'])->middleware('permission:inventory_adjustments.view')->name('stock-adjustments.index');
            Route::get('stok-penyesuaian/buat', [StockAdjustmentController::class, 'create'])->middleware('permission:inventory_adjustments.create')->name('stock-adjustments.create');
            Route::post('stok-penyesuaian', [StockAdjustmentController::class, 'store'])->middleware('permission:inventory_adjustments.create')->name('stock-adjustments.store');
            Route::get('stok-penyesuaian/{stockAdjustment}', [StockAdjustmentController::class, 'show'])->middleware('permission:inventory_adjustments.view')->name('stock-adjustments.show');
            Route::post('stok-penyesuaian/{stockAdjustment}/batal', [StockAdjustmentController::class, 'void'])->middleware('permission:inventory_adjustments.delete')->name('stock-adjustments.void');
        });

        // Jurnal Umum
        Route::prefix('jurnal')->group(function () {
            Route::get('/', [JournalEntryController::class, 'index'])->middleware('permission:journals.view')->name('journals.index');
            Route::get('buat', [JournalEntryController::class, 'create'])->middleware('permission:journals.create')->name('journals.create');
            Route::post('/', [JournalEntryController::class, 'store'])->middleware('permission:journals.create')->name('journals.store');
            Route::get('{journal}', [JournalEntryController::class, 'show'])->middleware('permission:journals.view')->name('journals.show');
            Route::get('{journal}/edit', [JournalEntryController::class, 'edit'])->middleware('permission:journals.edit')->name('journals.edit');
            Route::put('{journal}', [JournalEntryController::class, 'update'])->middleware('permission:journals.edit')->name('journals.update');
            Route::post('{journal}/posting', [JournalEntryController::class, 'post'])->middleware('permission:journals.edit')->name('journals.post');
            Route::post('{journal}/batal', [JournalEntryController::class, 'void'])->middleware('permission:journals.delete')->name('journals.void');
            Route::delete('{journal}', [JournalEntryController::class, 'destroy'])->middleware('permission:journals.delete')->name('journals.destroy');
        });

        // Pengaturan Pengguna (khusus Owner)
        Route::middleware('is.owner')->prefix('pengaturan')->group(function () {
            Route::get('pengguna', [CompanyUserController::class, 'index'])->name('users.index');
            Route::get('pengguna/tambah', [CompanyUserController::class, 'create'])->name('users.create');
            Route::post('pengguna', [CompanyUserController::class, 'store'])->name('users.store');
            Route::get('pengguna/{user}/edit', [CompanyUserController::class, 'edit'])->name('users.edit');
            Route::put('pengguna/{user}', [CompanyUserController::class, 'update'])->name('users.update');
            Route::delete('pengguna/{user}', [CompanyUserController::class, 'destroy'])->name('users.destroy');

            // Role kustom
            Route::get('role', [RoleController::class, 'index'])->name('roles.index');
            Route::get('role/tambah', [RoleController::class, 'create'])->name('roles.create');
            Route::post('role', [RoleController::class, 'store'])->name('roles.store');
            Route::get('role/{role}/edit', [RoleController::class, 'edit'])->name('roles.edit');
            Route::put('role/{role}', [RoleController::class, 'update'])->name('roles.update');
            Route::delete('role/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');

            // Tampilan Menu (atur menu yang muncul untuk perusahaan)
            Route::get('fitur', [MenuSettingController::class, 'edit'])->name('settings.fitur.edit');
            Route::put('fitur', [MenuSettingController::class, 'update'])->name('settings.fitur.update');
        });

        // Laporan
        Route::prefix('laporan')->group(function () {
            Route::get('transaksi', [ReportController::class, 'transactionList'])->middleware('permission:reports.transactions')->name('reports.transactions');
            Route::get('laba-rugi', [ReportController::class, 'incomeStatement'])->middleware('permission:reports.income_statement')->name('reports.income-statement');
            Route::get('neraca', [ReportController::class, 'balanceSheet'])->middleware('permission:reports.balance_sheet')->name('reports.balance-sheet');
            Route::get('arus-kas', [ReportController::class, 'cashFlow'])->middleware('permission:reports.cash_flow')->name('reports.cash-flow');
            Route::get('buku-besar', [ReportController::class, 'generalLedger'])->middleware('permission:reports.general_ledger')->name('reports.general-ledger');
        });
    });

    // Developer Dashboard (akses via DEV_EMAILS)
    Route::middleware(['verified', 'is.dev'])->prefix('dev')->group(function () {
        Route::redirect('/', '/dev/dashboard');
        Route::get('dashboard', [DevDashboardController::class, 'index'])->name('dev.dashboard');
        Route::get('companies', [DevCompanyController::class, 'index'])->name('dev.companies.index');
        Route::get('companies/{company}', [DevCompanyController::class, 'show'])->name('dev.companies.show');
        Route::get('feedback', [DevFeedbackController::class, 'index'])->name('dev.feedback.index');
        Route::get('feedback/{feedback}/attachment', [DevFeedbackController::class, 'attachment'])->name('dev.feedback.attachment');
        Route::put('feedback/{feedback}', [DevFeedbackController::class, 'update'])->name('dev.feedback.update');
        Route::post('feedback/{feedback}/messages', [DevFeedbackController::class, 'reply'])->name('dev.feedback.messages.store');
        Route::get('error-logs', [DevErrorLogController::class, 'index'])->name('dev.error-logs.index');
    });
});
