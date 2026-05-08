<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;
        $productId = $this->route('product')?->id;

        return [
            'product_code' => [
                'nullable',
                'string',
                'max:30',
                Rule::unique('products', 'product_code')
                    ->where('company_id', $companyId)
                    ->ignore($productId),
            ],
            'sku' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('products', 'sku')
                    ->where('company_id', $companyId)
                    ->ignore($productId),
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
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
            'revenue_account_id' => [
                'nullable',
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
            'expense_account_id' => [
                'nullable',
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
            'cogs_account_id' => [
                'nullable',
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'product_code.max' => 'Kode produk maksimal 30 karakter.',
            'product_code.unique' => 'Kode produk sudah digunakan.',
            'sku.max' => 'SKU maksimal 50 karakter.',
            'sku.unique' => 'SKU sudah digunakan.',
            'name.required' => 'Nama produk wajib diisi.',
            'name.max' => 'Nama produk maksimal 255 karakter.',
            'product_type.required' => 'Tipe produk wajib dipilih.',
            'product_type.in' => 'Tipe produk tidak valid.',
            'unit.required' => 'Satuan wajib diisi.',
            'unit.max' => 'Satuan maksimal 20 karakter.',
            'sales_price.numeric' => 'Harga jual harus berupa angka.',
            'sales_price.min' => 'Harga jual tidak boleh negatif.',
            'purchase_price.numeric' => 'Harga beli harus berupa angka.',
            'purchase_price.min' => 'Harga beli tidak boleh negatif.',
            'inventory_account_id.exists' => 'Akun persediaan tidak valid.',
            'revenue_account_id.exists' => 'Akun penjualan tidak valid.',
            'expense_account_id.exists' => 'Akun beban tidak valid.',
            'cogs_account_id.exists' => 'Akun HPP tidak valid.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('product_type') === 'service') {
            $this->merge(['is_stock_tracked' => false]);
        }
    }
}
