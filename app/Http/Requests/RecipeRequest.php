<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RecipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;
        $recipeId = $this->route('recipe')?->id;

        return [
            'product_id' => [
                'required',
                Rule::exists('products', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true)
                    ->whereIn('product_type', ['menu_item', 'semi_finished']),
                Rule::unique('recipes', 'product_id')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at')
                    ->ignore($recipeId),
            ],
            'yield_quantity' => ['required', 'numeric', 'gt:0'],
            'yield_unit' => ['required', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.ingredient_product_id' => [
                'required',
                Rule::exists('products', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true)
                    ->where('is_stock_tracked', true),
            ],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit' => ['required', 'string', 'max:20'],
            'items.*.waste_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $productId = (int) $this->input('product_id');
            $seenIngredients = [];

            foreach ($this->input('items', []) as $index => $item) {
                $ingredientId = (int) ($item['ingredient_product_id'] ?? 0);

                if ($ingredientId === $productId) {
                    $validator->errors()->add("items.{$index}.ingredient_product_id", 'Produk hasil resep tidak boleh menjadi bahan resepnya sendiri.');
                }

                if ($ingredientId > 0 && isset($seenIngredients[$ingredientId])) {
                    $validator->errors()->add("items.{$index}.ingredient_product_id", 'Bahan yang sama tidak boleh ditambahkan lebih dari sekali.');
                }

                $seenIngredients[$ingredientId] = true;
            }
        });
    }

    public function messages(): array
    {
        return [
            'product_id.required' => 'Menu hasil resep wajib dipilih.',
            'product_id.exists' => 'Menu hasil resep tidak valid.',
            'product_id.unique' => 'Produk ini sudah memiliki resep.',
            'yield_quantity.required' => 'Jumlah hasil resep wajib diisi.',
            'yield_quantity.gt' => 'Jumlah hasil resep harus lebih dari 0.',
            'yield_unit.required' => 'Satuan hasil resep wajib diisi.',
            'items.required' => 'Resep harus memiliki minimal satu bahan.',
            'items.min' => 'Resep harus memiliki minimal satu bahan.',
            'items.*.ingredient_product_id.required' => 'Bahan wajib dipilih.',
            'items.*.ingredient_product_id.exists' => 'Bahan tidak valid.',
            'items.*.quantity.required' => 'Jumlah bahan wajib diisi.',
            'items.*.quantity.gt' => 'Jumlah bahan harus lebih dari 0.',
            'items.*.unit.required' => 'Satuan bahan wajib diisi.',
            'items.*.waste_percentage.max' => 'Waste maksimal 100%.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $items = collect($this->input('items', []))
            ->filter(fn ($item) => is_array($item) && ($item['ingredient_product_id'] ?? '') !== '')
            ->map(fn ($item) => [
                'ingredient_product_id' => $item['ingredient_product_id'] ?? null,
                'quantity' => $item['quantity'] ?? null,
                'unit' => $item['unit'] ?? null,
                'waste_percentage' => $item['waste_percentage'] ?? 0,
            ])
            ->values()
            ->all();

        $this->merge([
            'is_active' => $this->boolean('is_active', true),
            'items' => $items,
        ]);
    }
}
