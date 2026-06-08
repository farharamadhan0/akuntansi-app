<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Http\Requests\PartnerRequest;
use App\Models\Partner;
use App\Services\NumberGeneratorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PartnerController extends Controller
{
    public function __construct(
        protected NumberGeneratorService $numberGenerator,
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->current_company_id;
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $query = Partner::where('company_id', $companyId)
            ->with('typeAssignments')
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $status = $request->filled('status') ? $request->status : 'active';
        if ($status !== 'all') {
            $query->where('is_active', $status === 'active');
        }

        $type = $request->filled('type') ? $request->type : 'all';
        if (in_array($type, Partner::TYPES, true)) {
            $query->ofType($type);
        }

        $partners = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Partner $p) => [
            'id' => $p->id,
            'code' => $p->code,
            'name' => $p->name,
            'email' => $p->email,
            'phone' => $p->phone,
            'is_active' => $p->is_active,
            'types' => $p->types,
        ]);

        return Inertia::render('MasterData/Partners/Index', [
            'partners' => $partners,
            'filters' => [
                ...$request->only(['search', 'status', 'type']),
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('MasterData/Partners/Form');
    }

    public function downloadImportTemplate(string $type): StreamedResponse
    {
        $type = $this->normalizeImportType($type);
        abort_unless(in_array($type, Partner::TYPES, true), 404);

        $typeLabel = $type === Partner::TYPE_CUSTOMER ? 'customer' : 'supplier';
        $headers = [
            'code',
            'name',
            'email',
            'phone',
            'address',
            'tax_id',
            'credit_limit',
            'is_active',
            'notes',
        ];

        $rows = [
            $headers,
            [
                $type === Partner::TYPE_CUSTOMER ? 'CUST-001' : 'SUP-001',
                $type === Partner::TYPE_CUSTOMER ? 'Contoh Pelanggan' : 'Contoh Supplier',
                $type === Partner::TYPE_CUSTOMER ? 'pelanggan@example.com' : 'supplier@example.com',
                '081234567890',
                'Alamat contoh',
                '0123456789012345',
                $type === Partner::TYPE_CUSTOMER ? '5000000' : '0',
                'ya',
                'Baris contoh, boleh dihapus',
            ],
        ];

        return response()->streamDownload(function () use ($rows) {
            $output = fopen('php://output', 'w');
            fwrite($output, "\xEF\xBB\xBF");

            foreach ($rows as $row) {
                fputcsv($output, $row);
            }

            fclose($output);
        }, "template-import-mitra-{$typeLabel}.csv", [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function import(Request $request, string $type): RedirectResponse
    {
        $type = $this->normalizeImportType($type);

        if (! in_array($type, Partner::TYPES, true)) {
            abort(404);
        }

        $validator = Validator::make($request->all(), [
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ], [
            'file.required' => 'File import wajib dipilih.',
            'file.mimes' => 'File import harus berformat CSV.',
            'file.max' => 'Ukuran file import maksimal 2 MB.',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->with('error', 'Import mitra gagal.');
        }

        [$rows, $parseErrors] = $this->readPartnerImportCsv($request->file('file')->getRealPath());

        if ($parseErrors !== []) {
            return back()
                ->withErrors(['file' => implode("\n", $parseErrors)])
                ->with('error', 'Import mitra gagal. Perbaiki file lalu unggah kembali.');
        }

        if ($rows === []) {
            return back()
                ->withErrors(['file' => 'File import tidak memiliki data mitra.'])
                ->with('error', 'Import mitra gagal.');
        }

        [$validatedRows, $rowErrors] = $this->validatePartnerImportRows($rows, $type);

        if ($rowErrors !== []) {
            return back()
                ->withErrors(['file' => implode("\n", $rowErrors)])
                ->with('error', 'Import mitra gagal. Tidak ada data yang disimpan.');
        }

        DB::transaction(function () use ($validatedRows) {
            foreach ($validatedRows as $row) {
                $types = $row['types'];
                unset($row['types']);

                if (! filled($row['code'] ?? null)) {
                    $row['code'] = $this->numberGenerator->generatePartnerCode($row['company_id']);
                }

                $partner = Partner::create($row);
                $partner->syncTypes($types);
            }
        });

        $label = $type === Partner::TYPE_CUSTOMER ? 'pelanggan' : 'supplier';

        return redirect()
            ->route('partners.index')
            ->with('success', count($validatedRows)." {$label} berhasil diimport.");
    }

    public function show(Partner $partner): Response
    {
        $this->authorizeCompany($partner);

        $partner->load([
            'typeAssignments',
            'receivables' => fn ($q) => $q->latest('date')->limit(5),
            'payables' => fn ($q) => $q->latest('date')->limit(5),
            'sales' => fn ($q) => $q->latest('date')->limit(5),
            'purchases' => fn ($q) => $q->latest('date')->limit(5),
        ]);

        return Inertia::render('MasterData/Partners/Show', [
            'partner' => [
                'id' => $partner->id,
                'code' => $partner->code,
                'name' => $partner->name,
                'email' => $partner->email,
                'phone' => $partner->phone,
                'address' => $partner->address,
                'tax_id' => $partner->tax_id,
                'credit_limit' => $partner->credit_limit !== null ? (float) $partner->credit_limit : null,
                'notes' => $partner->notes,
                'is_active' => $partner->is_active,
                'types' => $partner->types,
                'is_customer' => $partner->is_customer,
                'is_supplier' => $partner->is_supplier,
                'outstanding_receivables' => (float) $partner->outstanding_receivables,
                'outstanding_payables' => (float) $partner->outstanding_payables,
                'total_receivables' => $partner->receivables()->count(),
                'active_receivables' => $partner->receivables()
                    ->where('status', TransactionStatus::Posted)
                    ->where('payment_status', '!=', PaymentStatus::Paid)
                    ->count(),
                'total_payables' => $partner->payables()->count(),
                'active_payables' => $partner->payables()
                    ->where('status', TransactionStatus::Posted)
                    ->where('payment_status', '!=', PaymentStatus::Paid)
                    ->count(),
                'total_sales' => $partner->sales()->count(),
                'total_purchases' => $partner->purchases()->count(),
            ],
            'recentReceivables' => $partner->receivables->map(fn ($r) => [
                'id' => $r->id,
                'receivable_number' => $r->receivable_number,
                'date' => optional($r->date)->toDateString(),
                'due_date' => optional($r->due_date)->toDateString(),
                'amount' => (float) $r->amount,
                'paid_amount' => (float) $r->paid_amount,
                'remaining_amount' => (float) $r->remaining_amount,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'payment_status' => $r->payment_status->value,
                'payment_status_label' => $r->payment_status->label(),
            ])->values(),
            'recentPayables' => $partner->payables->map(fn ($p) => [
                'id' => $p->id,
                'payable_number' => $p->payable_number,
                'date' => optional($p->date)->toDateString(),
                'due_date' => optional($p->due_date)->toDateString(),
                'amount' => (float) $p->amount,
                'paid_amount' => (float) $p->paid_amount,
                'remaining_amount' => (float) $p->remaining_amount,
                'status' => $p->status->value,
                'status_label' => $p->status->label(),
                'payment_status' => $p->payment_status->value,
                'payment_status_label' => $p->payment_status->label(),
            ])->values(),
            'recentSales' => $partner->sales->map(fn ($s) => [
                'id' => $s->id,
                'sale_number' => $s->sale_number,
                'date' => optional($s->date)->toDateString(),
                'due_date' => optional($s->due_date)->toDateString(),
                'payment_type' => $s->payment_type,
                'payment_type_label' => $s->payment_type === 'cash' ? 'Tunai' : 'Kredit',
                'total_amount' => (float) $s->total_amount,
                'status' => $s->status->value,
                'status_label' => $s->status->label(),
            ])->values(),
            'recentPurchases' => $partner->purchases->map(fn ($p) => [
                'id' => $p->id,
                'purchase_number' => $p->purchase_number,
                'date' => optional($p->date)->toDateString(),
                'due_date' => optional($p->due_date)->toDateString(),
                'payment_type' => $p->payment_type,
                'payment_type_label' => $p->payment_type === 'cash' ? 'Tunai' : 'Kredit',
                'total_amount' => (float) $p->total_amount,
                'status' => $p->status->value,
                'status_label' => $p->status->label(),
            ])->values(),
        ]);
    }

    public function store(PartnerRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $companyId = auth()->user()->current_company_id;

        $types = $data['types'];
        unset($data['types']);

        $data['company_id'] = $companyId;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['code'] = filled($data['code'] ?? null)
            ? $data['code']
            : $this->numberGenerator->generatePartnerCode($companyId);

        DB::transaction(function () use ($data, $types) {
            $partner = Partner::create($data);
            $partner->syncTypes($types);
        });

        return redirect()
            ->route('partners.index')
            ->with('success', 'Mitra berhasil ditambahkan.');
    }

    public function edit(Partner $partner): Response
    {
        $this->authorizeCompany($partner);
        $partner->load('typeAssignments');

        return Inertia::render('MasterData/Partners/Form', [
            'partner' => [
                'id' => $partner->id,
                'code' => $partner->code,
                'name' => $partner->name,
                'email' => $partner->email,
                'phone' => $partner->phone,
                'address' => $partner->address,
                'tax_id' => $partner->tax_id,
                'credit_limit' => $partner->credit_limit,
                'notes' => $partner->notes,
                'is_active' => $partner->is_active,
                'types' => $partner->types,
            ],
        ]);
    }

    public function update(PartnerRequest $request, Partner $partner): RedirectResponse
    {
        $this->authorizeCompany($partner);

        $data = $request->validated();
        $types = $data['types'];
        unset($data['types']);

        DB::transaction(function () use ($partner, $data, $types) {
            $partner->update($data);
            $partner->syncTypes($types);
        });

        return redirect()
            ->route('partners.index')
            ->with('success', 'Mitra berhasil diperbarui.');
    }

    public function destroy(Partner $partner): RedirectResponse
    {
        $this->authorizeCompany($partner);

        $hasActiveReceivables = $partner->receivables()
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->exists();

        $hasActivePayables = $partner->payables()
            ->where('status', TransactionStatus::Posted)
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->exists();

        if ($hasActiveReceivables || $hasActivePayables) {
            return back()->with(
                'error',
                'Mitra tidak dapat dihapus karena masih memiliki piutang atau hutang aktif.'
            );
        }

        $partner->delete();

        return redirect()
            ->route('partners.index')
            ->with('success', 'Mitra berhasil dihapus.');
    }

    public function toggleActive(Partner $partner): RedirectResponse
    {
        $this->authorizeCompany($partner);

        $partner->update(['is_active' => ! $partner->is_active]);

        $status = $partner->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return back()->with('success', "Mitra berhasil {$status}.");
    }

    protected function authorizeCompany(Partner $partner): void
    {
        if ($partner->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }

    protected function readPartnerImportCsv(string $path): array
    {
        $handle = fopen($path, 'r');

        if ($handle === false) {
            return [[], ['File import tidak bisa dibaca.']];
        }

        $firstLine = fgets($handle);
        rewind($handle);

        $delimiter = $this->detectCsvDelimiter((string) $firstLine);
        $headers = fgetcsv($handle, 0, $delimiter);

        if ($headers === false) {
            fclose($handle);

            return [[], ['Header CSV tidak ditemukan.']];
        }

        $headers = array_map(fn ($header) => Str::of((string) $header)->trim()->lower()->replace("\xEF\xBB\xBF", '')->toString(), $headers);
        $requiredHeaders = ['name'];
        $missingHeaders = array_values(array_diff($requiredHeaders, $headers));

        if ($missingHeaders !== []) {
            fclose($handle);

            return [[], ['Kolom wajib tidak ditemukan: '.implode(', ', $missingHeaders).'.']];
        }

        $rows = [];
        $errors = [];
        $lineNumber = 1;

        while (($values = fgetcsv($handle, 0, $delimiter)) !== false) {
            $lineNumber++;

            if ($this->isBlankCsvRow($values)) {
                continue;
            }

            if (count($values) > count($headers)) {
                $errors[] = "Baris {$lineNumber}: jumlah kolom lebih banyak dari header.";
                continue;
            }

            $values = array_pad($values, count($headers), null);
            $rows[] = [
                'line' => $lineNumber,
                'data' => array_combine($headers, $values),
            ];
        }

        fclose($handle);

        return [$rows, $errors];
    }

    protected function validatePartnerImportRows(array $rows, string $type): array
    {
        $companyId = auth()->user()->current_company_id;
        $validatedRows = [];
        $errors = [];
        $seenCodes = [];

        foreach ($rows as $row) {
            $line = $row['line'];
            $data = $this->normalizePartnerImportRow($row['data'], $type, $companyId);

            $validator = Validator::make($data, [
                'name' => ['required', 'string', 'max:255'],
                'code' => [
                    'nullable',
                    'string',
                    'max:20',
                    Rule::unique('partners')->where('company_id', $companyId),
                ],
                'email' => ['nullable', 'email', 'max:255'],
                'phone' => ['nullable', 'string', 'max:50'],
                'address' => ['nullable', 'string', 'max:1000'],
                'tax_id' => ['nullable', 'string', 'max:50'],
                'credit_limit' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string', 'max:1000'],
                'is_active' => ['boolean'],
                'types' => ['required', 'array', 'min:1'],
                'types.*' => ['string', Rule::in(Partner::TYPES)],
            ], (new PartnerRequest())->messages());

            $validator->after(function ($validator) use ($data, $line, &$seenCodes) {
                if ($data['code'] === null) {
                    return;
                }

                $key = Str::lower($data['code']);

                if (isset($seenCodes[$key])) {
                    $validator->errors()->add('code', "Kode mitra duplikat dengan baris {$seenCodes[$key]}.");
                } else {
                    $seenCodes[$key] = $line;
                }
            });

            if ($validator->fails()) {
                foreach ($validator->errors()->all() as $message) {
                    $errors[] = "Baris {$line}: {$message}";
                }

                continue;
            }

            $validatedRows[] = $data;
        }

        return [$validatedRows, $errors];
    }

    protected function normalizePartnerImportRow(array $row, string $type, int $companyId): array
    {
        $code = $this->normalizeImportText($row['code'] ?? null);

        return [
            'company_id' => $companyId,
            'code' => $code,
            'name' => $this->normalizeImportText($row['name'] ?? null),
            'email' => $this->normalizeImportText($row['email'] ?? null),
            'phone' => $this->normalizeImportText($row['phone'] ?? null),
            'address' => $this->normalizeImportText($row['address'] ?? null),
            'tax_id' => $this->normalizeImportText($row['tax_id'] ?? null),
            'credit_limit' => $this->normalizeImportNumber($row['credit_limit'] ?? null),
            'notes' => $this->normalizeImportText($row['notes'] ?? null),
            'is_active' => $this->normalizeImportBoolean($row['is_active'] ?? 'ya'),
            'types' => [$type],
        ];
    }

    protected function normalizeImportText(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));

        if ($value === '') {
            return null;
        }

        if (preg_match('/^\d+\.0+$/', $value) === 1) {
            return Str::before($value, '.');
        }

        return $value;
    }

    protected function normalizeImportNumber(mixed $value): ?string
    {
        $rawValue = trim((string) ($value ?? ''));
        $value = $rawValue;

        if ($value === '') {
            return null;
        }

        $value = preg_replace('/[^\d,.\-]/', '', $value);

        if ($value === '' || $value === null) {
            return $rawValue;
        }

        $lastComma = strrpos($value, ',');
        $lastDot = strrpos($value, '.');

        if ($lastComma !== false && $lastDot !== false) {
            $decimalSeparator = $lastComma > $lastDot ? ',' : '.';
            $thousandSeparator = $decimalSeparator === ',' ? '.' : ',';
            $value = str_replace($thousandSeparator, '', $value);
            $value = str_replace($decimalSeparator, '.', $value);
        } elseif ($lastComma !== false) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } elseif (substr_count($value, '.') > 1) {
            $value = str_replace('.', '', $value);
        }

        return $value;
    }

    protected function normalizeImportBoolean(mixed $value): mixed
    {
        $value = Str::lower((string) $this->normalizeImportText($value));

        if ($value === '') {
            return null;
        }

        return match ($value) {
            '1', 'true', 'yes', 'ya', 'y', 'aktif', 'active' => true,
            '0', 'false', 'no', 'tidak', 'n', 'nonaktif', 'inactive' => false,
            default => $value,
        };
    }

    protected function normalizeImportType(string $type): string
    {
        return match (Str::lower($type)) {
            'customer', 'pelanggan' => Partner::TYPE_CUSTOMER,
            'supplier', 'pemasok' => Partner::TYPE_SUPPLIER,
            default => $type,
        };
    }

    protected function detectCsvDelimiter(string $line): string
    {
        $delimiters = [',' => 0, ';' => 0, "\t" => 0];

        foreach ($delimiters as $delimiter => $_) {
            $delimiters[$delimiter] = substr_count($line, $delimiter);
        }

        arsort($delimiters);

        return array_key_first($delimiters) ?: ',';
    }

    protected function isBlankCsvRow(array $values): bool
    {
        foreach ($values as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }
}
