<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaleRequest;
use App\Models\CashBankAccount;
use App\Models\Product;
use App\Services\SaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(
        protected SaleService $saleService
    ) {}

    public function create(): Response
    {
        $companyId = auth()->user()->current_company_id;

        return Inertia::render('Sales/Pos', [
            'cashBankAccounts' => CashBankAccount::where('company_id', $companyId)
                ->active()
                ->orderBy('name')
                ->get(['id', 'name']),
            'products' => Product::where('company_id', $companyId)
                ->active()
                ->orderBy('name')
                ->get(['id', 'product_code', 'sku', 'name', 'product_type', 'unit', 'sales_price', 'is_stock_tracked', 'current_stock']),
        ]);
    }

    public function store(SaleRequest $request): RedirectResponse
    {
        try {
            $sale = DB::transaction(function () use ($request) {
                $sale = $this->saleService->create($request->validated());

                return $this->saleService->post($sale);
            });

            return redirect()->route('sales.show', $sale)
                ->with('success', 'Transaksi POS berhasil dicatat.');
        } catch (\Throwable $e) {
            return back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }
}
