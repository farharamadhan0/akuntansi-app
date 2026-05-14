<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;

        return [
            'date' => ['required', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                Rule::exists('products', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true),
            ],
            'items.*.adjustment_type' => ['required', Rule::in(['in', 'out'])],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'items.*.inventory_account_id' => [
                'nullable',
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
            'items.*.adjustment_account_id' => [
                'nullable',
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
            'items.*.reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.required' => 'Tanggal penyesuaian stok wajib diisi.',
            'date.before_or_equal' => 'Tanggal penyesuaian stok tidak boleh di masa depan.',
            'items.required' => 'Penyesuaian stok harus memiliki item.',
            'items.min' => 'Penyesuaian stok harus memiliki minimal satu item.',
            'items.*.product_id.required' => 'Produk wajib dipilih pada setiap item.',
            'items.*.product_id.exists' => 'Produk tidak valid atau tidak aktif.',
            'items.*.adjustment_type.required' => 'Tipe penyesuaian wajib dipilih.',
            'items.*.adjustment_type.in' => 'Tipe penyesuaian tidak valid.',
            'items.*.quantity.required' => 'Qty wajib diisi.',
            'items.*.quantity.numeric' => 'Qty harus berupa angka.',
            'items.*.quantity.gt' => 'Qty harus lebih besar dari 0.',
            'items.*.unit_cost.numeric' => 'Unit cost harus berupa angka.',
            'items.*.unit_cost.min' => 'Unit cost tidak boleh negatif.',
            'items.*.inventory_account_id.exists' => 'Akun persediaan item tidak valid.',
            'items.*.adjustment_account_id.exists' => 'Akun selisih stok item tidak valid.',
            'items.*.reason.max' => 'Alasan item maksimal 255 karakter.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $companyId = $this->user()->current_company_id;

            foreach ($this->input('items', []) as $index => $item) {
                $productId = $item['product_id'] ?? null;
                if (! $productId) {
                    continue;
                }

                $product = Product::withoutGlobalScope('company')
                    ->where('company_id', $companyId)
                    ->find($productId);

                if (! $product) {
                    continue;
                }

                if (! $product->is_stock_tracked) {
                    $v->errors()->add("items.$index.product_id", 'Hanya produk barang yang dapat disesuaikan stoknya.');
                }

                if (($item['adjustment_type'] ?? null) === 'in' && blank($item['unit_cost'] ?? null)) {
                    $v->errors()->add("items.$index.unit_cost", 'Penyesuaian masuk wajib memiliki unit cost.');
                }
            }
        });
    }
}
