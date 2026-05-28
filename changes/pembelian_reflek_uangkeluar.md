# Pembelian Tercermin di Uang Keluar

## Latar Belakang

Sebelum implementasi ini, ketika user melakukan pembelian (tunai maupun kredit), pembayaran tidak tercatat di modul **Uang Keluar**. Fitur ini memastikan setiap pembayaran yang terkait dengan pembelian otomatis muncul di Uang Keluar.

---

## Alur Bisnis

| Skenario | Kapan Expense Dibuat | Jumlah | Deskripsi |
|---|---|---|---|
| Pembelian tunai | Saat purchase di-posting | Total pembelian | `Pembelian: PB-xxx` |
| Pembelian kredit | Saat setiap pembayaran hutang di-posting | Jumlah per pembayaran | `Pembayaran hutang: PAY-xxx` |

- **Void** pembelian/pembayaran → Expense terkait ikut di-void otomatis
- **Koreksi** pembelian tunai → Expense lama di-void, Expense baru dibuat
- Expense yang bersumber dari pembelian/pembayaran **tidak bisa** dikoreksi/void langsung dari halaman Uang Keluar

---

## File yang Diubah

### 1. Migration — `database/migrations/2026_05_28_000001_add_source_to_transactions_table.php`
Tambah dua kolom polimorfik ke tabel `transactions`:

```php
$table->string('source_type', 100)->nullable()->after('partner_id');
$table->unsignedBigInteger('source_id')->nullable()->after('source_type');
$table->index(['source_type', 'source_id'], 'transactions_source_index');
```

Jalankan dengan:
```
php artisan migrate
```

---

### 2. Model — `app/Models/Transaction.php`
- Tambah `source_type` dan `source_id` ke `$fillable`
- Tambah relasi polimorfik:

```php
use Illuminate\Database\Eloquent\Relations\MorphTo;

public function source(): MorphTo
{
    return $this->morphTo();
}
```

---

### 3. Service — `app/Services/ExpenseService.php`
**`create()`** — sekarang menerima `source_type` dan `source_id` dari `$data`:
```php
'source_type' => $data['source_type'] ?? null,
'source_id'   => $data['source_id'] ?? null,
```

**`createPosted()`** — method baru untuk membuat Expense langsung berstatus Posted tanpa membuat jurnal (jurnal sudah ditangani oleh dokumen sumber):
```php
public function createPosted(array $data): Transaction
{
    return DB::transaction(function () use ($data) {
        $transaction = $this->create($data);
        $transaction->update([
            'status'    => TransactionStatus::Posted,
            'posted_at' => now(),
        ]);
        return $transaction->fresh();
    });
}
```

---

### 4. Service — `app/Services/PurchaseService.php`
**Inject** `ExpenseService` ke constructor.

**`post()`** — setelah jurnal dibuat, jika `payment_type === 'cash'`:
```php
if ($purchase->payment_type === 'cash') {
    $this->createLinkedExpense($purchase);
}
```

**`void()`** — setelah jurnal di-void:
```php
$this->voidLinkedExpense($purchase, $reason);
```

**`correct()`** — void Expense lama, buat Expense baru jika cash:
```php
$this->voidLinkedExpense($oldPurchase, 'Koreksi pembelian: ' . $oldPurchase->purchase_number);

if ($newPurchase->payment_type === 'cash') {
    $this->createLinkedExpense($newPurchase);
}
```

**Helper methods baru:**
```php
protected function createLinkedExpense(Purchase $purchase): Transaction
{
    return $this->expenseService->createPosted([
        'company_id'           => $purchase->company_id,
        'date'                 => $purchase->date->toDateString(),
        'amount'               => $purchase->total_amount,
        'description'          => 'Pembelian: ' . $purchase->purchase_number,
        'cash_bank_account_id' => $purchase->cash_bank_account_id,
        'partner_id'           => $purchase->partner_id,
        'reference'            => $purchase->purchase_number,
        'source_type'          => Purchase::class,
        'source_id'            => $purchase->id,
    ]);
}

protected function voidLinkedExpense(Purchase $purchase, string $reason): void
{
    $expense = Transaction::where('source_type', Purchase::class)
        ->where('source_id', $purchase->id)
        ->where('status', TransactionStatus::Posted)
        ->first();

    if ($expense) {
        $expense->update([
            'status'      => TransactionStatus::Voided,
            'voided_at'   => now(),
            'void_reason' => $reason,
        ]);
    }
}
```

---

### 5. Service — `app/Services/PaymentService.php`
**Inject** `ExpenseService` ke constructor.

**`post()`** — setelah `postPayablePayment()`:
```php
} else {
    $this->postPayablePayment($payment, $cashBankAccount);
    $this->createLinkedExpense($payment);
}
```

**`void()`** — sebelum update status:
```php
if ($payment->type === PaymentType::Payable) {
    $this->voidLinkedExpense($payment, $reason);
}
```

**Helper methods baru:**
```php
protected function createLinkedExpense(Payment $payment): Transaction
{
    return $this->expenseService->createPosted([
        'company_id'           => $payment->company_id,
        'date'                 => $payment->date->toDateString(),
        'amount'               => $payment->amount,
        'description'          => 'Pembayaran hutang: ' . $payment->payment_number,
        'cash_bank_account_id' => $payment->cash_bank_account_id,
        'partner_id'           => $payment->partner_id,
        'reference'            => $payment->payment_number,
        'source_type'          => Payment::class,
        'source_id'            => $payment->id,
    ]);
}

protected function voidLinkedExpense(Payment $payment, string $reason): void
{
    $expense = Transaction::where('source_type', Payment::class)
        ->where('source_id', $payment->id)
        ->where('status', TransactionStatus::Posted)
        ->first();

    if ($expense) {
        $expense->update([
            'status'      => TransactionStatus::Voided,
            'voided_at'   => now(),
            'void_reason' => $reason,
        ]);
    }
}
```

---

### 6. Controller — `app/Http/Controllers/ExpenseTransactionController.php`
**`void()`** — blokir jika ada `source_type`:
```php
if ($expense->source_type) {
    return back()->with('error', 'Transaksi ini berasal dari pembelian/pembayaran hutang. Lakukan pembatalan dari halaman sumbernya.');
}
```

**`edit()`** — blokir jika ada `source_type`:
```php
if ($expense->source_type) {
    abort(403, 'Transaksi ini berasal dari pembelian/pembayaran hutang. Lakukan koreksi dari halaman sumbernya.');
}
```

**`index()`** — tambah field ke response mapping:
```php
'source_type'  => $t->source_type,
'source_id'    => $t->source_id,
'source_label' => $this->resolveSourceLabel($t),
```

**`show()`** — tambah field ke response:
```php
'source_type'  => $expense->source_type,
'source_id'    => $expense->source_id,
'source_label' => $this->resolveSourceLabel($expense),
'source_url'   => $this->resolveSourceUrl($expense),
```

**Helper methods baru:**
```php
protected function resolveSourceLabel(Transaction $transaction): ?string
{
    if ($transaction->source_type === Purchase::class) {
        $purchase = Purchase::find($transaction->source_id);
        return $purchase ? 'Pembelian: ' . $purchase->purchase_number : null;
    }
    if ($transaction->source_type === Payment::class) {
        $payment = Payment::find($transaction->source_id);
        return $payment ? 'Pembayaran Hutang: ' . $payment->payment_number : null;
    }
    return null;
}

protected function resolveSourceUrl(Transaction $transaction): ?string
{
    if ($transaction->source_type === Purchase::class) {
        return route('purchases.show', $transaction->source_id);
    }
    if ($transaction->source_type === Payment::class) {
        return route('payable-payments.show', $transaction->source_id);
    }
    return null;
}
```

---

### 7. Frontend — `resources/js/Pages/Transactions/Expense/Index.tsx`
- Tambah field `source_type`, `source_id`, `source_label` ke interface `Transaction`
- Tambah kolom **Sumber** di tabel
- Ubah header "Supplier" menjadi "Mitra"

---

### 8. Frontend — `resources/js/Pages/Transactions/Expense/Show.tsx`
- Tambah field `source_type`, `source_id`, `source_label`, `source_url` ke interface `Transaction`
- Tampilkan banner ungu **"Sumber transaksi"** dengan link ke dokumen sumber jika `source_type` ada
- Sembunyikan tombol **Koreksi** dan **Batalkan** jika `source_type` ada
- Tampilkan tombol **"Kelola di Halaman Sumber"** sebagai gantinya
- Ubah label "Supplier" menjadi "Mitra"

---

## Catatan

- Expense yang dibuat sistem (`source_type` tidak null) **tidak memiliki jurnal sendiri** — jurnal sudah dibuat oleh dokumen sumber (Purchase/Payment)
- `created_by` pada Expense sistem menggunakan user yang sedang login saat posting
- Implementasi menggunakan pola polimorfik sehingga extensible untuk fitur penjualan (Income dari receivable payment) di masa mendatang
