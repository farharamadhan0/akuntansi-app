import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface CashBankData {
    id: number;
    name: string;
    type: string;
    bank_name: string;
    account_number: string;
}

interface CashBankType {
    value: string;
    label: string;
}

interface FormProps {
    cashBank?: CashBankData;
    types: CashBankType[];
    canEditOpeningBalance: boolean;
    openingBalance: number;
    openingBalanceDate: string | null;
}

export default function Form({
    cashBank,
    types,
    canEditOpeningBalance,
    openingBalance,
    openingBalanceDate,
}: FormProps) {
    const isEdit = !!cashBank;

    const { data, setData, post, put, processing, errors } = useForm({
        name: cashBank?.name || '',
        type: cashBank?.type || 'cash',
        bank_name: cashBank?.bank_name || '',
        account_number: cashBank?.account_number || '',
        opening_balance: openingBalance ?? 0,
        opening_balance_date: openingBalanceDate || new Date().toISOString().split('T')[0],
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(`/master/kas-bank/${cashBank.id}`);
        } else {
            post('/master/kas-bank');
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? 'Edit Kas/Bank' : 'Tambah Kas/Bank'} />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Kas & Bank', href: '/master/kas-bank' },
                { label: isEdit ? 'Edit' : 'Tambah' },
            ]} />

            <div className="mb-6">
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
                                            onChange={(e) => setData('type', e.target.value)}
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

                        <div className="border-t pt-4">
                            <div className="mb-2">
                                <h3 className="text-sm font-semibold text-gray-800">Saldo Awal</h3>
                                <p className="text-xs text-muted-foreground">
                                    {canEditOpeningBalance
                                        ? 'Saldo awal akan otomatis tercatat sebagai jurnal: Debit Kas/Bank, Kredit Modal Pemilik. Kosongkan jika tidak ada saldo awal.'
                                        : 'Saldo awal terkunci karena akun ini sudah memiliki transaksi. Untuk koreksi, gunakan Jurnal Manual.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Saldo Awal (Rp)" error={errors.opening_balance}>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={data.opening_balance}
                                        onChange={(e) => setData('opening_balance', Number(e.target.value))}
                                        aria-invalid={!!errors.opening_balance}
                                        disabled={!canEditOpeningBalance}
                                    />
                                </FormField>

                                <FormField label="Tanggal Saldo Awal" error={errors.opening_balance_date}>
                                    <Input
                                        type="date"
                                        value={data.opening_balance_date}
                                        onChange={(e) => setData('opening_balance_date', e.target.value)}
                                        aria-invalid={!!errors.opening_balance_date}
                                        disabled={!canEditOpeningBalance}
                                    />
                                </FormField>
                            </div>
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
