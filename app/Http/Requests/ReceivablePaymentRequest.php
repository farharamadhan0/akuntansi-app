<?php

namespace App\Http\Requests;

use App\Models\CashBankAccount;
use App\Models\Receivable;
use App\Enums\TransactionStatus;
use App\Enums\PaymentStatus;
use Illuminate\Foundation\Http\FormRequest;

class ReceivablePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = auth()->user()->current_company_id;

        return [
            'date' => ['required', 'date', 'before_or_equal:today'],
            'cash_bank_account_id' => [
                'required',
                'integer',
                function ($attribute, $value, $fail) use ($companyId) {
                    $exists = CashBankAccount::where('id', $value)
                        ->where('company_id', $companyId)
                        ->where('is_active', true)
                        ->exists();
                    if (!$exists) {
                        $fail('Akun kas/bank tidak valid.');
                    }
                },
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'reference' => ['nullable', 'string', 'max:100'],
            'allocations' => ['required', 'array', 'min:1'],
            'allocations.*.id' => [
                'required',
                'integer',
                function ($attribute, $value, $fail) use ($companyId) {
                    $receivable = Receivable::where('id', $value)
                        ->where('company_id', $companyId)
                        ->where('status', TransactionStatus::Posted)
                        ->where('payment_status', '!=', PaymentStatus::Paid)
                        ->first();
                    if (!$receivable) {
                        $fail('Piutang tidak valid atau sudah lunas.');
                    }
                },
            ],
            'allocations.*.amount' => [
                'required',
                'numeric',
                'min:1',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'date.required' => 'Tanggal wajib diisi.',
            'date.before_or_equal' => 'Tanggal tidak boleh di masa depan.',
            'cash_bank_account_id.required' => 'Akun kas/bank wajib dipilih.',
            'allocations.required' => 'Minimal satu piutang harus dialokasikan.',
            'allocations.min' => 'Minimal satu piutang harus dialokasikan.',
            'allocations.*.amount.required' => 'Jumlah alokasi wajib diisi.',
            'allocations.*.amount.min' => 'Jumlah alokasi minimal Rp 1.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $this->validateAllocationAmounts($validator);
        });
    }

    protected function validateAllocationAmounts($validator): void
    {
        $allocations = $this->input('allocations', []);
        $companyId = auth()->user()->current_company_id;

        foreach ($allocations as $index => $allocation) {
            if (empty($allocation['id']) || empty($allocation['amount'])) {
                continue;
            }

            $receivable = Receivable::where('id', $allocation['id'])
                ->where('company_id', $companyId)
                ->first();

            if (!$receivable) {
                continue;
            }

            $remaining = $receivable->amount - $receivable->paid_amount;
            if (bccomp($allocation['amount'], $remaining, 2) > 0) {
                $validator->errors()->add(
                    "allocations.{$index}.amount",
                    "Jumlah melebihi sisa tagihan ({$receivable->receivable_number})."
                );
            }
        }
    }
}
