<?php

namespace App\Http\Requests;

use App\Models\Account;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JournalEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->user()->current_company_id;

        return [
            'date'                 => ['required', 'date'],
            'description'          => ['required', 'string', 'max:500'],
            'is_adjusting'         => ['nullable', 'boolean'],

            'lines'                => ['required', 'array', 'min:2'],
            'lines.*.account_id'   => [
                'required',
                Rule::exists('accounts', 'id')
                    ->where('company_id', $companyId)
                    ->where('is_active', true),
            ],
            'lines.*.description'  => ['nullable', 'string', 'max:255'],
            'lines.*.debit'        => ['required', 'numeric', 'min:0'],
            'lines.*.credit'       => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.required'                => 'Tanggal jurnal wajib diisi',
            'date.date'                    => 'Format tanggal tidak valid',
            'description.required'         => 'Keterangan wajib diisi',
            'description.max'              => 'Keterangan maksimal 500 karakter',
            'lines.required'               => 'Jurnal harus memiliki baris',
            'lines.min'                    => 'Jurnal harus memiliki minimal 2 baris',
            'lines.*.account_id.required'  => 'Akun wajib dipilih di setiap baris',
            'lines.*.account_id.exists'    => 'Akun tidak valid atau tidak aktif',
            'lines.*.debit.required'       => 'Debit wajib diisi (boleh 0)',
            'lines.*.debit.numeric'        => 'Debit harus berupa angka',
            'lines.*.debit.min'            => 'Debit tidak boleh negatif',
            'lines.*.credit.required'      => 'Kredit wajib diisi (boleh 0)',
            'lines.*.credit.numeric'       => 'Kredit harus berupa angka',
            'lines.*.credit.min'           => 'Kredit tidak boleh negatif',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $lines = $this->input('lines', []);

            if (! is_array($lines) || count($lines) < 2) {
                return;
            }

            $accountIds = collect($lines)
                ->pluck('account_id')
                ->filter()
                ->unique()
                ->values();
            $parentAccountIds = Account::whereIn('id', $accountIds)
                ->whereHas('children')
                ->pluck('id')
                ->all();

            $totalDebit = 0.0;
            $totalCredit = 0.0;

            foreach ($lines as $i => $line) {
                if (in_array((int) ($line['account_id'] ?? 0), $parentAccountIds, true)) {
                    $v->errors()->add("lines.$i.account_id", 'Akun induk/group tidak dapat dipakai untuk jurnal');
                }

                $debit = (float) ($line['debit'] ?? 0);
                $credit = (float) ($line['credit'] ?? 0);

                if ($debit > 0 && $credit > 0) {
                    $v->errors()->add("lines.$i.debit", 'Baris tidak boleh memiliki debit dan kredit bersamaan');
                }

                if ($debit == 0 && $credit == 0) {
                    $v->errors()->add("lines.$i.debit", 'Baris harus memiliki nilai debit atau kredit');
                }

                $totalDebit += $debit;
                $totalCredit += $credit;
            }

            if (bccomp((string) $totalDebit, (string) $totalCredit, 2) !== 0) {
                $v->errors()->add('lines', "Total debit ({$totalDebit}) harus sama dengan total kredit ({$totalCredit})");
            }

            if ($totalDebit == 0) {
                $v->errors()->add('lines', 'Total jurnal tidak boleh nol');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $lines = $this->input('lines', []);

        if (is_array($lines)) {
            $normalized = array_map(function ($line) {
                return array_merge($line, [
                    'debit'  => isset($line['debit']) && $line['debit'] !== '' ? $line['debit'] : 0,
                    'credit' => isset($line['credit']) && $line['credit'] !== '' ? $line['credit'] : 0,
                ]);
            }, $lines);

            $this->merge(['lines' => $normalized]);
        }
    }
}
