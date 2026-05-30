<?php

namespace App\Http\Requests;

use App\Models\Account;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransactionCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;

        return [
            'account_id' => [
                'required',
                Rule::exists('accounts', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true),
            ],
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['income', 'expense'])],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $accountId = $this->input('account_id');

            if (! $accountId) {
                return;
            }

            $isParent = Account::whereKey($accountId)
                ->whereHas('children')
                ->exists();

            if ($isParent) {
                $v->errors()->add('account_id', 'Akun induk/group tidak dapat dipakai untuk kategori');
            }
        });
    }

    public function messages(): array
    {
        return [
            'account_id.required' => 'Pilih akun buku besar',
            'account_id.exists' => 'Akun buku besar tidak valid',
            'name.required' => 'Nama kategori wajib diisi',
            'name.max' => 'Nama kategori maksimal 100 karakter',
            'type.required' => 'Pilih jenis kategori',
            'type.in' => 'Jenis kategori harus Pemasukan atau Pengeluaran',
            'description.max' => 'Keterangan maksimal 255 karakter',
        ];
    }
}
