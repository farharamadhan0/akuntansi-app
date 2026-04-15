import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ArrowLeft } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface LedgerAccount {
    id: number;
    code: string;
    name: string;
    subtype: string;
}

interface CashBankData {
    id: number;
    account_id: number;
    name: string;
    type: string;
    bank_name: string;
    account_number: string;
    opening_balance: number;
    opening_balance_date: string;
}

interface CashBankType {
    value: string;
    label: string;
}

interface FormProps {
    cashBank?: CashBankData;
    ledgerAccounts: LedgerAccount[];
    types: CashBankType[];
}

export default function Form({ cashBank, ledgerAccounts, types }: FormProps) {
    const isEdit = !!cashBank;

    const { data, setData, post, put, processing, errors } = useForm({
        account_id: cashBank?.account_id || '',
        name: cashBank?.name || '',
        type: cashBank?.type || 'cash',
        bank_name: cashBank?.bank_name || '',
        account_number: cashBank?.account_number || '',
        opening_balance: cashBank?.opening_balance || 0,
        opening_balance_date: cashBank?.opening_balance_date || new Date().toISOString().split('T')[0],
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(`/master/kas-bank/${cashBank.id}`);
        } else {
            post('/master/kas-bank');
        }
    };

    const filteredAccounts = ledgerAccounts.filter(acc => {
        if (data.type === 'cash') return acc.subtype === 'cash';
        if (data.type === 'bank') return acc.subtype === 'bank';
        return true;
    });

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? 'Edit Kas/Bank' : 'Tambah Kas/Bank'} />

            <div className="mb-6">
                <Link href="/master/kas-bank" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft size={18} className="mr-1" />
                    Kembali
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEdit ? 'Edit Akun Kas/Bank' : 'Tambah Akun Kas/Bank'}
                </h1>
            </div>

            <Card className="max-w-2xl">
                <CardContent className="p-6">
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                                Jenis Akun <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4">
                                {types.map((type) => (
                                    <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            value={type.value}
                                            checked={data.type === type.value}
                                            onChange={(e) => {
                                                setData('type', e.target.value);
                                                setData('account_id', '');
                                            }}
                                            className="w-4 h-4 text-primary-600"
                                        />
                                        <span>{type.label}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                        </div>

                        <FormField label="Nama Akun" required error={errors.name}>
                            <Input
                                placeholder={data.type === 'cash' ? 'Contoh: Kas Toko' : 'Contoh: BCA Utama'}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                aria-invalid={!!errors.name}
                            />
                        </FormField>

                        <FormField label="Akun Buku Besar" required error={errors.account_id}>
                            <select
                                value={data.account_id}
                                onChange={(e) => setData('account_id', e.target.value)}
                                className={`h-8 w-full min-w-0 rounded-none border bg-transparent px-2.5 py-1 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 ${errors.account_id ? 'border-destructive' : 'border-input'}`}
                            >
                                <option value="">Pilih akun...</option>
                                {filteredAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        {data.type === 'bank' && (
                            <>
                                <FormField label="Nama Bank" error={errors.bank_name}>
                                    <Input
                                        placeholder="Contoh: BCA, Mandiri, BRI"
                                        value={data.bank_name}
                                        onChange={(e) => setData('bank_name', e.target.value)}
                                        aria-invalid={!!errors.bank_name}
                                    />
                                </FormField>

                                <FormField label="Nomor Rekening" error={errors.account_number}>
                                    <Input
                                        placeholder="Contoh: 1234567890"
                                        value={data.account_number}
                                        onChange={(e) => setData('account_number', e.target.value)}
                                        aria-invalid={!!errors.account_number}
                                    />
                                </FormField>
                            </>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Saldo Awal" error={errors.opening_balance}>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={data.opening_balance}
                                    onChange={(e) => setData('opening_balance', Number(e.target.value))}
                                    aria-invalid={!!errors.opening_balance}
                                />
                            </FormField>

                            <FormField label="Tanggal Saldo Awal" error={errors.opening_balance_date}>
                                <Input
                                    type="date"
                                    value={data.opening_balance_date}
                                    onChange={(e) => setData('opening_balance_date', e.target.value)}
                                    aria-invalid={!!errors.opening_balance_date}
                                />
                            </FormField>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="submit" disabled={processing}>
                                {isEdit ? 'Simpan Perubahan' : 'Tambah Akun'}
                            </Button>
                            <Link href="/master/kas-bank">
                                <Button type="button" variant="outline">
                                    Batal
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
