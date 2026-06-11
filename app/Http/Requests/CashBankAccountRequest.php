<?php

namespace App\Http\Requests;

use App\Enums\CashBankType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CashBankAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::enum(CashBankType::class)],
            'bank_name' => ['nullable', 'string', 'max:100'],
            'account_number' => ['nullable', 'string', 'max:50'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'opening_balance_date' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama akun wajib diisi',
            'name.max' => 'Nama akun maksimal 100 karakter',
            'type.required' => 'Pilih jenis akun',
            'type.enum' => 'Jenis akun tidak valid',
            'bank_name.max' => 'Nama bank maksimal 100 karakter',
            'account_number.max' => 'Nomor rekening maksimal 50 karakter',
            'opening_balance.numeric' => 'Saldo awal harus berupa angka',
            'opening_balance.min' => 'Saldo awal tidak boleh negatif',
            'opening_balance_date.date' => 'Tanggal saldo awal tidak valid',
            'opening_balance_date.before_or_equal' => 'Tanggal saldo awal tidak boleh di masa depan',
        ];
    }
}
