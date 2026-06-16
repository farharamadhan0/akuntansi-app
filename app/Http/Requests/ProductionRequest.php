<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductionRequest extends FormRequest
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
            'product_id' => [
                'required',
                Rule::exists('products', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true)
                    ->where('is_stock_tracked', true)
                    ->whereIn('product_type', ['semi_finished', 'menu_item', 'goods']),
            ],
            'actual_yield_quantity' => ['required', 'numeric', 'gt:0'],
            'notes' => ['nullable', 'string'],
            'inputs' => ['required', 'array', 'min:1'],
            'inputs.*.product_id' => [
                'required',
                Rule::exists('products', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true)
                    ->where('is_stock_tracked', true),
            ],
            'inputs.*.planned_quantity' => ['required', 'numeric', 'gt:0'],
            'inputs.*.actual_quantity' => ['required', 'numeric', 'gt:0'],
            'inputs.*.unit' => ['required', 'string', 'max:20'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $companyId = $this->user()->current_company_id;
            $productId = (int) $this->input('product_id');
            $outputProduct = Product::withoutGlobalScope('company')
                ->where('company_id', $companyId)
                ->with('activeRecipe')
                ->find($productId);

            if ($outputProduct && ! $outputProduct->activeRecipe) {
                $v->errors()->add('product_id', 'Produk hasil harus memiliki resep aktif.');
            }

            foreach ($this->input('inputs', []) as $index => $input) {
                if ((int) ($input['product_id'] ?? 0) === $productId) {
                    $v->errors()->add("inputs.{$index}.product_id", 'Produk hasil tidak boleh menjadi bahan input produksi yang sama.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'date.required' => 'Tanggal produksi wajib diisi.',
            'date.before_or_equal' => 'Tanggal produksi tidak boleh di masa depan.',
            'product_id.required' => 'Produk hasil wajib dipilih.',
            'product_id.exists' => 'Produk hasil tidak valid atau belum menggunakan stok.',
            'actual_yield_quantity.required' => 'Hasil aktual wajib diisi.',
            'actual_yield_quantity.gt' => 'Hasil aktual harus lebih dari 0.',
            'inputs.required' => 'Produksi harus memiliki minimal satu bahan.',
            'inputs.min' => 'Produksi harus memiliki minimal satu bahan.',
            'inputs.*.product_id.required' => 'Bahan wajib dipilih.',
            'inputs.*.product_id.exists' => 'Bahan tidak valid atau tidak menggunakan stok.',
            'inputs.*.planned_quantity.required' => 'Qty rencana bahan wajib diisi.',
            'inputs.*.planned_quantity.gt' => 'Qty rencana bahan harus lebih dari 0.',
            'inputs.*.actual_quantity.required' => 'Qty aktual bahan wajib diisi.',
            'inputs.*.actual_quantity.gt' => 'Qty aktual bahan harus lebih dari 0.',
            'inputs.*.unit.required' => 'Satuan bahan wajib diisi.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $inputs = collect($this->input('inputs', []))
            ->filter(fn ($input) => is_array($input) && ($input['product_id'] ?? '') !== '')
            ->map(fn ($input) => [
                'product_id' => $input['product_id'] ?? null,
                'planned_quantity' => $input['planned_quantity'] ?? null,
                'actual_quantity' => $input['actual_quantity'] ?? null,
                'unit' => $input['unit'] ?? null,
            ])
            ->values()
            ->all();

        $this->merge(['inputs' => $inputs]);
    }
}
