# Dokumentasi Mobile List View - Uang Keluar

File: `resources/js/Pages/Transactions/Expense/Index.tsx`
Area implementasi: blok `CardContent` pada daftar transaksi, sekitar line 187-311.

## Tujuan

Bagian ini mengganti tampilan tabel penuh menjadi list kartu pada layar mobile. Tabel tetap dipertahankan untuk desktop agar pengguna tetap mendapat tampilan tabular saat ruang layar cukup.

Pendekatan ini dipakai karena tabel dengan banyak kolom mudah melebar melewati viewport mobile. Pada mobile, setiap transaksi diringkas menjadi satu item list yang bisa ditekan untuk menuju halaman detail.

## Alur Render

Implementasi membagi tampilan daftar menjadi tiga kondisi:

1. Empty state saat `filtered.length === 0`.
2. Mobile list view saat ada data dan viewport di bawah breakpoint `md`.
3. Desktop table view saat viewport `md` ke atas.

Struktur utamanya:

```tsx
<CardContent className="p-0">
    {filtered.length === 0 ? (
        // Empty state
    ) : (
        <>
            <div className="divide-y md:hidden">
                // Mobile list
            </div>

            <div className="hidden overflow-x-auto md:block">
                // Desktop table
            </div>
        </>
    )}
    <Pagination ... />
</CardContent>
```

## Empty State

Saat tidak ada transaksi, komponen menampilkan pesan kosong tanpa membungkusnya di dalam `Table`. Ini membuat layout lebih sederhana dan tidak membawa struktur tabel ke mobile.

Elemen yang ditampilkan:

- Ikon `TrendingDown`.
- Pesan utama: `Belum ada transaksi uang keluar`.
- Pesan bantuan untuk mencatat transaksi pertama.

## Mobile List View

Mobile list dibungkus dengan:

```tsx
<div className="divide-y md:hidden">
```

Class penting:

- `divide-y`: memberi pemisah antar transaksi tanpa card bertumpuk.
- `md:hidden`: hanya tampil di viewport kecil, sebelum breakpoint `md`.

Setiap transaksi dirender sebagai `Link`:

```tsx
<Link
    key={t.id}
    href={`/transaksi/uang-keluar/${t.id}`}
    className="block p-4 transition-colors hover:bg-gray-50"
>
```

Alasannya:

- Seluruh area item bisa ditekan, lebih nyaman untuk mobile.
- `p-4` memberi target sentuh yang cukup lega.
- `hover:bg-gray-50` tetap memberi feedback visual di device yang mendukung hover.

## Isi Item Mobile

Setiap item mobile menampilkan informasi utama transaksi:

- Nomor transaksi.
- Tanggal transaksi.
- Jumlah transaksi.
- Keterangan.
- Status.
- Sumber, jika ada.
- Mitra, jika ada.
- Referensi, jika ada.

Bagian atas item memakai layout dua kolom:

```tsx
<div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
        <p className="truncate font-mono text-sm text-primary">
            {t.transaction_number}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(t.date)}
        </p>
    </div>
    <p className="min-w-0 text-right text-sm font-semibold text-red-600 [overflow-wrap:anywhere]">
        {formatCurrency(t.amount)}
    </p>
</div>
```

Class penting:

- `min-w-0`: mengizinkan flex child menyusut, mencegah overflow horizontal.
- `truncate`: nomor transaksi dipotong rapi jika terlalu panjang.
- `[overflow-wrap:anywhere]`: nominal rupiah panjang boleh pecah baris supaya tidak melewati layar.
- `text-right`: nominal tetap mudah dipindai di sisi kanan.

Keterangan transaksi memakai:

```tsx
<p className="mt-3 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
    {t.description}
</p>
```

`[overflow-wrap:anywhere]` dipakai untuk menjaga deskripsi panjang, kode, atau teks tanpa spasi agar tetap masuk viewport.

## Badge Status dan Sumber

Status dan sumber dirender dalam container:

```tsx
<div className="mt-3 flex flex-wrap items-center gap-2">
```

Class penting:

- `flex-wrap`: badge akan pindah baris bila ruang sempit.
- `gap-2`: menjaga jarak antar badge tetap konsisten.

Status menggunakan mapping `statusBadge[t.status]` agar warna badge konsisten dengan status transaksi:

- `draft`: abu-abu.
- `posted`: hijau.
- `voided`: merah.
- `corrected`: amber.

Sumber transaksi hanya ditampilkan bila `t.source_label` tersedia.

## Informasi Opsional

Mitra dan referensi dibungkus dalam kondisi:

```tsx
{(t.partner_name || t.reference) && (
    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        ...
    </div>
)}
```

Tujuannya agar ruang vertikal tidak terpakai jika kedua data tersebut kosong. Mitra dan referensi ditampilkan sebagai metadata pendukung, bukan informasi utama.

## Desktop Table View

Tampilan tabel desktop dibungkus dengan:

```tsx
<div className="hidden overflow-x-auto md:block">
```

Class penting:

- `hidden md:block`: tabel hanya tampil mulai breakpoint `md`.
- `overflow-x-auto`: jika kolom desktop tetap terlalu banyak pada ukuran tertentu, tabel bisa discroll horizontal tanpa merusak layout halaman.

Kolom desktop tetap mempertahankan struktur sebelumnya:

- No. Transaksi.
- Tanggal.
- Keterangan.
- Mitra.
- Sumber.
- Status.
- Jumlah.

## Pagination

`Pagination` tetap berada di luar percabangan empty/mobile/desktop:

```tsx
<Pagination
    transactions={transactions}
    perPage={perPage}
    onPerPageChange={(val) => navigate({ per_page: val })}
/>
```

Dengan posisi ini, pagination tetap konsisten muncul setelah daftar, baik daftar sedang kosong, tampil sebagai mobile list, maupun tampil sebagai tabel desktop.

## Catatan Konsistensi

Pola ini dibuat sama dengan halaman `resources/js/Pages/Transactions/Income/Index.tsx`, dengan penyesuaian konteks:

- Route menggunakan `/transaksi/uang-keluar`.
- Ikon empty state menggunakan `TrendingDown`.
- Warna nominal mobile menggunakan `text-red-600`.
- Teks empty state dan CTA memakai istilah `Uang Keluar`.
