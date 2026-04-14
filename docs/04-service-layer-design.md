# Service Layer Design - Akuntansi App

## Design Principles

1. **Controllers stay thin** - Only handle HTTP concerns (validation, response)
2. **Services own business logic** - All accounting rules live here
3. **DB transactions for posting** - Ensure data consistency
4. **Services are injectable** - Easy to test and swap implementations
5. **Single responsibility** - Each service has a focused purpose

---

## Service Architecture

```
app/Services/
├── Accounting/
│   ├── JournalService.php           # Core journal entry management
│   ├── AccountBalanceService.php    # Balance calculations
│   └── FiscalPeriodService.php      # Period open/close
│
├── Transaction/
│   ├── IncomeService.php            # Income transactions
│   ├── ExpenseService.php           # Expense transactions
│   ├── TransferService.php          # Transfer transactions
│   ├── ReceivableService.php        # Accounts receivable
│   ├── PayableService.php           # Accounts payable
│   └── PaymentService.php           # Payment processing
│
├── Report/
│   ├── JournalReportService.php     # General journal report
│   ├── LedgerReportService.php      # General ledger
│   ├── TrialBalanceService.php      # Trial balance
│   ├── IncomeStatementService.php   # Profit & loss
│   └── BalanceSheetService.php      # Balance sheet
│
└── Company/
    ├── CompanySetupService.php      # Company initialization
    └── CompanyContextService.php    # Tenant context management
```

---

## Core Services

### 1. JournalService

The heart of the accounting system. All financial transactions flow through here.

```php
<?php

namespace App\Services\Accounting;

use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Account;
use App\Exceptions\UnbalancedJournalException;
use App\Exceptions\AccountingException;
use Illuminate\Support\Facades\DB;

class JournalService
{
    /**
     * Create a journal entry with lines.
     * 
     * @param array $data [
     *     'date' => '2024-01-15',
     *     'description' => 'Penjualan tunai',
     *     'source_type' => 'App\Models\Transaction',
     *     'source_id' => 123,
     *     'lines' => [
     *         ['account_id' => 1, 'debit' => 1000000, 'credit' => 0],
     *         ['account_id' => 2, 'debit' => 0, 'credit' => 1000000],
     *     ]
     * ]
     */
    public function createEntry(array $data): JournalEntry
    {
        $this->validateBalance($data['lines']);

        return DB::transaction(function () use ($data) {
            $entry = JournalEntry::create([
                'entry_number' => $this->generateEntryNumber(),
                'date' => $data['date'],
                'description' => $data['description'] ?? null,
                'source_type' => $data['source_type'] ?? null,
                'source_id' => $data['source_id'] ?? null,
                'is_manual' => $data['is_manual'] ?? false,
                'created_by' => auth()->id(),
            ]);

            foreach ($data['lines'] as $line) {
                $entry->lines()->create([
                    'account_id' => $line['account_id'],
                    'description' => $line['description'] ?? null,
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                ]);
            }

            return $entry->load('lines.account');
        });
    }

    /**
     * Void a journal entry (for corrections).
     */
    public function voidEntry(JournalEntry $entry, string $reason): JournalEntry
    {
        if ($entry->status === 'voided') {
            throw new AccountingException('Jurnal sudah dibatalkan.');
        }

        return DB::transaction(function () use ($entry, $reason) {
            $entry->update([
                'status' => 'voided',
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $entry;
        });
    }

    /**
     * Create reversing entry for a voided transaction.
     */
    public function createReversingEntry(JournalEntry $original, string $reason): JournalEntry
    {
        $reversedLines = $original->lines->map(function ($line) {
            return [
                'account_id' => $line->account_id,
                'description' => 'Pembalikan: ' . $line->description,
                'debit' => $line->credit,  // Swap debit/credit
                'credit' => $line->debit,
            ];
        })->toArray();

        return $this->createEntry([
            'date' => now()->toDateString(),
            'description' => "Pembalikan #{$original->entry_number}: {$reason}",
            'source_type' => $original->source_type,
            'source_id' => $original->source_id,
            'lines' => $reversedLines,
        ]);
    }

    /**
     * Validate that debits equal credits.
     */
    protected function validateBalance(array $lines): void
    {
        $totalDebit = collect($lines)->sum('debit');
        $totalCredit = collect($lines)->sum('credit');

        if (bccomp($totalDebit, $totalCredit, 2) !== 0) {
            throw new UnbalancedJournalException(
                "Jurnal tidak seimbang. Debit: {$totalDebit}, Kredit: {$totalCredit}"
            );
        }
    }

    /**
     * Generate unique entry number.
     */
    protected function generateEntryNumber(): string
    {
        $prefix = 'JV';
        $date = now()->format('Ymd');
        
        $lastEntry = JournalEntry::where('entry_number', 'like', "{$prefix}{$date}%")
            ->orderBy('entry_number', 'desc')
            ->first();

        if ($lastEntry) {
            $lastNumber = (int) substr($lastEntry->entry_number, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "{$prefix}{$date}{$newNumber}";
    }
}
```

---

### 2. AccountBalanceService

Calculates account balances from journal entries.

```php
<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\JournalLine;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class AccountBalanceService
{
    /**
     * Get current balance for an account.
     */
    public function getBalance(Account $account, ?Carbon $asOfDate = null): float
    {
        $query = JournalLine::query()
            ->where('account_id', $account->id)
            ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                $q->where('status', 'posted');
                if ($asOfDate) {
                    $q->where('date', '<=', $asOfDate);
                }
            });

        $totalDebit = (float) $query->sum('debit');
        $totalCredit = (float) $query->sum('credit');

        // Apply normal balance rule
        return $account->normal_balance === 'debit'
            ? $totalDebit - $totalCredit
            : $totalCredit - $totalDebit;
    }

    /**
     * Get balances for multiple accounts.
     */
    public function getBalances(Collection $accounts, ?Carbon $asOfDate = null): Collection
    {
        return $accounts->map(function ($account) use ($asOfDate) {
            return [
                'account' => $account,
                'balance' => $this->getBalance($account, $asOfDate),
            ];
        });
    }

    /**
     * Get cash/bank account balance.
     */
    public function getCashBankBalance(int $cashBankAccountId, ?Carbon $asOfDate = null): float
    {
        $cashBankAccount = \App\Models\CashBankAccount::findOrFail($cashBankAccountId);
        
        return $this->getBalance($cashBankAccount->account, $asOfDate) 
            + $cashBankAccount->opening_balance;
    }

    /**
     * Get trial balance data.
     */
    public function getTrialBalance(?Carbon $asOfDate = null): array
    {
        $accounts = Account::with('parent')
            ->orderBy('code')
            ->get();

        $balances = [];
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($accounts as $account) {
            $balance = $this->getBalance($account, $asOfDate);
            
            if ($balance != 0) {
                $debit = $account->normal_balance === 'debit' && $balance > 0 ? $balance : 0;
                $credit = $account->normal_balance === 'credit' && $balance > 0 ? $balance : 0;
                
                // Handle contra balances
                if ($balance < 0) {
                    $debit = $account->normal_balance === 'credit' ? abs($balance) : 0;
                    $credit = $account->normal_balance === 'debit' ? abs($balance) : 0;
                }

                $balances[] = [
                    'account' => $account,
                    'debit' => $debit,
                    'credit' => $credit,
                ];

                $totalDebit += $debit;
                $totalCredit += $credit;
            }
        }

        return [
            'balances' => $balances,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'is_balanced' => bccomp($totalDebit, $totalCredit, 2) === 0,
        ];
    }
}
```

---

### 3. IncomeService

Handles income transactions with automatic journal entry creation.

```php
<?php

namespace App\Services\Transaction;

use App\Models\Transaction;
use App\Models\CashBankAccount;
use App\Models\TransactionCategory;
use App\Services\Accounting\JournalService;
use Illuminate\Support\Facades\DB;

class IncomeService
{
    public function __construct(
        protected JournalService $journalService
    ) {}

    /**
     * Create income transaction.
     */
    public function create(array $data): Transaction
    {
        return DB::transaction(function () use ($data) {
            $transaction = Transaction::create([
                'transaction_number' => $this->generateNumber(),
                'type' => 'income',
                'date' => $data['date'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'cash_bank_account_id' => $data['cash_bank_account_id'],
                'category_id' => $data['category_id'] ?? null,
                'customer_id' => $data['customer_id'] ?? null,
                'reference' => $data['reference'] ?? null,
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);

            return $transaction;
        });
    }

    /**
     * Post income transaction and create journal entry.
     */
    public function post(Transaction $transaction): Transaction
    {
        if ($transaction->status !== 'draft') {
            throw new \App\Exceptions\AccountingException(
                'Hanya transaksi draft yang bisa diposting.'
            );
        }

        return DB::transaction(function () use ($transaction) {
            $cashBankAccount = CashBankAccount::findOrFail($transaction->cash_bank_account_id);
            $category = $transaction->category_id 
                ? TransactionCategory::find($transaction->category_id) 
                : null;

            // Determine revenue account
            $revenueAccountId = $category?->account_id 
                ?? $this->getDefaultRevenueAccountId();

            // Create journal entry
            // Dr. Cash/Bank, Cr. Revenue
            $this->journalService->createEntry([
                'date' => $transaction->date,
                'description' => $transaction->description ?? 'Uang Masuk',
                'source_type' => Transaction::class,
                'source_id' => $transaction->id,
                'lines' => [
                    [
                        'account_id' => $cashBankAccount->account_id,
                        'description' => $transaction->description,
                        'debit' => $transaction->amount,
                        'credit' => 0,
                    ],
                    [
                        'account_id' => $revenueAccountId,
                        'description' => $transaction->description,
                        'debit' => 0,
                        'credit' => $transaction->amount,
                    ],
                ],
            ]);

            $transaction->update([
                'status' => 'posted',
                'posted_at' => now(),
            ]);

            return $transaction->fresh();
        });
    }

    /**
     * Void a posted transaction.
     */
    public function void(Transaction $transaction, string $reason): Transaction
    {
        if ($transaction->status !== 'posted') {
            throw new \App\Exceptions\AccountingException(
                'Hanya transaksi posted yang bisa dibatalkan.'
            );
        }

        return DB::transaction(function () use ($transaction, $reason) {
            // Find and void the related journal entry
            $journalEntry = \App\Models\JournalEntry::where('source_type', Transaction::class)
                ->where('source_id', $transaction->id)
                ->where('status', 'posted')
                ->firstOrFail();

            $this->journalService->voidEntry($journalEntry, $reason);
            $this->journalService->createReversingEntry($journalEntry, $reason);

            $transaction->update([
                'status' => 'voided',
                'voided_at' => now(),
                'void_reason' => $reason,
            ]);

            return $transaction->fresh();
        });
    }

    protected function generateNumber(): string
    {
        $prefix = 'IN';
        $date = now()->format('Ymd');
        
        $last = Transaction::where('type', 'income')
            ->where('transaction_number', 'like', "{$prefix}{$date}%")
            ->orderBy('transaction_number', 'desc')
            ->first();

        $number = $last 
            ? str_pad((int) substr($last->transaction_number, -4) + 1, 4, '0', STR_PAD_LEFT)
            : '0001';

        return "{$prefix}{$date}{$number}";
    }

    protected function getDefaultRevenueAccountId(): int
    {
        return \App\Models\Account::where('subtype', 'sales')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }
}
```

---

### 4. PaymentService

Handles payment processing with partial allocation support.

```php
<?php

namespace App\Services\Transaction;

use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Receivable;
use App\Models\Payable;
use App\Models\CashBankAccount;
use App\Services\Accounting\JournalService;
use App\Exceptions\AccountingException;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function __construct(
        protected JournalService $journalService
    ) {}

    /**
     * Create payment with allocations.
     * 
     * @param array $data [
     *     'type' => 'receivable',  // or 'payable'
     *     'date' => '2024-01-15',
     *     'amount' => 5000000,
     *     'cash_bank_account_id' => 1,
     *     'customer_id' => 1,  // or 'supplier_id'
     *     'allocations' => [
     *         ['receivable_id' => 1, 'amount' => 3000000],
     *         ['receivable_id' => 2, 'amount' => 2000000],
     *     ]
     * ]
     */
    public function create(array $data): Payment
    {
        $this->validateAllocations($data);

        return DB::transaction(function () use ($data) {
            $payment = Payment::create([
                'payment_number' => $this->generateNumber($data['type']),
                'type' => $data['type'],
                'date' => $data['date'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'cash_bank_account_id' => $data['cash_bank_account_id'],
                'customer_id' => $data['customer_id'] ?? null,
                'supplier_id' => $data['supplier_id'] ?? null,
                'reference' => $data['reference'] ?? null,
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);

            // Create allocations
            foreach ($data['allocations'] as $allocation) {
                $allocatableType = $data['type'] === 'receivable' 
                    ? Receivable::class 
                    : Payable::class;

                $allocatableId = $data['type'] === 'receivable'
                    ? $allocation['receivable_id']
                    : $allocation['payable_id'];

                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'allocatable_type' => $allocatableType,
                    'allocatable_id' => $allocatableId,
                    'amount' => $allocation['amount'],
                ]);
            }

            return $payment->load('allocations');
        });
    }

    /**
     * Post payment and create journal entry.
     */
    public function post(Payment $payment): Payment
    {
        if ($payment->status !== 'draft') {
            throw new AccountingException('Hanya pembayaran draft yang bisa diposting.');
        }

        return DB::transaction(function () use ($payment) {
            $cashBankAccount = CashBankAccount::findOrFail($payment->cash_bank_account_id);
            
            if ($payment->type === 'receivable') {
                $this->postReceivablePayment($payment, $cashBankAccount);
            } else {
                $this->postPayablePayment($payment, $cashBankAccount);
            }

            $payment->update([
                'status' => 'posted',
                'posted_at' => now(),
            ]);

            // Update allocated documents
            $this->updateAllocatedDocuments($payment);

            return $payment->fresh();
        });
    }

    /**
     * Post receivable payment journal.
     * Dr. Cash/Bank, Cr. Accounts Receivable
     */
    protected function postReceivablePayment(Payment $payment, CashBankAccount $cashBankAccount): void
    {
        $receivableAccountId = $this->getReceivableAccountId();

        $this->journalService->createEntry([
            'date' => $payment->date,
            'description' => "Terima pembayaran piutang #{$payment->payment_number}",
            'source_type' => Payment::class,
            'source_id' => $payment->id,
            'lines' => [
                [
                    'account_id' => $cashBankAccount->account_id,
                    'description' => 'Terima pembayaran piutang',
                    'debit' => $payment->amount,
                    'credit' => 0,
                ],
                [
                    'account_id' => $receivableAccountId,
                    'description' => 'Pelunasan piutang',
                    'debit' => 0,
                    'credit' => $payment->amount,
                ],
            ],
        ]);
    }

    /**
     * Post payable payment journal.
     * Dr. Accounts Payable, Cr. Cash/Bank
     */
    protected function postPayablePayment(Payment $payment, CashBankAccount $cashBankAccount): void
    {
        $payableAccountId = $this->getPayableAccountId();

        $this->journalService->createEntry([
            'date' => $payment->date,
            'description' => "Pembayaran hutang #{$payment->payment_number}",
            'source_type' => Payment::class,
            'source_id' => $payment->id,
            'lines' => [
                [
                    'account_id' => $payableAccountId,
                    'description' => 'Pelunasan hutang',
                    'debit' => $payment->amount,
                    'credit' => 0,
                ],
                [
                    'account_id' => $cashBankAccount->account_id,
                    'description' => 'Pembayaran hutang',
                    'debit' => 0,
                    'credit' => $payment->amount,
                ],
            ],
        ]);
    }

    /**
     * Update paid_amount and payment_status on allocated documents.
     */
    protected function updateAllocatedDocuments(Payment $payment): void
    {
        foreach ($payment->allocations as $allocation) {
            $document = $allocation->allocatable;
            
            $newPaidAmount = $document->paid_amount + $allocation->amount;
            $remainingAmount = $document->amount - $newPaidAmount;

            $document->update([
                'paid_amount' => $newPaidAmount,
                'payment_status' => $remainingAmount <= 0 ? 'paid' : 'partial',
            ]);
        }
    }

    protected function validateAllocations(array $data): void
    {
        $totalAllocated = collect($data['allocations'])->sum('amount');
        
        if (bccomp($totalAllocated, $data['amount'], 2) !== 0) {
            throw new AccountingException(
                "Total alokasi ({$totalAllocated}) harus sama dengan jumlah pembayaran ({$data['amount']})."
            );
        }

        // Validate each allocation doesn't exceed remaining balance
        foreach ($data['allocations'] as $allocation) {
            $document = $data['type'] === 'receivable'
                ? Receivable::findOrFail($allocation['receivable_id'])
                : Payable::findOrFail($allocation['payable_id']);

            $remaining = $document->amount - $document->paid_amount;
            
            if ($allocation['amount'] > $remaining) {
                throw new AccountingException(
                    "Alokasi ({$allocation['amount']}) melebihi sisa tagihan ({$remaining})."
                );
            }
        }
    }

    protected function generateNumber(string $type): string
    {
        $prefix = $type === 'receivable' ? 'RCV' : 'PAY';
        $date = now()->format('Ymd');
        
        $last = Payment::where('type', $type)
            ->where('payment_number', 'like', "{$prefix}{$date}%")
            ->orderBy('payment_number', 'desc')
            ->first();

        $number = $last 
            ? str_pad((int) substr($last->payment_number, -4) + 1, 4, '0', STR_PAD_LEFT)
            : '0001';

        return "{$prefix}{$date}{$number}";
    }

    protected function getReceivableAccountId(): int
    {
        return \App\Models\Account::where('subtype', 'receivable')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }

    protected function getPayableAccountId(): int
    {
        return \App\Models\Account::where('subtype', 'payable')
            ->where('is_system', true)
            ->firstOrFail()
            ->id;
    }
}
```

---

### 5. CompanySetupService

Handles new company initialization with default accounts.

```php
<?php

namespace App\Services\Company;

use App\Models\Company;
use App\Models\Account;
use App\Models\Role;
use App\Models\CompanyUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CompanySetupService
{
    /**
     * Create a new company with default data.
     */
    public function create(array $data, User $owner): Company
    {
        return DB::transaction(function () use ($data, $owner) {
            // Create company
            $company = Company::create([
                'name' => $data['name'],
                'legal_name' => $data['legal_name'] ?? null,
                'tax_id' => $data['tax_id'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'currency' => 'IDR',
                'timezone' => 'Asia/Jakarta',
                'fiscal_year_start' => $data['fiscal_year_start'] ?? 1,
            ]);

            // Create default roles
            $ownerRole = $this->createDefaultRoles($company);

            // Assign owner
            CompanyUser::create([
                'company_id' => $company->id,
                'user_id' => $owner->id,
                'role_id' => $ownerRole->id,
                'is_active' => true,
            ]);

            // Set as current company
            $owner->update(['current_company_id' => $company->id]);

            // Create default chart of accounts
            $this->createDefaultAccounts($company);

            return $company;
        });
    }

    protected function createDefaultRoles(Company $company): Role
    {
        $roles = [
            [
                'name' => 'owner',
                'permissions' => ['*'],
                'is_system' => true,
            ],
            [
                'name' => 'admin',
                'permissions' => [
                    'accounts.*', 'transactions.*', 'reports.*',
                    'customers.*', 'suppliers.*', 'settings.view',
                ],
                'is_system' => true,
            ],
            [
                'name' => 'accountant',
                'permissions' => [
                    'accounts.view', 'transactions.*', 'reports.*',
                    'customers.view', 'suppliers.view',
                ],
                'is_system' => true,
            ],
            [
                'name' => 'viewer',
                'permissions' => [
                    'accounts.view', 'transactions.view', 'reports.view',
                    'customers.view', 'suppliers.view',
                ],
                'is_system' => true,
            ],
        ];

        $ownerRole = null;
        foreach ($roles as $roleData) {
            $role = Role::create([
                'company_id' => $company->id,
                'name' => $roleData['name'],
                'permissions' => $roleData['permissions'],
                'is_system' => $roleData['is_system'],
            ]);

            if ($roleData['name'] === 'owner') {
                $ownerRole = $role;
            }
        }

        return $ownerRole;
    }

    protected function createDefaultAccounts(Company $company): void
    {
        $accounts = $this->getDefaultAccountsTemplate();

        foreach ($accounts as $accountData) {
            $this->createAccountWithChildren($company, $accountData);
        }
    }

    protected function createAccountWithChildren(
        Company $company, 
        array $data, 
        ?int $parentId = null
    ): Account {
        $account = Account::create([
            'company_id' => $company->id,
            'parent_id' => $parentId,
            'code' => $data['code'],
            'name' => $data['name'],
            'type' => $data['type'],
            'subtype' => $data['subtype'] ?? null,
            'normal_balance' => $data['normal_balance'],
            'is_system' => $data['is_system'] ?? false,
            'is_active' => true,
        ]);

        if (!empty($data['children'])) {
            foreach ($data['children'] as $childData) {
                $this->createAccountWithChildren($company, $childData, $account->id);
            }
        }

        return $account;
    }

    protected function getDefaultAccountsTemplate(): array
    {
        return [
            [
                'code' => '1-0000',
                'name' => 'Aset',
                'type' => 'asset',
                'normal_balance' => 'debit',
                'children' => [
                    [
                        'code' => '1-1000',
                        'name' => 'Aset Lancar',
                        'type' => 'asset',
                        'normal_balance' => 'debit',
                        'children' => [
                            [
                                'code' => '1-1100',
                                'name' => 'Kas',
                                'type' => 'asset',
                                'subtype' => 'cash',
                                'normal_balance' => 'debit',
                                'is_system' => true,
                            ],
                            [
                                'code' => '1-1200',
                                'name' => 'Bank',
                                'type' => 'asset',
                                'subtype' => 'bank',
                                'normal_balance' => 'debit',
                                'is_system' => true,
                            ],
                            [
                                'code' => '1-1300',
                                'name' => 'Piutang Usaha',
                                'type' => 'asset',
                                'subtype' => 'receivable',
                                'normal_balance' => 'debit',
                                'is_system' => true,
                            ],
                        ],
                    ],
                ],
            ],
            [
                'code' => '2-0000',
                'name' => 'Kewajiban',
                'type' => 'liability',
                'normal_balance' => 'credit',
                'children' => [
                    [
                        'code' => '2-1000',
                        'name' => 'Kewajiban Lancar',
                        'type' => 'liability',
                        'normal_balance' => 'credit',
                        'children' => [
                            [
                                'code' => '2-1100',
                                'name' => 'Hutang Usaha',
                                'type' => 'liability',
                                'subtype' => 'payable',
                                'normal_balance' => 'credit',
                                'is_system' => true,
                            ],
                        ],
                    ],
                ],
            ],
            [
                'code' => '3-0000',
                'name' => 'Modal',
                'type' => 'equity',
                'normal_balance' => 'credit',
                'children' => [
                    [
                        'code' => '3-1000',
                        'name' => 'Modal Pemilik',
                        'type' => 'equity',
                        'subtype' => 'capital',
                        'normal_balance' => 'credit',
                        'is_system' => true,
                    ],
                    [
                        'code' => '3-2000',
                        'name' => 'Laba Ditahan',
                        'type' => 'equity',
                        'subtype' => 'retained',
                        'normal_balance' => 'credit',
                        'is_system' => true,
                    ],
                ],
            ],
            [
                'code' => '4-0000',
                'name' => 'Pendapatan',
                'type' => 'revenue',
                'normal_balance' => 'credit',
                'children' => [
                    [
                        'code' => '4-1000',
                        'name' => 'Pendapatan Usaha',
                        'type' => 'revenue',
                        'subtype' => 'sales',
                        'normal_balance' => 'credit',
                        'is_system' => true,
                    ],
                ],
            ],
            [
                'code' => '5-0000',
                'name' => 'Beban',
                'type' => 'expense',
                'normal_balance' => 'debit',
                'children' => [
                    [
                        'code' => '5-1000',
                        'name' => 'Beban Operasional',
                        'type' => 'expense',
                        'subtype' => 'operating',
                        'normal_balance' => 'debit',
                        'is_system' => true,
                    ],
                ],
            ],
        ];
    }
}
```

---

## Controller Example (Thin Controller Pattern)

```php
<?php

namespace App\Http\Controllers\Transaction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\StoreIncomeRequest;
use App\Http\Requests\Transaction\PostTransactionRequest;
use App\Services\Transaction\IncomeService;
use App\Models\Transaction;
use Inertia\Inertia;

class IncomeController extends Controller
{
    public function __construct(
        protected IncomeService $incomeService
    ) {}

    public function index()
    {
        return Inertia::render('Transaksi/UangMasuk/Index', [
            'transactions' => Transaction::where('type', 'income')
                ->with(['cashBankAccount', 'category', 'customer'])
                ->latest('date')
                ->paginate(20),
        ]);
    }

    public function create()
    {
        return Inertia::render('Transaksi/UangMasuk/Create', [
            'cashBankAccounts' => \App\Models\CashBankAccount::active()->get(),
            'categories' => \App\Models\TransactionCategory::where('type', 'income')->get(),
            'customers' => \App\Models\Customer::active()->get(),
        ]);
    }

    public function store(StoreIncomeRequest $request)
    {
        $transaction = $this->incomeService->create($request->validated());

        return redirect()
            ->route('transaksi.uang-masuk.show', $transaction)
            ->with('success', 'Transaksi berhasil disimpan.');
    }

    public function show(Transaction $transaction)
    {
        return Inertia::render('Transaksi/UangMasuk/Show', [
            'transaction' => $transaction->load([
                'cashBankAccount', 
                'category', 
                'customer',
                'journalEntries.lines.account',
            ]),
        ]);
    }

    public function post(Transaction $transaction)
    {
        $this->incomeService->post($transaction);

        return back()->with('success', 'Transaksi berhasil diposting.');
    }

    public function void(Transaction $transaction, PostTransactionRequest $request)
    {
        $this->incomeService->void($transaction, $request->input('reason'));

        return back()->with('success', 'Transaksi berhasil dibatalkan.');
    }
}
```

---

## Service Registration

```php
// app/Providers/AppServiceProvider.php

public function register(): void
{
    // Services are auto-resolved by Laravel's container
    // No manual binding needed for simple constructor injection
    
    // If you need singletons:
    // $this->app->singleton(JournalService::class);
}
```

---

## Testing Services

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\Accounting\JournalService;
use App\Exceptions\UnbalancedJournalException;
use Illuminate\Foundation\Testing\RefreshDatabase;

class JournalServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_balanced_journal_entry(): void
    {
        $service = app(JournalService::class);
        
        $entry = $service->createEntry([
            'date' => '2024-01-15',
            'description' => 'Test entry',
            'lines' => [
                ['account_id' => 1, 'debit' => 100000, 'credit' => 0],
                ['account_id' => 2, 'debit' => 0, 'credit' => 100000],
            ],
        ]);

        $this->assertDatabaseHas('journal_entries', [
            'id' => $entry->id,
        ]);
        $this->assertCount(2, $entry->lines);
    }

    public function test_rejects_unbalanced_journal_entry(): void
    {
        $this->expectException(UnbalancedJournalException::class);
        
        $service = app(JournalService::class);
        
        $service->createEntry([
            'date' => '2024-01-15',
            'description' => 'Unbalanced',
            'lines' => [
                ['account_id' => 1, 'debit' => 100000, 'credit' => 0],
                ['account_id' => 2, 'debit' => 0, 'credit' => 50000],
            ],
        ]);
    }
}
```
