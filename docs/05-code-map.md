# Code Map - Akuntansi App

Dokumen ini adalah **peta kode (code map)** untuk aplikasi Akuntansi. Tujuannya membantu developer menemukan file yang tepat dengan cepat saat melakukan maintenance, debugging, atau penambahan fitur.

> Referensi terkait: `docs/01-folder-structure.md`, `docs/03-schema-overview.md`, `docs/04-service-layer-design.md`.

---

## 1. Stack Teknologi

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Backend framework | Laravel | `^13.0` (PHP `^8.3`) |
| View bridge | Inertia.js | `inertiajs/inertia-laravel ^3.0` + `@inertiajs/react ^3.0.3` |
| Frontend | React + TypeScript | React `^19.2`, TS `^6.0` |
| Styling | TailwindCSS v4 | `^4.2` + `@tailwindcss/vite` |
| UI primitives | shadcn/ui (Radix + Base UI) | `components.json` |
| Icon | `lucide-react` | `^1.8` |
| Bundler | Vite | `^8.0` |
| Testing | PHPUnit | `^12.5` |

Script utama:

- `composer run dev` — jalankan server + queue + logs + vite secara paralel.
- `composer run test` — jalankan seluruh test PHPUnit.
- `npm run dev` / `npm run build` — Vite dev/build.

---

## 2. Peta Domain <-> Kode (End-to-End)

Setiap domain bisnis memiliki 4 layer: **Route → Controller → Service → Model/Migration**, ditambah **Request (validasi)**, **Frontend Pages**, dan **Tests**.

### 2.1 Autentikasi & Setup Perusahaan

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:21-35` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/Auth/LoginController.php`, `@/home/dev/development/akuntansi-app/app/Http/Controllers/Auth/RegisterController.php`, `@/home/dev/development/akuntansi-app/app/Http/Controllers/CompanyController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/Auth/LoginRequest.php`, `@/home/dev/development/akuntansi-app/app/Http/Requests/Auth/RegisterRequest.php`, `@/home/dev/development/akuntansi-app/app/Http/Requests/CompanySetupRequest.php` |
| Service | `@/home/dev/development/akuntansi-app/app/Services/CompanySetupService.php` |
| Middleware | `@/home/dev/development/akuntansi-app/app/Http/Middleware/EnsureHasCompany.php`, `@/home/dev/development/akuntansi-app/app/Http/Middleware/HandleInertiaRequests.php` |
| Model | `@/home/dev/development/akuntansi-app/app/Models/User.php`, `@/home/dev/development/akuntansi-app/app/Models/Company.php`, `@/home/dev/development/akuntansi-app/app/Models/CompanyUser.php`, `@/home/dev/development/akuntansi-app/app/Models/Role.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/Auth/Login.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Auth/Register.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Company/Setup.tsx` |

### 2.2 Dashboard

| Layer | File |
|-------|------|
| Route | `@/home/dev/development/akuntansi-app/routes/web.php:39` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/DashboardController.php` |
| Page | `@/home/dev/development/akuntansi-app/resources/js/Pages/Dashboard/Index.tsx` |

### 2.3 Master Data — Pelanggan (Customer)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:43-49` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/CustomerController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/CustomerRequest.php` |
| Model | `@/home/dev/development/akuntansi-app/app/Models/Customer.php` |
| Migration | `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000008_create_customers_table.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/MasterData/Customers/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/MasterData/Customers/Form.tsx` |
| Test | `@/home/dev/development/akuntansi-app/tests/Feature/CustomerTest.php` |

### 2.4 Master Data — Pemasok (Supplier)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:52-58` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/SupplierController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/SupplierRequest.php` |
| Model | `@/home/dev/development/akuntansi-app/app/Models/Supplier.php` |
| Migration | `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000009_create_suppliers_table.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/MasterData/Suppliers/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/MasterData/Suppliers/Form.tsx` |
| Test | `@/home/dev/development/akuntansi-app/tests/Feature/SupplierTest.php` |

### 2.5 Master Data — Kas & Bank

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:61-67` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/CashBankAccountController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/CashBankAccountRequest.php` |
| Model | `@/home/dev/development/akuntansi-app/app/Models/CashBankAccount.php` |
| Migration | `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000006_create_cash_bank_accounts_table.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/MasterData/CashBank/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/MasterData/CashBank/Form.tsx` |
| Test | `@/home/dev/development/akuntansi-app/tests/Feature/CashBankAccountTest.php` |

### 2.6 Master Data — Kategori Transaksi

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:70-76` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/TransactionCategoryController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/TransactionCategoryRequest.php` |
| Model | `@/home/dev/development/akuntansi-app/app/Models/TransactionCategory.php` |
| Migration | `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000007_create_transaction_categories_table.php`, `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000019_add_soft_deletes_to_transaction_categories_table.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/MasterData/Categories/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/MasterData/Categories/Form.tsx` |
| Test | `@/home/dev/development/akuntansi-app/tests/Feature/TransactionCategoryTest.php` |

### 2.7 Transaksi — Uang Masuk (Income)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:82-86` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/IncomeTransactionController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/IncomeTransactionRequest.php` |
| Service | `@/home/dev/development/akuntansi-app/app/Services/IncomeService.php` (methods: `create`, `post`, `void`) |
| Model | `@/home/dev/development/akuntansi-app/app/Models/Transaction.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/Transactions/Income/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Transactions/Income/Create.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Transactions/Income/Show.tsx` |
| Tests | `@/home/dev/development/akuntansi-app/tests/Feature/IncomeTransactionTest.php`, `@/home/dev/development/akuntansi-app/tests/Unit/IncomeServiceTest.php` |

### 2.8 Transaksi — Uang Keluar (Expense)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:89-93` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/ExpenseTransactionController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/ExpenseTransactionRequest.php` |
| Service | `@/home/dev/development/akuntansi-app/app/Services/ExpenseService.php` (methods: `create`, `post`, `void`) |
| Model | `@/home/dev/development/akuntansi-app/app/Models/Transaction.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/Transactions/Expense/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Transactions/Expense/Create.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Transactions/Expense/Show.tsx` |
| Test | `@/home/dev/development/akuntansi-app/tests/Feature/ExpenseTransactionTest.php` |

### 2.9 Transaksi — Transfer Antar Kas/Bank

> Service sudah tersedia, namun belum memiliki Controller/Route/Page (siap dipakai).

| Layer | File |
|-------|------|
| Service | `@/home/dev/development/akuntansi-app/app/Services/TransferService.php` (methods: `create`, `post`, `void`) |
| Model | `@/home/dev/development/akuntansi-app/app/Models/Transaction.php` |

### 2.10 Transaksi — Piutang (Receivable)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:96-100` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/ReceivableController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/ReceivableRequest.php` |
| Service | `@/home/dev/development/akuntansi-app/app/Services/ReceivableService.php` (methods: `create`, `post`, `void`, `updatePaymentStatus`) |
| Model | `@/home/dev/development/akuntansi-app/app/Models/Receivable.php` |
| Migration | `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000011_create_receivables_table.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/Receivables/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Receivables/Create.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Receivables/Show.tsx` |
| Tests | `@/home/dev/development/akuntansi-app/tests/Feature/ReceivableTest.php`, `@/home/dev/development/akuntansi-app/tests/Unit/ReceivableServiceTest.php` |

### 2.11 Transaksi — Hutang (Payable)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:103-107` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/PayableController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/PayableRequest.php` |
| Service | `@/home/dev/development/akuntansi-app/app/Services/PayableService.php` (methods: `create`, `post`, `void`, `updatePaymentStatus`) |
| Model | `@/home/dev/development/akuntansi-app/app/Models/Payable.php` |
| Migration | `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000012_create_payables_table.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/Payables/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Payables/Create.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Payables/Show.tsx` |
| Tests | `@/home/dev/development/akuntansi-app/tests/Feature/PayableTest.php`, `@/home/dev/development/akuntansi-app/tests/Unit/PayableServiceTest.php` |

### 2.12 Pembayaran Piutang/Hutang (Payment)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:110-114` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/ReceivablePaymentController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/ReceivablePaymentRequest.php` |
| Service | `@/home/dev/development/akuntansi-app/app/Services/PaymentService.php` (methods: `createReceivablePayment`, `createPayablePayment`, dan void) |
| Model | `@/home/dev/development/akuntansi-app/app/Models/Payment.php`, `@/home/dev/development/akuntansi-app/app/Models/PaymentAllocation.php` |
| Migration | `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000013_create_payments_table.php`, `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000014_create_payment_allocations_table.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/Receivables/Payments/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Receivables/Payments/Create.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Receivables/Payments/Show.tsx` |
| Test | `@/home/dev/development/akuntansi-app/tests/Feature/ReceivablePaymentTest.php` |

### 2.13 Jurnal Umum (General Journal)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:118-128` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/JournalEntryController.php` |
| Request | `@/home/dev/development/akuntansi-app/app/Http/Requests/JournalEntryRequest.php` |
| Service | `@/home/dev/development/akuntansi-app/app/Services/JournalService.php` (methods: `createEntry`, `createManualDraft`, `updateDraft`, `post`, `deleteDraft`, `voidEntry`, `getAccountBalance`) |
| Model | `@/home/dev/development/akuntansi-app/app/Models/JournalEntry.php`, `@/home/dev/development/akuntansi-app/app/Models/JournalLine.php` |
| Migration | `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000015_create_journal_entries_table.php`, `@/home/dev/development/akuntansi-app/database/migrations/2024_01_01_000016_create_journal_lines_table.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/Journals/Index.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Journals/Form.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Journals/Show.tsx` |
| Test | `@/home/dev/development/akuntansi-app/tests/Feature/JournalEntryTest.php` |

### 2.14 Laporan Keuangan (Reports)

| Layer | File |
|-------|------|
| Routes | `@/home/dev/development/akuntansi-app/routes/web.php:131-139` |
| Controller | `@/home/dev/development/akuntansi-app/app/Http/Controllers/ReportController.php` |
| Services | `@/home/dev/development/akuntansi-app/app/Services/ReportService.php`, `@/home/dev/development/akuntansi-app/app/Services/GeneralLedgerService.php`, `@/home/dev/development/akuntansi-app/app/Services/AccountBalanceService.php` |
| Pages | `@/home/dev/development/akuntansi-app/resources/js/Pages/Reports/TransactionList.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Reports/ReceivableList.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Reports/PayableList.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Reports/IncomeStatement.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Reports/BalanceSheet.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Reports/CashFlow.tsx`, `@/home/dev/development/akuntansi-app/resources/js/Pages/Reports/GeneralLedger.tsx` |
| Shared component | `@/home/dev/development/akuntansi-app/resources/js/components/reports/ReportFilters.tsx` |
| Tests | `@/home/dev/development/akuntansi-app/tests/Feature/ReportTest.php`, `@/home/dev/development/akuntansi-app/tests/Unit/ReportServiceTest.php` |

---

## 3. Service Layer (Business Logic)

Semua aturan akuntansi (posting jurnal, update saldo, void) **wajib** ditempatkan di service, bukan di controller.

| Service | Tanggung Jawab |
|---------|----------------|
| `@/home/dev/development/akuntansi-app/app/Services/CompanySetupService.php` | Membuat perusahaan baru beserta chart of accounts default. |
| `@/home/dev/development/akuntansi-app/app/Services/NumberGeneratorService.php` | Generator nomor dokumen (INV-xxxx, BYR-xxxx, JV-xxxx, dll). |
| `@/home/dev/development/akuntansi-app/app/Services/JournalService.php` | Pusat logika jurnal: create/post/void + validasi keseimbangan debit=kredit. |
| `@/home/dev/development/akuntansi-app/app/Services/IncomeService.php` | Transaksi uang masuk → jurnal otomatis. |
| `@/home/dev/development/akuntansi-app/app/Services/ExpenseService.php` | Transaksi uang keluar → jurnal otomatis. |
| `@/home/dev/development/akuntansi-app/app/Services/TransferService.php` | Transfer antar kas/bank → jurnal otomatis. |
| `@/home/dev/development/akuntansi-app/app/Services/ReceivableService.php` | Penjualan kredit, status lunas, void. |
| `@/home/dev/development/akuntansi-app/app/Services/PayableService.php` | Pembelian kredit, status lunas, void. |
| `@/home/dev/development/akuntansi-app/app/Services/PaymentService.php` | Alokasi pembayaran ke piutang/hutang, update `paid_amount`. |
| `@/home/dev/development/akuntansi-app/app/Services/AccountBalanceService.php` | Hitung saldo per akun (snapshot). |
| `@/home/dev/development/akuntansi-app/app/Services/GeneralLedgerService.php` | Buku besar per akun dengan saldo berjalan. |
| `@/home/dev/development/akuntansi-app/app/Services/ReportService.php` | Agregasi data untuk neraca, laba rugi, arus kas, daftar piutang/hutang. |

### Rantai Dependency Antar Service

```
CompanySetupService  ──► Company, Account, Role, User
NumberGeneratorService ──► (independent)
JournalService ──► NumberGeneratorService
IncomeService / ExpenseService / TransferService ──► JournalService, NumberGeneratorService
ReceivableService / PayableService ──► JournalService, NumberGeneratorService
PaymentService ──► JournalService, NumberGeneratorService, ReceivableService, PayableService
AccountBalanceService ──► JournalLine
GeneralLedgerService ──► JournalLine
ReportService ──► AccountBalanceService, GeneralLedgerService
```

---

## 4. Model Layer

| Model | Tabel | Trait Penting |
|-------|-------|---------------|
| `@/home/dev/development/akuntansi-app/app/Models/User.php` | `users` | — |
| `@/home/dev/development/akuntansi-app/app/Models/Company.php` | `companies` | `Auditable` |
| `@/home/dev/development/akuntansi-app/app/Models/CompanyUser.php` | `company_users` | pivot |
| `@/home/dev/development/akuntansi-app/app/Models/Role.php` | `roles` | — |
| `@/home/dev/development/akuntansi-app/app/Models/Account.php` | `accounts` | `BelongsToCompany` |
| `@/home/dev/development/akuntansi-app/app/Models/CashBankAccount.php` | `cash_bank_accounts` | `BelongsToCompany` |
| `@/home/dev/development/akuntansi-app/app/Models/TransactionCategory.php` | `transaction_categories` | `BelongsToCompany`, `SoftDeletes` |
| `@/home/dev/development/akuntansi-app/app/Models/Customer.php` | `customers` | `BelongsToCompany` |
| `@/home/dev/development/akuntansi-app/app/Models/Supplier.php` | `suppliers` | `BelongsToCompany` |
| `@/home/dev/development/akuntansi-app/app/Models/Transaction.php` | `transactions` | `BelongsToCompany`, `Auditable`, `HasJournalEntries`, `PreventsPostedDeletion` |
| `@/home/dev/development/akuntansi-app/app/Models/Receivable.php` | `receivables` | `BelongsToCompany`, `Auditable`, `HasJournalEntries`, `PreventsPostedDeletion` |
| `@/home/dev/development/akuntansi-app/app/Models/Payable.php` | `payables` | `BelongsToCompany`, `Auditable`, `HasJournalEntries`, `PreventsPostedDeletion` |
| `@/home/dev/development/akuntansi-app/app/Models/Payment.php` | `payments` | `BelongsToCompany`, `Auditable`, `HasJournalEntries` |
| `@/home/dev/development/akuntansi-app/app/Models/PaymentAllocation.php` | `payment_allocations` | — |
| `@/home/dev/development/akuntansi-app/app/Models/JournalEntry.php` | `journal_entries` | `BelongsToCompany`, `Auditable` |
| `@/home/dev/development/akuntansi-app/app/Models/JournalLine.php` | `journal_lines` | — |
| `@/home/dev/development/akuntansi-app/app/Models/FiscalPeriod.php` | `fiscal_periods` | `BelongsToCompany` |
| `@/home/dev/development/akuntansi-app/app/Models/AuditLog.php` | `audit_logs` | — |

### Traits

| Trait | Fungsi |
|-------|--------|
| `@/home/dev/development/akuntansi-app/app/Traits/BelongsToCompany.php` | Global scope filter `company_id`. |
| `@/home/dev/development/akuntansi-app/app/Traits/Auditable.php` | Auto-create entry di `audit_logs` pada create/update/delete. |
| `@/home/dev/development/akuntansi-app/app/Traits/HasJournalEntries.php` | Relasi morph ke `journal_entries`. |
| `@/home/dev/development/akuntansi-app/app/Traits/PreventsPostedDeletion.php` | Mencegah hapus record dengan status `posted`. |

---

## 5. Enums

| Enum | Nilai |
|------|-------|
| `@/home/dev/development/akuntansi-app/app/Enums/AccountType.php` | `Asset`, `Liability`, `Equity`, `Revenue`, `Expense` |
| `@/home/dev/development/akuntansi-app/app/Enums/CashBankType.php` | `Cash`, `Bank` |
| `@/home/dev/development/akuntansi-app/app/Enums/TransactionType.php` | `Income`, `Expense`, `Transfer` |
| `@/home/dev/development/akuntansi-app/app/Enums/TransactionStatus.php` | `Draft`, `Posted`, `Voided` |
| `@/home/dev/development/akuntansi-app/app/Enums/PaymentStatus.php` | `Unpaid`, `Partial`, `Paid` |
| `@/home/dev/development/akuntansi-app/app/Enums/PaymentType.php` | `Receivable`, `Payable` |

---

## 6. Frontend Layout & UI Kit

| File | Fungsi |
|------|--------|
| `@/home/dev/development/akuntansi-app/resources/js/app.tsx` | Entry Inertia + React root. |
| `@/home/dev/development/akuntansi-app/resources/js/bootstrap.ts` | Bootstrap axios + global setup. |
| `@/home/dev/development/akuntansi-app/resources/js/Layouts/AuthenticatedLayout.tsx` | Layout utama (sidebar + navbar) untuk halaman private. |
| `@/home/dev/development/akuntansi-app/resources/js/Layouts/GuestLayout.tsx` | Layout halaman auth. |
| `@/home/dev/development/akuntansi-app/resources/js/lib/utils.ts` | Helper `cn()` untuk class merging. |
| `@/home/dev/development/akuntansi-app/resources/js/lib/format.ts` | Formatter angka, mata uang, tanggal. |
| `@/home/dev/development/akuntansi-app/resources/js/global.css` | Global tokens & Tailwind imports. |

### UI Components (shadcn-style)

Lokasi: `@/home/dev/development/akuntansi-app/resources/js/components/ui/`

- `avatar.tsx`, `breadcrumb.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`,
  `filter-tabs.tsx`, `form-field.tsx`, `input.tsx`, `sidebar.tsx`, `table.tsx`, `textarea.tsx`

Konfigurasi generator: `@/home/dev/development/akuntansi-app/components.json`.

---

## 7. Database & Migrations

Urutan migrasi (menentukan foreign key):

1. `0001_01_01_000000_create_users_table.php`
2. `2024_01_01_000001_create_companies_table.php`
3. `2024_01_01_000002_create_roles_table.php`
4. `2024_01_01_000003_create_company_users_table.php`
5. `2024_01_01_000004_add_current_company_to_users_table.php`
6. `2024_01_01_000005_create_accounts_table.php`
7. `2024_01_01_000006_create_cash_bank_accounts_table.php`
8. `2024_01_01_000007_create_transaction_categories_table.php`
9. `2024_01_01_000008_create_customers_table.php`
10. `2024_01_01_000009_create_suppliers_table.php`
11. `2024_01_01_000010_create_transactions_table.php`
12. `2024_01_01_000011_create_receivables_table.php`
13. `2024_01_01_000012_create_payables_table.php`
14. `2024_01_01_000013_create_payments_table.php`
15. `2024_01_01_000014_create_payment_allocations_table.php`
16. `2024_01_01_000015_create_journal_entries_table.php`
17. `2024_01_01_000016_create_journal_lines_table.php`
18. `2024_01_01_000017_create_fiscal_periods_table.php`
19. `2024_01_01_000018_create_audit_logs_table.php`
20. `2024_01_01_000019_add_soft_deletes_to_transaction_categories_table.php`

> Lihat `docs/03-schema-overview.md` untuk ERD & definisi kolom detail.

Seeder: `@/home/dev/development/akuntansi-app/database/seeders/DatabaseSeeder.php`.
Factory: `@/home/dev/development/akuntansi-app/database/factories/UserFactory.php`.

---

## 8. Testing

Konfigurasi: `@/home/dev/development/akuntansi-app/phpunit.xml`.

| Tipe | Lokasi |
|------|--------|
| Feature (HTTP + DB) | `@/home/dev/development/akuntansi-app/tests/Feature/` |
| Unit (service-level) | `@/home/dev/development/akuntansi-app/tests/Unit/` |
| Base TestCase | `@/home/dev/development/akuntansi-app/tests/TestCase.php` |

Menjalankan test:

```bash
composer test                                     # full suite
php artisan test --filter=IncomeTransactionTest   # file spesifik
php artisan test tests/Unit/ReceivableServiceTest.php
```

---

## 9. Konfigurasi Penting

| File | Fungsi |
|------|--------|
| `@/home/dev/development/akuntansi-app/bootstrap/app.php` | Registrasi middleware alias (`has.company`), exception handling. |
| `@/home/dev/development/akuntansi-app/bootstrap/providers.php` | Daftar service provider. |
| `@/home/dev/development/akuntansi-app/config/app.php` | Timezone, locale, providers. |
| `@/home/dev/development/akuntansi-app/config/auth.php` | Guard & user provider. |
| `@/home/dev/development/akuntansi-app/config/database.php` | Koneksi DB. |
| `@/home/dev/development/akuntansi-app/vite.config.js` | Vite + Inertia integration. |
| `@/home/dev/development/akuntansi-app/tsconfig.json` | Path aliasing TS. |
| `@/home/dev/development/akuntansi-app/.env.example` | Template environment. |

---

## 10. Panduan Cepat untuk Developer

### 10.1 Menambah fitur CRUD baru (contoh: modul "Proyek")

1. **Migration** → `database/migrations/YYYY_MM_DD_create_projects_table.php`.
2. **Model** → `app/Models/Project.php` (tambahkan `use BelongsToCompany`).
3. **Enum** (jika perlu status) → `app/Enums/ProjectStatus.php`.
4. **Request** → `app/Http/Requests/ProjectRequest.php`.
5. **Service** (jika punya business rule) → `app/Services/ProjectService.php`.
6. **Controller** → `app/Http/Controllers/ProjectController.php`.
7. **Route** → tambahkan di `routes/web.php` di dalam `middleware('has.company')` group.
8. **Page React** → `resources/js/Pages/Projects/{Index,Form,Show}.tsx`.
9. **Menu** → daftarkan di `resources/js/Layouts/AuthenticatedLayout.tsx`.
10. **Test** → `tests/Feature/ProjectTest.php` + `tests/Unit/ProjectServiceTest.php` (jika ada service).

### 10.2 Alur debugging umum

| Gejala | Mulai dari |
|--------|-----------|
| Validation error tidak sesuai | `Http/Requests/*Request.php` |
| Data tersimpan tidak sesuai | `app/Services/*Service.php` (DB transaction di sini) |
| Jurnal tidak seimbang | `@/home/dev/development/akuntansi-app/app/Services/JournalService.php` method `validateLines` & `createEntry` |
| Saldo akun salah | `@/home/dev/development/akuntansi-app/app/Services/AccountBalanceService.php`, cek posting `JournalLine` |
| Laporan angka aneh | `@/home/dev/development/akuntansi-app/app/Services/ReportService.php` |
| Multi-tenant bocor (lihat data perusahaan lain) | Trait `@/home/dev/development/akuntansi-app/app/Traits/BelongsToCompany.php` + middleware `EnsureHasCompany` |
| Redirect ke setup company terus | `@/home/dev/development/akuntansi-app/app/Http/Middleware/EnsureHasCompany.php` |
| UI tidak update setelah submit | `onSuccess` / `preserveScroll` pada Inertia form di page terkait |
| Props tidak terbaca di React | `@/home/dev/development/akuntansi-app/app/Http/Middleware/HandleInertiaRequests.php` (shared props) |

### 10.3 Konvensi

- **Nama route**: `<modul>.<action>` (kebab-case), contoh: `receivable-payments.store`.
- **Bahasa URL**: Indonesia (`piutang`, `hutang`, `jurnal`) — terjemahan dari route `name`.
- **Status transaksi**: selalu gunakan enum `TransactionStatus`, jangan string literal.
- **Transaksi DB**: seluruh mutasi multi-tabel dibungkus `DB::transaction(...)` di service.
- **Angka uang**: disimpan sebagai `decimal(18,2)`, format di frontend via `lib/format.ts`.
- **Multi-tenant**: model wajib `use BelongsToCompany` kecuali `User`, `Role`, `AuditLog`.

---

## 11. Referensi Silang

- Struktur folder lengkap: `docs/01-folder-structure.md`
- Rencana & status migrasi fitur: `docs/02-migration-plan.md`
- Skema database & relasi: `docs/03-schema-overview.md`
- Desain service layer (input/output, error): `docs/04-service-layer-design.md`
- **Peta kode (dokumen ini)**: `docs/05-code-map.md`
