<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Account;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $companyId = auth()->user()->current_company_id;
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $products = Product::where('company_id', $companyId)
            ->with([
                'inventoryAccount:id,code,name',
                'revenueAccount:id,code,name',
                'expenseAccount:id,code,name',
                'cogsAccount:id,code,name',
            ])
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Product $product) => [
                'id' => $product->id,
                'product_code' => $product->product_code,
                'sku' => $product->sku,
                'name' => $product->name,
                'product_type' => $product->product_type,
                'unit' => $product->unit,
                'is_stock_tracked' => $product->is_stock_tracked,
                'sales_price' => (float) $product->sales_price,
                'purchase_price' => (float) $product->purchase_price,
                'current_stock' => (float) $product->current_stock,
                'average_cost' => (float) $product->average_cost,
                'is_active' => $product->is_active,
                'inventory_account' => $product->inventoryAccount ? [
                    'id' => $product->inventoryAccount->id,
                    'code' => $product->inventoryAccount->code,
                    'name' => $product->inventoryAccount->name,
                ] : null,
                'revenue_account' => $product->revenueAccount ? [
                    'id' => $product->revenueAccount->id,
                    'code' => $product->revenueAccount->code,
                    'name' => $product->revenueAccount->name,
                ] : null,
                'expense_account' => $product->expenseAccount ? [
                    'id' => $product->expenseAccount->id,
                    'code' => $product->expenseAccount->code,
                    'name' => $product->expenseAccount->name,
                ] : null,
                'cogs_account' => $product->cogsAccount ? [
                    'id' => $product->cogsAccount->id,
                    'code' => $product->cogsAccount->code,
                    'name' => $product->cogsAccount->name,
                ] : null,
            ]);

        return Inertia::render('MasterData/Products/Index', [
            'products' => $products,
            'filters' => [
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('MasterData/Products/Form', [
            'product' => null,
            'accounts' => $this->accountOptions(),
            'product_types' => [
                ['value' => 'goods', 'label' => 'Barang'],
                ['value' => 'service', 'label' => 'Jasa'],
            ],
        ]);
    }

    public function store(ProductRequest $request): RedirectResponse
    {
        $product = $this->productService->create($request->validated());

        return redirect()->route('products.show', $product)
            ->with('success', 'Produk berhasil ditambahkan.');
    }

    public function downloadImportTemplate(): StreamedResponse
    {
        $headers = [
            'product_code',
            'sku',
            'name',
            'product_type',
            'unit',
            'sales_price',
            'purchase_price',
            'is_stock_tracked',
            'is_active',
            'description',
            'inventory_account_id',
            'revenue_account_id',
            'expense_account_id',
            'cogs_account_id',
        ];

        $rows = [
            $headers,
            ['PRD-001', 'SKU-001', 'Contoh Barang', 'goods', 'pcs', '15000', '10000', 'ya', 'ya', 'Baris contoh, boleh dihapus', '', '', '', ''],
            ['SRV-001', '', 'Contoh Jasa', 'service', 'paket', '250000', '0', 'tidak', 'ya', '', '', '', '', ''],
        ];

        return response()->streamDownload(function () use ($rows) {
            $output = fopen('php://output', 'w');
            fwrite($output, "\xEF\xBB\xBF");

            foreach ($rows as $row) {
                fputcsv($output, $row);
            }

            fclose($output);
        }, 'template-import-produk.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function import(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ], [
            'file.required' => 'File import wajib dipilih.',
            'file.mimes' => 'File import harus berformat CSV.',
            'file.max' => 'Ukuran file import maksimal 2 MB.',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->with('error', 'Import produk gagal.');
        }

        [$rows, $parseErrors] = $this->readProductImportCsv($request->file('file')->getRealPath());

        if ($parseErrors !== []) {
            return back()
                ->withErrors(['file' => implode("\n", $parseErrors)])
                ->with('error', 'Import produk gagal. Perbaiki file lalu unggah kembali.');
        }

        if ($rows === []) {
            return back()
                ->withErrors(['file' => 'File import tidak memiliki data produk.'])
                ->with('error', 'Import produk gagal.');
        }

        [$validatedRows, $rowErrors] = $this->validateProductImportRows($rows);

        if ($rowErrors !== []) {
            return back()
                ->withErrors(['file' => implode("\n", $rowErrors)])
                ->with('error', 'Import produk gagal. Tidak ada data yang disimpan.');
        }

        DB::transaction(function () use ($validatedRows) {
            foreach ($validatedRows as $row) {
                $this->productService->create($row);
            }
        });

        return redirect()->route('products.index')
            ->with('success', count($validatedRows).' produk berhasil diimport.');
    }

    public function show(Request $request, Product $product): InertiaResponse
    {
        $this->authorizeCompany($product);
        $perPage = (int) $request->query('per_page', 25);

        if (! in_array($perPage, [10, 25, 50, 100], true)) {
            $perPage = 25;
        }

        $product->load([
            'inventoryAccount:id,code,name',
            'revenueAccount:id,code,name',
            'expenseAccount:id,code,name',
            'cogsAccount:id,code,name',
            'createdBy:id,name',
        ]);

        $recentMovements = $product->stockMovements()
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn ($m) => [
                'id' => $m->id,
                'date' => $m->date?->toDateString(),
                'movement_type' => $m->movement_type,
                'quantity_in' => (float) $m->quantity_in,
                'quantity_out' => (float) $m->quantity_out,
                'unit_cost' => (float) $m->unit_cost,
                'total_cost' => (float) $m->total_cost,
                'balance_quantity' => (float) $m->balance_quantity,
                'balance_average_cost' => (float) $m->balance_average_cost,
                'notes' => $m->notes,
                'source_type' => $m->source_type,
            ]);

        return Inertia::render('MasterData/Products/Show', [
            'product' => [
                'id' => $product->id,
                'product_code' => $product->product_code,
                'sku' => $product->sku,
                'name' => $product->name,
                'product_type' => $product->product_type,
                'unit' => $product->unit,
                'description' => $product->description,
                'is_stock_tracked' => $product->is_stock_tracked,
                'sales_price' => (float) $product->sales_price,
                'purchase_price' => (float) $product->purchase_price,
                'current_stock' => (float) $product->current_stock,
                'average_cost' => (float) $product->average_cost,
                'is_active' => $product->is_active,
                'created_by_name' => $product->createdBy?->name,
                'inventory_account' => $product->inventoryAccount ? [
                    'id' => $product->inventoryAccount->id,
                    'code' => $product->inventoryAccount->code,
                    'name' => $product->inventoryAccount->name,
                ] : null,
                'revenue_account' => $product->revenueAccount ? [
                    'id' => $product->revenueAccount->id,
                    'code' => $product->revenueAccount->code,
                    'name' => $product->revenueAccount->name,
                ] : null,
                'expense_account' => $product->expenseAccount ? [
                    'id' => $product->expenseAccount->id,
                    'code' => $product->expenseAccount->code,
                    'name' => $product->expenseAccount->name,
                ] : null,
                'cogs_account' => $product->cogsAccount ? [
                    'id' => $product->cogsAccount->id,
                    'code' => $product->cogsAccount->code,
                    'name' => $product->cogsAccount->name,
                ] : null,
            ],
            'recentMovements' => $recentMovements,
            'total_purchases' => $product->purchaseItems()->count(),
            'total_sales' => $product->saleItems()->count(),
            'filters' => [
                'per_page' => $perPage,
            ],
        ]);
    }

    public function edit(Product $product): InertiaResponse
    {
        $this->authorizeCompany($product);

        return Inertia::render('MasterData/Products/Form', [
            'product' => $product,
            'accounts' => $this->accountOptions(),
            'product_types' => [
                ['value' => 'goods', 'label' => 'Barang'],
                ['value' => 'service', 'label' => 'Jasa'],
            ],
        ]);
    }

    public function update(ProductRequest $request, Product $product): RedirectResponse
    {
        $this->authorizeCompany($product);

        $this->productService->update($product, $request->validated());

        return redirect()->route('products.show', $product)
            ->with('success', 'Produk berhasil diperbarui.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $this->authorizeCompany($product);

        $product->delete();

        return redirect()->route('products.index')
            ->with('success', 'Produk berhasil dihapus.');
    }

    public function toggleActive(Product $product): RedirectResponse
    {
        $this->authorizeCompany($product);

        $updated = $this->productService->toggleActive($product);
        $status = $updated->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Produk berhasil {$status}.");
    }

    protected function authorizeCompany(Product $product): void
    {
        if ($product->company_id !== auth()->user()->current_company_id) {
            abort(403);
        }
    }

    protected function accountOptions(): array
    {
        $companyId = auth()->user()->current_company_id;

        return Account::where('company_id', $companyId)
            ->where('is_active', true)
            ->whereDoesntHave('children')
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'type', 'subtype'])
            ->map(fn ($account) => [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type->value,
                'subtype' => $account->subtype,
            ])
            ->toArray();
    }

    protected function readProductImportCsv(string $path): array
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
        $requiredHeaders = ['name', 'product_type', 'unit'];
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

    protected function validateProductImportRows(array $rows): array
    {
        $companyId = auth()->user()->current_company_id;
        $validatedRows = [];
        $errors = [];
        $seenProductCodes = [];
        $seenSkus = [];

        foreach ($rows as $row) {
            $line = $row['line'];
            $data = $this->normalizeProductImportRow($row['data']);

            $validator = Validator::make($data, [
                'product_code' => [
                    'nullable',
                    'string',
                    'max:30',
                    Rule::unique('products', 'product_code')->where('company_id', $companyId),
                ],
                'sku' => [
                    'nullable',
                    'string',
                    'max:50',
                    Rule::unique('products', 'sku')->where('company_id', $companyId),
                ],
                'name' => ['required', 'string', 'max:255'],
                'product_type' => ['required', Rule::in(['goods', 'service'])],
                'unit' => ['required', 'string', 'max:20'],
                'description' => ['nullable', 'string'],
                'is_stock_tracked' => ['nullable', 'boolean'],
                'sales_price' => ['nullable', 'numeric', 'min:0'],
                'purchase_price' => ['nullable', 'numeric', 'min:0'],
                'inventory_account_id' => [
                    'nullable',
                    Rule::exists('accounts', 'id')
                        ->where('company_id', $companyId)
                        ->where('is_active', true),
                ],
                'revenue_account_id' => [
                    'nullable',
                    Rule::exists('accounts', 'id')
                        ->where('company_id', $companyId)
                        ->where('is_active', true),
                ],
                'expense_account_id' => [
                    'nullable',
                    Rule::exists('accounts', 'id')
                        ->where('company_id', $companyId)
                        ->where('is_active', true),
                ],
                'cogs_account_id' => [
                    'nullable',
                    Rule::exists('accounts', 'id')
                        ->where('company_id', $companyId)
                        ->where('is_active', true),
                ],
                'is_active' => ['nullable', 'boolean'],
            ], (new ProductRequest())->messages());

            $validator->after(function ($validator) use ($data, $line, &$seenProductCodes, &$seenSkus) {
                if ($data['product_code'] !== null) {
                    $key = Str::lower($data['product_code']);

                    if (isset($seenProductCodes[$key])) {
                        $validator->errors()->add('product_code', "Kode produk duplikat dengan baris {$seenProductCodes[$key]}.");
                    } else {
                        $seenProductCodes[$key] = $line;
                    }
                }

                if ($data['sku'] !== null) {
                    $key = Str::lower($data['sku']);

                    if (isset($seenSkus[$key])) {
                        $validator->errors()->add('sku', "SKU duplikat dengan baris {$seenSkus[$key]}.");
                    } else {
                        $seenSkus[$key] = $line;
                    }
                }
            });

            if ($validator->fails()) {
                foreach ($validator->errors()->all() as $message) {
                    $errors[] = "Baris {$line}: {$message}";
                }

                continue;
            }

            $parentAccountError = $this->parentAccountError($data);

            if ($parentAccountError !== null) {
                $errors[] = "Baris {$line}: {$parentAccountError}";
                continue;
            }

            if ($data['product_type'] === 'service') {
                $data['is_stock_tracked'] = false;
            }

            $validatedRows[] = $data;
        }

        return [$validatedRows, $errors];
    }

    protected function normalizeProductImportRow(array $row): array
    {
        return [
            'product_code' => $this->normalizeImportText($row['product_code'] ?? null),
            'sku' => $this->normalizeImportText($row['sku'] ?? null),
            'name' => $this->normalizeImportText($row['name'] ?? null),
            'product_type' => $this->normalizeProductType($row['product_type'] ?? null),
            'unit' => $this->normalizeImportText($row['unit'] ?? null),
            'sales_price' => $this->normalizeImportNumber($row['sales_price'] ?? null),
            'purchase_price' => $this->normalizeImportNumber($row['purchase_price'] ?? null),
            'is_stock_tracked' => $this->normalizeImportBoolean($row['is_stock_tracked'] ?? null),
            'is_active' => $this->normalizeImportBoolean($row['is_active'] ?? null),
            'description' => $this->normalizeImportText($row['description'] ?? null),
            'inventory_account_id' => $this->normalizeImportInteger($row['inventory_account_id'] ?? null),
            'revenue_account_id' => $this->normalizeImportInteger($row['revenue_account_id'] ?? null),
            'expense_account_id' => $this->normalizeImportInteger($row['expense_account_id'] ?? null),
            'cogs_account_id' => $this->normalizeImportInteger($row['cogs_account_id'] ?? null),
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

    protected function normalizeProductType(mixed $value): ?string
    {
        $value = Str::lower((string) $this->normalizeImportText($value));

        return match ($value) {
            'barang', 'goods', 'produk' => 'goods',
            'jasa', 'service', 'layanan' => 'service',
            default => $value !== '' ? $value : null,
        };
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

    protected function normalizeImportInteger(mixed $value): mixed
    {
        $number = $this->normalizeImportNumber($value);

        if ($number === null) {
            return null;
        }

        if (! is_numeric($number)) {
            return $number;
        }

        return (int) $number;
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

    protected function parentAccountError(array $data): ?string
    {
        $fields = [
            'inventory_account_id' => 'Akun persediaan',
            'revenue_account_id' => 'Akun penjualan',
            'expense_account_id' => 'Akun beban',
            'cogs_account_id' => 'Akun HPP',
        ];

        $accountIds = collect($fields)
            ->keys()
            ->map(fn (string $field) => $data[$field] ?? null)
            ->filter()
            ->unique()
            ->values();

        if ($accountIds->isEmpty()) {
            return null;
        }

        $parentAccountIds = Account::whereIn('id', $accountIds)
            ->whereHas('children')
            ->pluck('id')
            ->all();

        foreach ($fields as $field => $label) {
            if (in_array((int) ($data[$field] ?? 0), $parentAccountIds, true)) {
                return "{$label} tidak boleh akun induk/group";
            }
        }

        return null;
    }
}
