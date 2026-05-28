# Panduan Implementasi Pagination

Dokumen ini menjelaskan pola yang sudah terbukti bekerja untuk menambahkan pagination pada halaman list di akuntansi-app (Laravel 13 + Inertia v3 + React).

---

## Penting: Struktur Data Inertia v3

Inertia v3 **tidak membungkus** response paginator Laravel dalam `{ data, meta, links }`. Semua field paginator ada **langsung di root object**:

```json
{
  "data": [...],
  "current_page": 1,
  "last_page": 3,
  "from": 1,
  "to": 25,
  "total": 75,
  "per_page": 25,
  "prev_page_url": null,
  "next_page_url": "http://.../halaman?page=2",
  "links": [
    { "url": null, "label": "&laquo; Previous", "active": false },
    { "url": "http://.../halaman?page=1", "label": "1", "active": true },
    { "url": "http://.../halaman?page=2", "label": "2", "active": false },
    { "url": "http://.../halaman?page=2", "label": "Next &raquo;", "active": false }
  ]
}
```

Jangan mengakses `.meta` atau `.links` sebagai paginator wrapper — field pagination ada langsung di root.

---

## 1. Backend — Controller

```php
use Illuminate\Http\Request;

public function index(Request $request): Response
{
    $companyId = auth()->user()->current_company_id;
    $baseQuery = SomeModel::where('company_id', $companyId);

    // Hitung summary SEBELUM filter diterapkan ke baseQuery
    $summary = (object) [
        'count_all'    => (clone $baseQuery)->count(),
        'count_posted' => (clone $baseQuery)->posted()->count(),
        // ...
    ];

    // Terapkan filter dari query string (default: 'posted')
    $statusFilter = $request->query('status', 'posted');
    if ($statusFilter !== 'all') {
        $baseQuery->where('status', $statusFilter);
    }

    // withQueryString() agar pagination links menyertakan ?status=...
    $items = $baseQuery
        ->orderByDesc('date')
        ->orderByDesc('created_at')
        ->paginate(25)
        ->withQueryString()
        ->through(fn($item) => [ /* transform */ ]);

    return Inertia::render('Path/To/Page', [
        'items'   => $items,
        'summary' => $summary,
        'filters' => ['status' => $statusFilter],
    ]);
}
```

**Catatan penting:**
- Hitung `$summary` menggunakan `clone $baseQuery` **sebelum** filter diterapkan agar count per tab tetap akurat.
- `.withQueryString()` wajib agar URL pagination links membawa query params yang ada (misal `?status=posted`).
- Default filter `'posted'` agar halaman pertama kali buka tidak memuat semua data sekaligus.

---

## 2. Frontend — Interface TypeScript

Definisikan interface yang merefleksikan struktur flatten Inertia v3 (tanpa `.meta`):

```tsx
interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedItems {
    data: Item[];
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    links: PaginationLink[];
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Props {
    items: PaginatedItems;
    summary: Summary;
    filters: { status: string };
}
```

---

## 3. Frontend — Filter + Pagination

Gunakan `router.get` untuk filter (server-side), bukan filter client-side:

```tsx
import { router } from '@inertiajs/react';
import { Pagination } from '@/components/ui/pagination';

export default function Index({ items, summary, filters }: Props) {
    const filter = (filters?.status as FilterType) || 'posted';

    function handleFilterChange(value: FilterType) {
        router.get(
            '/path/ke/halaman',
            { status: value },
            { preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <FilterTabs
                value={filter}
                onChange={handleFilterChange}
                items={[
                    { value: 'all',    label: 'Semua',     count: summary.count_all },
                    { value: 'posted', label: 'Diposting', count: summary.count_posted },
                    // ...
                ]}
            />

            <Table>
                {/* ... */}
            </Table>

            <Pagination transactions={items} />
        </>
    );
}
```

---

## 4. Komponen Pagination

Sudah tersedia di `resources/js/components/ui/pagination.tsx`. Cara pakai:

```tsx
<Pagination
    transactions={namaVariabelPaginatedData}
    perPage={perPage}
    onPerPageChange={(val) => navigate({ per_page: val })}
/>
```

Prop `transactions` menerima tipe `FlatPaginator` — meski namanya "transactions", bisa diisi paginated data apapun selama strukturnya sesuai.

Props opsional `perPage` + `onPerPageChange` mengaktifkan dropdown per-halaman (10, 25, 50, 100). Jika tidak diisi, dropdown tidak muncul.

Fitur komponen:
- Otomatis tersembunyi jika `last_page <= 1` dan `onPerPageChange` tidak diisi
- Navigasi prev/next via `prev_page_url` / `next_page_url`
- Nomor halaman dengan window 5 halaman + ellipsis (halaman pertama/terakhir selalu tampil)
- Dropdown per halaman (10 / 25 / 50 / 100) di sisi kiri
- Responsive: nomor halaman tersembunyi di mobile, diganti `X / Y`

---

## Checklist Implementasi

- [ ] Controller: tambah `Request $request` parameter ke method `index`
- [ ] Controller: hitung `$summary` dengan `clone $baseQuery` sebelum filter diterapkan
- [ ] Controller: baca `$request->query('status', 'posted')`
- [ ] Controller: baca `$request->query('per_page', 25)` dengan validasi `in_array($perPage, [10,25,50,100])`
- [ ] Controller: gunakan `.paginate($perPage)->withQueryString()`
- [ ] Controller: pass `'filters' => ['status' => $statusFilter, 'per_page' => $perPage]` ke Inertia
- [ ] Frontend: interface menggunakan struktur flatten (tanpa `.meta` wrapper)
- [ ] Frontend: `handleFilterChange` menggunakan `router.get` (bukan `useState` filter client-side)
- [ ] Frontend: `FilterTabs` count dari `summary` (bukan dihitung dari array data)
- [ ] Frontend: `filters` interface tambah `per_page: number`
- [ ] Frontend: buat fungsi `navigate(overrides)` yang selalu menyertakan `status` + `per_page`
- [ ] Frontend: render `<Pagination transactions={namaVar} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />`
