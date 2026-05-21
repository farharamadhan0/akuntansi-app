<?php

namespace App\Http\Requests;

use App\Models\Partner;
use App\Models\TransactionCategory;
use Illuminate\Foundation\Http\FormRequest;

class PayableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = auth()->user()->current_company_id;

        return [
            'partner_id' => [
                'required',
                'integer',
                function ($attribute, $value, $fail) use ($companyId) {
                    $partner = Partner::where('id', $value)
                        ->where('company_id', $companyId)
                        ->where('is_active', true)
                        ->first();
                    if (! $partner || ! $partner->hasType(Partner::TYPE_SUPPLIER)) {
                        $fail('Supplier tidak valid.');
                    }
                },
            ],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'due_date' => ['required', 'date', 'after_or_equal:date'],
            'amount' => ['required', 'numeric', 'min:1'],
            'description' => ['required', 'string', 'max:500'],
            'category_id' => [
                'nullable',
                'integer',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value) {
                        $exists = TransactionCategory::where('id', $value)
                            ->where('company_id', $companyId)
                            ->where('type', 'expense')
                            ->where('is_active', true)
                            ->exists();
                        if (!$exists) {
                            $fail('Kategori tidak valid.');
                        }
                    }
                },
            ],
            'reference' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'partner_id.required' => 'Supplier wajib dipilih.',
            'date.required' => 'Tanggal wajib diisi.',
            'date.before_or_equal' => 'Tanggal tidak boleh di masa depan.',
            'due_date.required' => 'Tanggal jatuh tempo wajib diisi.',
            'due_date.after_or_equal' => 'Tanggal jatuh tempo tidak boleh sebelum tanggal hutang.',
            'amount.required' => 'Jumlah wajib diisi.',
            'amount.min' => 'Jumlah minimal Rp 1.',
            'description.required' => 'Keterangan wajib diisi.',
            'description.max' => 'Keterangan maksimal 500 karakter.',
        ];
    }
}
