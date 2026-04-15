<?php

namespace App\Http\Requests;

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
        return [
            'account_id' => ['required', 'exists:accounts,id'],
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['income', 'expense'])],
            'description' => ['nullable', 'string', 'max:255'],
        ];
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
