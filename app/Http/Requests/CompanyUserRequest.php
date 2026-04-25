<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class CompanyUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isOwnerOf() ?? false;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;
        $isUpdate = $this->isMethod('put') || $this->isMethod('patch');

        $rules = [
            'role_id' => [
                'required',
                Rule::exists('roles', 'id')->where('company_id', $companyId),
            ],
            'is_active' => ['sometimes', 'boolean'],
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
        ];

        if (!$isUpdate) {
            $rules['email'] = ['required', 'email', 'max:255'];
            // Password hanya wajib jika user dengan email tersebut belum ada
            $emailExists = User::where('email', $this->input('email'))->exists();
            $rules['password'] = $emailExists
                ? ['nullable']
                : ['required', 'confirmed', Password::defaults()];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'password.required' => 'Password wajib diisi.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'role_id.required' => 'Role wajib dipilih.',
            'role_id.exists' => 'Role tidak valid.',
        ];
    }
}
