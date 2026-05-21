<?php

namespace App\Http\Requests;

use App\Models\Partner;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IncomeTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;

        return [
            'date'                 => ['required', 'date', 'before_or_equal:today'],
            'amount'               => ['required', 'numeric', 'min:1'],
            'cash_bank_account_id' => [
                'required',
                Rule::exists('cash_bank_accounts', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true),
            ],
            'category_id' => [
                'nullable',
                Rule::exists('transaction_categories', 'id')
                    ->where('company_id', $companyId)
                    ->where('type', 'income'),
            ],
            'partner_id' => [
                'nullable',
                'integer',
                function ($attribute, $value, $fail) use ($companyId) {
                    $partner = Partner::where('id', $value)
                        ->where('company_id', $companyId)
                        ->first();
                    if (! $partner || ! $partner->hasType(Partner::TYPE_CUSTOMER)) {
                        $fail('Pelanggan tidak valid');
                    }
                },
            ],
            'description' => ['required', 'string', 'max:500'],
            'reference'   => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.required'                 => 'Tanggal transaksi wajib diisi',
            'date.date'                     => 'Format tanggal tidak valid',
            'date.before_or_equal'          => 'Tanggal tidak boleh melebihi hari ini',
            'amount.required'               => 'Jumlah uang masuk wajib diisi',
            'amount.numeric'                => 'Jumlah harus berupa angka',
            'amount.min'                    => 'Jumlah minimal Rp 1',
            'cash_bank_account_id.required' => 'Pilih kas/bank yang menerima uang',
            'cash_bank_account_id.exists'   => 'Kas/bank tidak valid atau tidak aktif',
            'category_id.exists'            => 'Kategori tidak valid',
            'description.required'          => 'Keterangan wajib diisi',
            'description.max'               => 'Keterangan maksimal 500 karakter',
            'reference.max'                 => 'No. referensi maksimal 100 karakter',
        ];
    }
}
