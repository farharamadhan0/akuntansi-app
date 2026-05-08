<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Account;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    public function index(): Response
    {
        $companyId = auth()->user()->current_company_id;

        $products = Product::where('company_id', $companyId)
            ->with([
                'inventoryAccount:id,code,name',
                'revenueAccount:id,code,name',
                'expenseAccount:id,code,name',
                'cogsAccount:id,code,name',
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product) => [
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
        ]);
    }

    public function create(): Response
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

    public function show(Product $product): Response
    {
        $this->authorizeCompany($product);

        $product->load([
            'inventoryAccount:id,code,name',
            'revenueAccount:id,code,name',
            'expenseAccount:id,code,name',
            'cogsAccount:id,code,name',
            'createdBy:id,name',
        ]);

        return Inertia::render('MasterData/Products/Form', [
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
                'inventory_account_id' => $product->inventory_account_id,
                'revenue_account_id' => $product->revenue_account_id,
                'expense_account_id' => $product->expense_account_id,
                'cogs_account_id' => $product->cogs_account_id,
            ],
            'accounts' => $this->accountOptions(),
            'product_types' => [
                ['value' => 'goods', 'label' => 'Barang'],
                ['value' => 'service', 'label' => 'Jasa'],
            ],
            'readonly' => true,
        ]);
    }

    public function edit(Product $product): Response
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
}
