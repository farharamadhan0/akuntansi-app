<?php

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isOwnerOf() ?? false;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;
        $roleId = $this->route('role')?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')
                    ->where('company_id', $companyId)
                    ->ignore($roleId),
            ],
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*' => ['string', Rule::in(Permissions::all())],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama role wajib diisi.',
            'name.unique' => 'Nama role sudah digunakan.',
            'permissions.required' => 'Minimal satu permission harus dipilih.',
            'permissions.min' => 'Minimal satu permission harus dipilih.',
            'permissions.*.in' => 'Permission tidak valid.',
        ];
    }
}
