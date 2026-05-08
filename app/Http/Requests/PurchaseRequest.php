<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;

        return [
            'supplier_id' => [
                'nullable',
                Rule::exists('suppliers', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true),
            ],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'due_date' => ['nullable', 'date', 'after_or_equal:date'],
            'payment_type' => ['required', Rule::in(['cash', 'credit'])],
            'cash_bank_account_id' => [
                'nullable',
                Rule::exists('cash_bank_accounts', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true),
            ],
            'notes' => ['nullable', 'string'],
            'reference' => ['nullable', 'string', 'max:100'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                Rule::exists('products', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true),
            ],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit' => ['nullable', 'string', 'max:20'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.tax_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.line_total' => ['nullable', 'numeric', 'min:0'],
            'items.*.inventory_account_id' => [
                'nullable',
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
            'items.*.expense_account_id' => [
                'nullable',
                Rule::exists('accounts', 'id')->where('company_id', $companyId),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.exists' => 'Supplier tidak valid atau tidak aktif.',
            'date.required' => 'Tanggal pembelian wajib diisi.',
            'date.before_or_equal' => 'Tanggal pembelian tidak boleh di masa depan.',
            'due_date.date' => 'Tanggal jatuh tempo tidak valid.',
            'due_date.after_or_equal' => 'Tanggal jatuh tempo tidak boleh sebelum tanggal pembelian.',
            'payment_type.required' => 'Jenis pembayaran wajib dipilih.',
            'payment_type.in' => 'Jenis pembayaran tidak valid.',
            'cash_bank_account_id.exists' => 'Kas/bank tidak valid atau tidak aktif.',
            'reference.max' => 'No. referensi maksimal 100 karakter.',
            'items.required' => 'Pembelian harus memiliki item.',
            'items.min' => 'Pembelian harus memiliki minimal satu item.',
            'items.*.product_id.required' => 'Produk wajib dipilih pada setiap item.',
            'items.*.product_id.exists' => 'Produk tidak valid atau tidak aktif.',
            'items.*.description.max' => 'Keterangan item maksimal 255 karakter.',
            'items.*.quantity.required' => 'Qty wajib diisi.',
            'items.*.quantity.numeric' => 'Qty harus berupa angka.',
            'items.*.quantity.gt' => 'Qty harus lebih besar dari 0.',
            'items.*.unit.max' => 'Satuan item maksimal 20 karakter.',
            'items.*.unit_price.numeric' => 'Harga item harus berupa angka.',
            'items.*.unit_price.min' => 'Harga item tidak boleh negatif.',
            'items.*.discount_amount.numeric' => 'Diskon item harus berupa angka.',
            'items.*.discount_amount.min' => 'Diskon item tidak boleh negatif.',
            'items.*.tax_amount.numeric' => 'Pajak item harus berupa angka.',
            'items.*.tax_amount.min' => 'Pajak item tidak boleh negatif.',
            'items.*.line_total.numeric' => 'Total item harus berupa angka.',
            'items.*.line_total.min' => 'Total item tidak boleh negatif.',
            'items.*.inventory_account_id.exists' => 'Akun persediaan item tidak valid.',
            'items.*.expense_account_id.exists' => 'Akun beban item tidak valid.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $companyId = $this->user()->current_company_id;
            $items = $this->input('items', []);

            if ($this->input('payment_type') === 'cash' && ! $this->filled('cash_bank_account_id')) {
                $v->errors()->add('cash_bank_account_id', 'Pembelian tunai harus menggunakan akun kas/bank.');
            }

            if ($this->input('payment_type') === 'credit') {
                if (! $this->filled('supplier_id')) {
                    $v->errors()->add('supplier_id', 'Pembelian kredit harus memiliki supplier.');
                }

                if (! $this->filled('due_date')) {
                    $v->errors()->add('due_date', 'Pembelian kredit harus memiliki tanggal jatuh tempo.');
                }
            }

            foreach ($items as $index => $item) {
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

                if (($item['quantity'] ?? 0) <= 0) {
                    continue;
                }

                $unitPrice = isset($item['unit_price']) && $item['unit_price'] !== ''
                    ? (float) $item['unit_price']
                    : null;

                if ($unitPrice === null && (float) $product->purchase_price <= 0) {
                    $v->errors()->add("items.$index.unit_price", 'Harga item wajib diisi jika harga beli default produk belum ada.');
                }
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $items = $this->input('items', []);

        if (is_array($items)) {
            $normalized = array_map(function ($item) {
                return array_merge($item, [
                    'discount_amount' => isset($item['discount_amount']) && $item['discount_amount'] !== '' ? $item['discount_amount'] : 0,
                    'tax_amount' => isset($item['tax_amount']) && $item['tax_amount'] !== '' ? $item['tax_amount'] : 0,
                ]);
            }, $items);

            $this->merge(['items' => $normalized]);
        }
    }
}
