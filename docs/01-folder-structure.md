# Folder Structure - Akuntansi App

## Overview

This Laravel monolith follows a **domain-driven structure** within app/ to keep accounting logic organized and maintainable.

## Directory Layout

```
akuntansi-app/
├── app/
│   ├── Console/
│   │   └── Commands/
│   │       └── CloseAccountingPeriod.php
│   │
│   ├── Enums/
│   │   ├── AccountType.php           # Asset, Liability, Equity, Revenue, Expense
│   │   ├── TransactionType.php       # income, expense, transfer
│   │   ├── TransactionStatus.php     # draft, posted, voided
│   │   ├── PaymentStatus.php         # unpaid, partial, paid
│   │   └── JournalEntrySource.php    # manual, transaction, payment, etc.
│   │
│   ├── Exceptions/
│   │   ├── AccountingException.php
│   │   ├── InsufficientBalanceException.php
│   │   └── UnbalancedJournalException.php
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginController.php
│   │   │   │   ├── RegisterController.php
│   │   │   │   └── CompanySetupController.php
│   │   │   │
│   │   │   ├── Dashboard/
│   │   │   │   └── DashboardController.php
│   │   │   │
│   │   │   ├── Master/
│   │   │   │   ├── AccountController.php
│   │   │   │   ├── CashBankAccountController.php
│   │   │   │   ├── TransactionCategoryController.php
│   │   │   │   ├── CustomerController.php
│   │   │   │   └── SupplierController.php
│   │   │   │
│   │   │   ├── Transaction/
│   │   │   │   ├── IncomeController.php
│   │   │   │   ├── ExpenseController.php
│   │   │   │   ├── TransferController.php
│   │   │   │   ├── ReceivableController.php
│   │   │   │   ├── PayableController.php
│   │   │   │   └── PaymentController.php
│   │   │   │
│   │   │   ├── Report/
│   │   │   │   ├── JournalReportController.php
│   │   │   │   ├── LedgerReportController.php
│   │   │   │   ├── TrialBalanceController.php
│   │   │   │   ├── IncomeStatementController.php
│   │   │   │   └── BalanceSheetController.php
│   │   │   │
│   │   │   └── Settings/
│   │   │       ├── CompanySettingsController.php
│   │   │       └── UserSettingsController.php
│   │   │
│   │   ├── Middleware/
│   │   │   ├── EnsureCompanySelected.php
│   │   │   ├── CheckCompanyAccess.php
│   │   │   └── SetCompanyContext.php
│   │   │
│   │   └── Requests/
│   │       ├── Auth/
│   │       ├── Master/
│   │       ├── Transaction/
│   │       └── Settings/
│   │
│   ├── Models/
│   │   ├── User.php
│   │   ├── Company.php
│   │   ├── Role.php
│   │   ├── CompanyUser.php
│   │   │
│   │   ├── Account.php
│   │   ├── CashBankAccount.php
│   │   ├── TransactionCategory.php
│   │   │
│   │   ├── Customer.php
│   │   ├── Supplier.php
│   │   │
│   │   ├── Transaction.php
│   │   ├── Receivable.php
│   │   ├── Payable.php
│   │   ├── Payment.php
│   │   ├── PaymentAllocation.php
│   │   │
│   │   ├── JournalEntry.php
│   │   ├── JournalLine.php
│   │   │
│   │   ├── FiscalPeriod.php
│   │   └── AuditLog.php
│   │
│   ├── Policies/
│   │   ├── CompanyPolicy.php
│   │   ├── TransactionPolicy.php
│   │   └── ReportPolicy.php
│   │
│   ├── Providers/
│   │   ├── AppServiceProvider.php
│   │   └── AuthServiceProvider.php
│   │
│   ├── Services/
│   │   ├── Accounting/
│   │   │   ├── JournalService.php           # Core: create/validate journal entries
│   │   │   ├── AccountBalanceService.php    # Calculate account balances
│   │   │   └── FiscalPeriodService.php      # Period management
│   │   │
│   │   ├── Transaction/
│   │   │   ├── IncomeService.php            # Income + auto journal
│   │   │   ├── ExpenseService.php           # Expense + auto journal
│   │   │   ├── TransferService.php          # Transfer + auto journal
│   │   │   ├── ReceivableService.php        # AR management
│   │   │   ├── PayableService.php           # AP management
│   │   │   └── PaymentService.php           # Payment allocation
│   │   │
│   │   ├── Report/
│   │   │   ├── JournalReportService.php
│   │   │   ├── LedgerReportService.php
│   │   │   ├── TrialBalanceService.php
│   │   │   ├── IncomeStatementService.php
│   │   │   └── BalanceSheetService.php
│   │   │
│   │   └── Company/
│   │       ├── CompanySetupService.php      # Initial setup + seed accounts
│   │       └── CompanyContextService.php    # Tenant context
│   │
│   └── Traits/
│       ├── BelongsToCompany.php             # Auto-scope by company_id
│       ├── HasJournalEntries.php
│       └── Auditable.php
│
├── config/
│   └── akuntansi.php                        # App-specific config
│
├── database/
│   ├── migrations/
│   │   └── [timestamped migrations]
│   │
│   └── seeders/
│       ├── DatabaseSeeder.php
│       ├── RoleSeeder.php
│       └── DefaultAccountSeeder.php         # Default COA template
│
├── resources/
│   ├── js/
│   │   ├── app.jsx
│   │   │
│   │   ├── Components/
│   │   │   ├── UI/                          # Reusable UI (Button, Input, Modal, etc.)
│   │   │   ├── Form/                        # Form components
│   │   │   ├── Table/                       # DataTable, Pagination
│   │   │   └── Layout/                      # AppLayout, Sidebar, Navbar
│   │   │
│   │   ├── Hooks/
│   │   │   ├── useCompany.js
│   │   │   └── useFormatCurrency.js
│   │   │
│   │   ├── Lib/
│   │   │   └── utils.js
│   │   │
│   │   └── Pages/
│   │       ├── Auth/
│   │       │   ├── Login.jsx
│   │       │   ├── Register.jsx
│   │       │   └── SetupCompany.jsx
│   │       │
│   │       ├── Dashboard/
│   │       │   └── Index.jsx
│   │       │
│   │       ├── Master/
│   │       │   ├── Akun/                    # Chart of Accounts
│   │       │   ├── KasBank/                 # Cash & Bank
│   │       │   ├── Kategori/                # Categories
│   │       │   ├── Pelanggan/               # Customers
│   │       │   └── Supplier/                # Suppliers
│   │       │
│   │       ├── Transaksi/
│   │       │   ├── UangMasuk/               # Income
│   │       │   ├── UangKeluar/              # Expense
│   │       │   ├── Transfer/                # Transfer
│   │       │   ├── Piutang/                 # Receivables
│   │       │   ├── Hutang/                  # Payables
│   │       │   └── Pembayaran/              # Payments
│   │       │
│   │       ├── Laporan/
│   │       │   ├── JurnalUmum.jsx           # General Journal
│   │       │   ├── BukuBesar.jsx            # General Ledger
│   │       │   ├── NeracaSaldo.jsx          # Trial Balance
│   │       │   ├── LabaRugi.jsx             # Income Statement
│   │       │   └── Neraca.jsx               # Balance Sheet
│   │       │
│   │       └── Pengaturan/
│   │           ├── Perusahaan.jsx           # Company Settings
│   │           └── Pengguna.jsx             # User Settings
│   │
│   └── css/
│       └── app.css
│
├── routes/
│   ├── web.php
│   └── auth.php
│
├── tests/
│   ├── Feature/
│   │   ├── Auth/
│   │   ├── Transaction/
│   │   └── Report/
│   │
│   └── Unit/
│       └── Services/
│           ├── JournalServiceTest.php
│           └── PaymentServiceTest.php
│
└── docs/
    ├── 01-folder-structure.md
    ├── 02-migration-plan.md
    ├── 03-schema-overview.md
    └── 04-service-layer-design.md
```

## Key Architecture Decisions

### 1. **Services Layer** (`app/Services/`)
All business logic lives here. Controllers stay thin - they only:
- Validate input (via Form Requests)
- Call service methods
- Return Inertia responses

### 2. **Multi-Tenant Scoping** (`BelongsToCompany` trait)
Every tenant-scoped model uses this trait which:
- Auto-adds `company_id` on create
- Auto-applies global scope for queries
- Prevents cross-tenant data access

### 3. **Enums for Type Safety**
PHP 8.1+ enums for all status/type fields to prevent magic strings.

### 4. **Indonesian UI Structure**
React pages use Indonesian folder names matching the UI navigation:
- `Transaksi/UangMasuk/` → "Uang Masuk" menu
- `Laporan/LabaRugi.jsx` → "Laba Rugi" report

### 5. **Journal-Centric Accounting**
All financial data flows through `JournalService`:
- Transactions don't store balances
- Reports query `journal_lines` aggregated by account
- This ensures audit trail and double-entry integrity
