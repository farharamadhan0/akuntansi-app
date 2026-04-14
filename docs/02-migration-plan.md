# Migration Plan - Akuntansi App

## Migration Order

Migrations must be created in dependency order. Below is the sequence with rationale.

---

## Phase 1: Core Auth & Tenant

### 1.1 `create_users_table`
```
users
├── id (bigint, PK)
├── name (string)
├── email (string, unique)
├── email_verified_at (timestamp, nullable)
├── password (string)
├── remember_token (string, nullable)
├── current_company_id (bigint, nullable, FK → companies)
├── timestamps
└── soft_deletes
```

### 1.2 `create_companies_table`
```
companies
├── id (bigint, PK)
├── name (string)
├── legal_name (string, nullable)
├── tax_id (string, nullable)          # NPWP
├── address (text, nullable)
├── phone (string, nullable)
├── email (string, nullable)
├── currency (string, default: 'IDR')
├── timezone (string, default: 'Asia/Jakarta')
├── fiscal_year_start (tinyint, default: 1)  # Month (1-12)
├── logo_path (string, nullable)
├── settings (jsonb, nullable)
├── timestamps
└── soft_deletes
```

### 1.3 `create_roles_table`
```
roles
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── name (string)                       # owner, admin, accountant, viewer
├── permissions (jsonb)
├── is_system (boolean, default: false) # Cannot be deleted
└── timestamps

Index: (company_id, name) unique
```

### 1.4 `create_company_users_table`
```
company_users
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── user_id (bigint, FK → users)
├── role_id (bigint, FK → roles)
├── is_active (boolean, default: true)
└── timestamps

Index: (company_id, user_id) unique
```

### 1.5 `add_current_company_foreign_key_to_users`
Adds FK constraint after companies table exists.

---

## Phase 2: Chart of Accounts

### 2.1 `create_accounts_table`
```
accounts
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── parent_id (bigint, nullable, FK → accounts)
├── code (string)                       # e.g., "1-1001"
├── name (string)                       # e.g., "Kas"
├── type (string)                       # asset, liability, equity, revenue, expense
├── subtype (string, nullable)          # cash, bank, receivable, payable, etc.
├── description (text, nullable)
├── is_active (boolean, default: true)
├── is_system (boolean, default: false) # Cannot be deleted
├── normal_balance (string)             # debit, credit
├── timestamps
└── soft_deletes

Index: (company_id, code) unique
Index: (company_id, type)
```

### 2.2 `create_cash_bank_accounts_table`
```
cash_bank_accounts
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── account_id (bigint, FK → accounts)  # Links to COA
├── name (string)                       # "Kas Kecil", "BCA 1234"
├── type (string)                       # cash, bank
├── bank_name (string, nullable)
├── account_number (string, nullable)
├── opening_balance (decimal 15,2, default: 0)
├── opening_balance_date (date, nullable)
├── is_active (boolean, default: true)
├── timestamps
└── soft_deletes

Index: (company_id)
```

### 2.3 `create_transaction_categories_table`
```
transaction_categories
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── account_id (bigint, FK → accounts)  # Default account for this category
├── name (string)
├── type (string)                       # income, expense
├── description (text, nullable)
├── is_active (boolean, default: true)
└── timestamps

Index: (company_id, type)
```

---

## Phase 3: Customers & Suppliers

### 3.1 `create_customers_table`
```
customers
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── code (string, nullable)
├── name (string)
├── email (string, nullable)
├── phone (string, nullable)
├── address (text, nullable)
├── tax_id (string, nullable)           # NPWP
├── credit_limit (decimal 15,2, nullable)
├── notes (text, nullable)
├── is_active (boolean, default: true)
├── timestamps
└── soft_deletes

Index: (company_id)
Index: (company_id, code) unique where code is not null
```

### 3.2 `create_suppliers_table`
```
suppliers
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── code (string, nullable)
├── name (string)
├── email (string, nullable)
├── phone (string, nullable)
├── address (text, nullable)
├── tax_id (string, nullable)           # NPWP
├── notes (text, nullable)
├── is_active (boolean, default: true)
├── timestamps
└── soft_deletes

Index: (company_id)
Index: (company_id, code) unique where code is not null
```

---

## Phase 4: Transactions

### 4.1 `create_transactions_table`
```
transactions
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── transaction_number (string)
├── type (string)                       # income, expense, transfer
├── date (date)
├── amount (decimal 15,2)
├── description (text, nullable)
│
├── cash_bank_account_id (bigint, FK → cash_bank_accounts)
├── destination_cash_bank_account_id (bigint, nullable, FK)  # For transfers
├── category_id (bigint, nullable, FK → transaction_categories)
├── customer_id (bigint, nullable, FK → customers)
├── supplier_id (bigint, nullable, FK → suppliers)
│
├── status (string, default: 'draft')   # draft, posted, voided
├── posted_at (timestamp, nullable)
├── voided_at (timestamp, nullable)
├── void_reason (text, nullable)
│
├── reference (string, nullable)        # External reference
├── attachments (jsonb, nullable)
│
├── created_by (bigint, FK → users)
├── timestamps
└── soft_deletes

Index: (company_id, date)
Index: (company_id, type, status)
Index: (company_id, transaction_number) unique
```

### 4.2 `create_receivables_table`
```
receivables
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── receivable_number (string)
├── customer_id (bigint, FK → customers)
│
├── date (date)
├── due_date (date)
├── amount (decimal 15,2)
├── paid_amount (decimal 15,2, default: 0)
├── description (text, nullable)
│
├── category_id (bigint, nullable, FK → transaction_categories)
│
├── status (string, default: 'draft')   # draft, posted, voided
├── payment_status (string, default: 'unpaid')  # unpaid, partial, paid
├── posted_at (timestamp, nullable)
├── voided_at (timestamp, nullable)
├── void_reason (text, nullable)
│
├── reference (string, nullable)
├── attachments (jsonb, nullable)
│
├── created_by (bigint, FK → users)
├── timestamps
└── soft_deletes

Index: (company_id, date)
Index: (company_id, customer_id, payment_status)
Index: (company_id, receivable_number) unique
```

### 4.3 `create_payables_table`
```
payables
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── payable_number (string)
├── supplier_id (bigint, FK → suppliers)
│
├── date (date)
├── due_date (date)
├── amount (decimal 15,2)
├── paid_amount (decimal 15,2, default: 0)
├── description (text, nullable)
│
├── category_id (bigint, nullable, FK → transaction_categories)
│
├── status (string, default: 'draft')   # draft, posted, voided
├── payment_status (string, default: 'unpaid')  # unpaid, partial, paid
├── posted_at (timestamp, nullable)
├── voided_at (timestamp, nullable)
├── void_reason (text, nullable)
│
├── reference (string, nullable)
├── attachments (jsonb, nullable)
│
├── created_by (bigint, FK → users)
├── timestamps
└── soft_deletes

Index: (company_id, date)
Index: (company_id, supplier_id, payment_status)
Index: (company_id, payable_number) unique
```

### 4.4 `create_payments_table`
```
payments
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── payment_number (string)
├── type (string)                       # receivable, payable
├── date (date)
├── amount (decimal 15,2)
├── description (text, nullable)
│
├── cash_bank_account_id (bigint, FK → cash_bank_accounts)
├── customer_id (bigint, nullable, FK → customers)
├── supplier_id (bigint, nullable, FK → suppliers)
│
├── status (string, default: 'draft')   # draft, posted, voided
├── posted_at (timestamp, nullable)
├── voided_at (timestamp, nullable)
├── void_reason (text, nullable)
│
├── reference (string, nullable)
│
├── created_by (bigint, FK → users)
├── timestamps
└── soft_deletes

Index: (company_id, date)
Index: (company_id, payment_number) unique
```

### 4.5 `create_payment_allocations_table`
```
payment_allocations
├── id (bigint, PK)
├── payment_id (bigint, FK → payments)
├── allocatable_type (string)           # App\Models\Receivable or App\Models\Payable
├── allocatable_id (bigint)
├── amount (decimal 15,2)
└── timestamps

Index: (payment_id)
Index: (allocatable_type, allocatable_id)
```

---

## Phase 5: Journal Entries

### 5.1 `create_journal_entries_table`
```
journal_entries
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── entry_number (string)
├── date (date)
├── description (text, nullable)
│
├── source_type (string, nullable)      # transaction, receivable, payable, payment, manual
├── source_id (bigint, nullable)        # Polymorphic
│
├── is_manual (boolean, default: false)
├── is_adjusting (boolean, default: false)
├── is_closing (boolean, default: false)
│
├── status (string, default: 'posted')  # posted, voided
├── voided_at (timestamp, nullable)
├── void_reason (text, nullable)
│
├── created_by (bigint, FK → users)
├── timestamps

Index: (company_id, date)
Index: (company_id, entry_number) unique
Index: (source_type, source_id)
```

### 5.2 `create_journal_lines_table`
```
journal_lines
├── id (bigint, PK)
├── journal_entry_id (bigint, FK → journal_entries)
├── account_id (bigint, FK → accounts)
├── description (text, nullable)
├── debit (decimal 15,2, default: 0)
├── credit (decimal 15,2, default: 0)
├── timestamps

Index: (journal_entry_id)
Index: (account_id)
```

---

## Phase 6: Fiscal Periods & Audit

### 6.1 `create_fiscal_periods_table`
```
fiscal_periods
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── name (string)                       # "2024", "2024-01"
├── start_date (date)
├── end_date (date)
├── is_closed (boolean, default: false)
├── closed_at (timestamp, nullable)
├── closed_by (bigint, nullable, FK → users)
└── timestamps

Index: (company_id, start_date, end_date)
```

### 6.2 `create_audit_logs_table`
```
audit_logs
├── id (bigint, PK)
├── company_id (bigint, FK → companies)
├── user_id (bigint, nullable, FK → users)
├── auditable_type (string)
├── auditable_id (bigint)
├── action (string)                     # created, updated, deleted, posted, voided
├── old_values (jsonb, nullable)
├── new_values (jsonb, nullable)
├── ip_address (string, nullable)
├── user_agent (text, nullable)
├── created_at (timestamp)

Index: (company_id, created_at)
Index: (auditable_type, auditable_id)
```

---

## Migration Commands

```bash
# Generate migrations in order
php artisan make:migration create_users_table
php artisan make:migration create_companies_table
php artisan make:migration create_roles_table
php artisan make:migration create_company_users_table
php artisan make:migration add_current_company_foreign_key_to_users
php artisan make:migration create_accounts_table
php artisan make:migration create_cash_bank_accounts_table
php artisan make:migration create_transaction_categories_table
php artisan make:migration create_customers_table
php artisan make:migration create_suppliers_table
php artisan make:migration create_transactions_table
php artisan make:migration create_receivables_table
php artisan make:migration create_payables_table
php artisan make:migration create_payments_table
php artisan make:migration create_payment_allocations_table
php artisan make:migration create_journal_entries_table
php artisan make:migration create_journal_lines_table
php artisan make:migration create_fiscal_periods_table
php artisan make:migration create_audit_logs_table
```

---

## Notes

1. **Soft Deletes**: Used on entities that might be referenced historically
2. **Decimal(15,2)**: Supports up to 9,999,999,999,999.99 IDR (sufficient for UMKM)
3. **JSONB**: PostgreSQL native JSON for flexible settings/metadata
4. **Polymorphic Relations**: Used for payment allocations and journal sources
5. **Unique Constraints**: All document numbers are unique per company
