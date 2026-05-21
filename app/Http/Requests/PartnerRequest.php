<?php

namespace App\Http\Requests;

use App\Models\Partner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PartnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = auth()->user()->current_company_id;
        $partnerId = $this->route('partner')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('partners')->where('company_id', $companyId)->ignore($partnerId),
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
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama mitra wajib diisi.',
            'name.max' => 'Nama mitra maksimal 255 karakter.',
            'code.unique' => 'Kode mitra sudah digunakan.',
            'code.max' => 'Kode mitra maksimal 20 karakter.',
            'email.email' => 'Format email tidak valid.',
            'credit_limit.min' => 'Limit kredit tidak boleh negatif.',
            'types.required' => 'Tipe mitra wajib dipilih (minimal satu).',
            'types.min' => 'Tipe mitra wajib dipilih (minimal satu).',
            'types.*.in' => 'Tipe mitra tidak valid.',
        ];
    }
}
