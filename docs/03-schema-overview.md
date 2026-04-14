# Schema Overview - Akuntansi App

## Entity Relationship Diagram (Textual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE AUTH & TENANT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐         ┌───────────────┐         ┌─────────┐                 │
│  │  users  │─────────│ company_users │─────────│  roles  │                 │
│  └────┬────┘   M:N   └───────┬───────┘   N:1   └────┬────┘                 │
│       │                      │                      │                       │
│       │ current_company_id   │                      │                       │
│       │                      │                      │                       │
│       └──────────────────────┼──────────────────────┘                       │
│                              │                                              │
│                              ▼                                              │
│                       ┌───────────┐                                         │
│                       │ companies │                                         │
│                       └─────┬─────┘                                         │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│   [All tenant-scoped tables have company_id FK]                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            CHART OF ACCOUNTS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐                                                               │
│  │ accounts │◄──────────────────┐ (self-referencing for hierarchy)         │
│  │          │───────────────────┘ parent_id                                │
│  └────┬─────┘                                                               │
│       │                                                                     │
│       │ 1:1 (for cash/bank type)                                           │
│       ▼                                                                     │
│  ┌──────────────────┐                                                       │
│  │ cash_bank_accounts│                                                      │
│  └──────────────────┘                                                       │
│                                                                             │
│  ┌────────────────────────┐                                                 │
│  │ transaction_categories │───────► accounts (default account)             │
│  └────────────────────────┘                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          CUSTOMERS & SUPPLIERS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────┐                    ┌───────────┐                             │
│  │ customers │                    │ suppliers │                             │
│  └─────┬─────┘                    └─────┬─────┘                             │
│        │                                │                                   │
│        │ 1:N                            │ 1:N                               │
│        ▼                                ▼                                   │
│  ┌─────────────┐                  ┌───────────┐                             │
│  │ receivables │                  │ payables  │                             │
│  └─────────────┘                  └───────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRANSACTIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌──────────────┐                                    │
│                         │ transactions │                                    │
│                         │              │                                    │
│                         │ type:        │                                    │
│                         │  - income    │                                    │
│                         │  - expense   │                                    │
│                         │  - transfer  │                                    │
│                         └──────┬───────┘                                    │
│                                │                                            │
│              ┌─────────────────┼─────────────────┐                         │
│              │                 │                 │                         │
│              ▼                 ▼                 ▼                         │
│     cash_bank_accounts   categories      customers/suppliers               │
│                                                                             │
│  ┌─────────────┐      ┌───────────┐      ┌──────────────────────┐          │
│  │ receivables │      │ payables  │      │      payments        │          │
│  │             │      │           │      │                      │          │
│  │ (Piutang)   │      │ (Hutang)  │      │ type:                │          │
│  └──────┬──────┘      └─────┬─────┘      │  - receivable        │          │
│         │                   │            │  - payable           │          │
│         │                   │            └──────────┬───────────┘          │
│         │                   │                       │                      │
│         └───────────────────┴───────────────────────┘                      │
│                             │                                              │
│                             ▼                                              │
│                   ┌─────────────────────┐                                  │
│                   │ payment_allocations │                                  │
│                   │                     │                                  │
│                   │ Polymorphic:        │                                  │
│                   │  - receivable_id    │                                  │
│                   │  - payable_id       │                                  │
│                   └─────────────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            JOURNAL SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  All financial documents generate journal entries:                          │
│                                                                             │
│  transactions ──┐                                                           │
│  receivables  ──┼──► journal_entries ──► journal_lines ──► accounts        │
│  payables     ──┤         │                                                 │
│  payments     ──┘         │                                                 │
│                           │                                                 │
│                    (source_type + source_id)                                │
│                    polymorphic reference                                    │
│                                                                             │
│  ┌────────────────┐      ┌───────────────┐                                 │
│  │ journal_entries│──1:N─│ journal_lines │                                 │
│  │                │      │               │                                 │
│  │ - entry_number │      │ - debit       │                                 │
│  │ - date         │      │ - credit      │                                 │
│  │ - source_type  │      │ - account_id  │                                 │
│  │ - source_id    │      └───────────────┘                                 │
│  └────────────────┘                                                         │
│                                                                             │
│  INVARIANT: SUM(debit) = SUM(credit) per journal_entry                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            FISCAL & AUDIT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐      ┌─────────────┐                                   │
│  │ fiscal_periods │      │ audit_logs  │                                   │
│  │                │      │             │                                   │
│  │ Controls when  │      │ Tracks all  │                                   │
│  │ periods can be │      │ changes to  │                                   │
│  │ modified       │      │ documents   │                                   │
│  └────────────────┘      └─────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Account Types & Normal Balances

| Type          | Normal Balance | Increases With | Decreases With |
|---------------|----------------|----------------|----------------|
| **Asset**     | Debit          | Debit          | Credit         |
| **Liability** | Credit         | Credit         | Debit          |
| **Equity**    | Credit         | Credit         | Debit          |
| **Revenue**   | Credit         | Credit         | Debit          |
| **Expense**   | Debit          | Debit          | Credit         |

---

## Account Subtypes

```php
// Asset subtypes
'cash'          // Kas
'bank'          // Bank
'receivable'    // Piutang Usaha
'inventory'     // Persediaan
'prepaid'       // Biaya Dibayar Dimuka
'fixed_asset'   // Aset Tetap

// Liability subtypes
'payable'       // Hutang Usaha
'accrued'       // Hutang Akrual
'tax_payable'   // Hutang Pajak
'loan'          // Pinjaman

// Equity subtypes
'capital'       // Modal
'retained'      // Laba Ditahan

// Revenue subtypes
'sales'         // Penjualan
'service'       // Pendapatan Jasa
'other_income'  // Pendapatan Lain-lain

// Expense subtypes
'cogs'          // Harga Pokok Penjualan
'operating'     // Biaya Operasional
'salary'        // Gaji & Upah
'utility'       // Utilitas
'other_expense' // Biaya Lain-lain
```

---

## Default Chart of Accounts (Template)

```
1-0000  ASET
├── 1-1000  Aset Lancar
│   ├── 1-1100  Kas & Bank
│   │   ├── 1-1101  Kas                    [cash]
│   │   └── 1-1102  Bank                   [bank]
│   ├── 1-1200  Piutang
│   │   └── 1-1201  Piutang Usaha          [receivable]
│   └── 1-1300  Persediaan
│       └── 1-1301  Persediaan Barang      [inventory]
└── 1-2000  Aset Tetap
    └── 1-2100  Peralatan                  [fixed_asset]

2-0000  KEWAJIBAN
├── 2-1000  Kewajiban Lancar
│   ├── 2-1100  Hutang Usaha               [payable]
│   └── 2-1200  Hutang Pajak               [tax_payable]
└── 2-2000  Kewajiban Jangka Panjang
    └── 2-2100  Pinjaman Bank              [loan]

3-0000  MODAL
├── 3-1000  Modal Pemilik                  [capital]
└── 3-2000  Laba Ditahan                   [retained]

4-0000  PENDAPATAN
├── 4-1000  Pendapatan Usaha
│   ├── 4-1100  Penjualan                  [sales]
│   └── 4-1200  Pendapatan Jasa            [service]
└── 4-2000  Pendapatan Lain-lain           [other_income]

5-0000  BEBAN
├── 5-1000  Harga Pokok Penjualan          [cogs]
├── 5-2000  Beban Operasional
│   ├── 5-2100  Gaji & Upah                [salary]
│   ├── 5-2200  Sewa                       [operating]
│   ├── 5-2300  Listrik & Air              [utility]
│   └── 5-2400  Perlengkapan               [operating]
└── 5-3000  Beban Lain-lain                [other_expense]
```

---

## Transaction Flow Examples

### 1. Income (Uang Masuk)
```
User creates: Transaction { type: 'income', amount: 1,000,000 }

Auto-generated Journal:
┌─────────────────────────────────────────┐
│ Dr. Kas/Bank           1,000,000        │
│     Cr. Pendapatan               1,000,000 │
└─────────────────────────────────────────┘
```

### 2. Expense (Uang Keluar)
```
User creates: Transaction { type: 'expense', amount: 500,000 }

Auto-generated Journal:
┌─────────────────────────────────────────┐
│ Dr. Beban                500,000        │
│     Cr. Kas/Bank                   500,000 │
└─────────────────────────────────────────┘
```

### 3. Transfer
```
User creates: Transaction { type: 'transfer', amount: 2,000,000 }
              from: Kas, to: BCA

Auto-generated Journal:
┌─────────────────────────────────────────┐
│ Dr. Bank BCA           2,000,000        │
│     Cr. Kas                      2,000,000 │
└─────────────────────────────────────────┘
```

### 4. Receivable (Piutang)
```
User creates: Receivable { customer: Toko ABC, amount: 5,000,000 }

Auto-generated Journal:
┌─────────────────────────────────────────┐
│ Dr. Piutang Usaha      5,000,000        │
│     Cr. Pendapatan               5,000,000 │
└─────────────────────────────────────────┘
```

### 5. Receivable Payment (Terima Pembayaran Piutang)
```
User creates: Payment { type: 'receivable', amount: 3,000,000 }
              allocates to: Piutang Toko ABC

Auto-generated Journal:
┌─────────────────────────────────────────┐
│ Dr. Kas/Bank           3,000,000        │
│     Cr. Piutang Usaha            3,000,000 │
└─────────────────────────────────────────┘

Updates:
- Receivable.paid_amount += 3,000,000
- Receivable.payment_status = 'partial' or 'paid'
```

### 6. Payable (Hutang)
```
User creates: Payable { supplier: PT Supplier, amount: 4,000,000 }

Auto-generated Journal:
┌─────────────────────────────────────────┐
│ Dr. Beban/Persediaan   4,000,000        │
│     Cr. Hutang Usaha             4,000,000 │
└─────────────────────────────────────────┘
```

### 7. Payable Payment (Bayar Hutang)
```
User creates: Payment { type: 'payable', amount: 4,000,000 }
              allocates to: Hutang PT Supplier

Auto-generated Journal:
┌─────────────────────────────────────────┐
│ Dr. Hutang Usaha       4,000,000        │
│     Cr. Kas/Bank                 4,000,000 │
└─────────────────────────────────────────┘

Updates:
- Payable.paid_amount += 4,000,000
- Payable.payment_status = 'paid'
```

---

## Report Data Sources

| Report              | Primary Query Source                          |
|---------------------|-----------------------------------------------|
| Jurnal Umum         | `journal_entries` + `journal_lines`           |
| Buku Besar          | `journal_lines` grouped by `account_id`       |
| Neraca Saldo        | `journal_lines` SUM(debit - credit) by account|
| Laba Rugi           | `journal_lines` for revenue & expense accounts|
| Neraca              | `journal_lines` for asset, liability, equity  |
| Piutang Outstanding | `receivables` WHERE payment_status != 'paid'  |
| Hutang Outstanding  | `payables` WHERE payment_status != 'paid'     |
| Arus Kas            | `journal_lines` for cash/bank accounts        |

---

## Multi-Tenant Data Isolation

Every query automatically scoped by `company_id`:

```php
// BelongsToCompany trait adds global scope
protected static function booted()
{
    static::addGlobalScope('company', function ($query) {
        if ($companyId = auth()->user()?->current_company_id) {
            $query->where('company_id', $companyId);
        }
    });

    static::creating(function ($model) {
        if (!$model->company_id) {
            $model->company_id = auth()->user()?->current_company_id;
        }
    });
}
```
