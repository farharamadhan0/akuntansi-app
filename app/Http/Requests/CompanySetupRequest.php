<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompanySetupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'enabled_menus' => ['nullable', 'array'],
            'enabled_menus.*' => ['string'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama usaha wajib diisi.',
            'name.max' => 'Nama usaha maksimal 255 karakter.',
            'email.email' => 'Format email tidak valid.',
        ];
    }
}
