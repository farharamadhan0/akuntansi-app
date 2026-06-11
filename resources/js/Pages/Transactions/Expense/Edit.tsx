import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Edit3 } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Select } from '@/components/ui/select';

interface CashBankAccount {
    id: number;
    name: string;
    type: string;
    type_label: string;
}

interface Category {
    id: number;
    name: string;
}

interface Partner {
    id: number;
    name: string;
}

interface Transaction {
    id: number;
    transaction_number: string;
    date: string;
    amount: number;
    description: string;
    reference?: string;
    cash_bank_account_id: number;
    category_id?: number;
    partner_id?: number;
}

interface Props {
    transaction: Transaction;
    cashBankAccounts: CashBankAccount[];
    categories: Category[];
    partners: Partner[];
}

const SELECT_CLASS =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:border-destructive';

export default function Edit({ transaction, cashBankAccounts, categories, partners }: Props) {
    const { props } = usePage<{ flash?: { error?: string } }>();
    const flashError = props.flash?.error;

    const { data, setData, post, processing, errors } = useForm({
        date: transaction.date,
        amount: transaction.amount as string | number,
        cash_bank_account_id: String(transaction.cash_bank_account_id),
        category_id: transaction.category_id ? String(transaction.category_id) : '',
        partner_id: transaction.partner_id ? String(transaction.partner_id) : '',
        description: transaction.description || '',
        reference: transaction.reference || '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(`/transaksi/uang-keluar/${transaction.id}/koreksi`);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Koreksi Uang Keluar" />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Uang Keluar', href: '/transaksi/uang-keluar' },
                    { label: 'Koreksi' },
                ]} />

                {flashError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flashError}
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Edit3 className="text-amber-600" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Koreksi Uang Keluar</h1>
                        <p className="text-sm text-gray-500">
                            Mengoreksi transaksi <span className="font-mono">{transaction.transaction_number}</span>
                        </p>
                    </div>
                </div>

                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-800">
                        <strong>Perhatian:</strong> Koreksi akan membuat jurnal pembalik untuk transaksi lama dan membuat transaksi baru dengan data yang diperbarui.
                    </p>
                </div>

                <form onSubmit={submit}>
                    <Card>
                        <CardContent className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    label="Tanggal Transaksi Baru"
                                    required
                                    error={errors.date}
                                >
                                    <Input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                        aria-invalid={!!errors.date}
                                    />
                                </FormField>

                                <FormField
                                    label="Jumlah Dikeluarkan (Rp)"
                                    required
                                    error={errors.amount}
                                >
                                    <Input
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="0"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                        aria-invalid={!!errors.amount}
                                    />
                                </FormField>
                            </div>

                            <FormField
                                label="Dibayar dari Kas / Bank"
                                required
                                error={errors.cash_bank_account_id}
                                hint="Pilih rekening atau kas yang digunakan untuk membayar"
                            >
                                <Select
                                    className={SELECT_CLASS}
                                    value={data.cash_bank_account_id}
                                    onChange={(e) => setData('cash_bank_account_id', e.target.value)}
                                    aria-invalid={!!errors.cash_bank_account_id}
                                >
                                    <option value="">-- Pilih Kas/Bank --</option>
                                    {cashBankAccounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name}
                                            {acc.type === 'bank' ? ' (Bank)' : ' (Kas)'}
                                        </option>
                                    ))}
                                </Select>
                            </FormField>

                            <FormField
                                label="Keterangan"
                                required
                                error={errors.description}
                                hint="Jelaskan keperluan pengeluaran ini"
                            >
                                <Textarea
                                    placeholder="Contoh: Pembelian alat tulis kantor bulan April"
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    aria-invalid={!!errors.description}
                                />
                            </FormField>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    label="Kategori Pengeluaran"
                                    error={errors.category_id}
                                    hint="Opsional"
                                >
                                    <Select
                                        className={SELECT_CLASS}
                                        value={data.category_id}
                                        onChange={(e) => setData('category_id', e.target.value)}
                                        aria-invalid={!!errors.category_id}
                                    >
                                        <option value="">-- Tanpa Kategori --</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </Select>
                                </FormField>

                                <FormField
                                    label="Kepada Supplier"
                                    error={errors.partner_id}
                                    hint="Opsional"
                                >
                                    <Select
                                        className={SELECT_CLASS}
                                        value={data.partner_id}
                                        onChange={(e) => setData('partner_id', e.target.value)}
                                        aria-invalid={!!errors.partner_id}
                                    >
                                        <option value="">-- Tanpa Supplier --</option>
                                        {partners.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                    </Select>
                                </FormField>
                            </div>

                            <FormField
                                label="Nomor Referensi"
                                error={errors.reference}
                                hint="Opsional - nomor nota, kwitansi, atau bukti pembayaran"
                            >
                                <Input
                                    placeholder="Contoh: NOTA-2024-001"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                    aria-invalid={!!errors.reference}
                                />
                            </FormField>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end gap-3 mt-5">
                        <Link href={`/transaksi/uang-keluar/${transaction.id}`}>
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="gap-2 min-w-36 bg-amber-600 hover:bg-amber-700"
                        >
                            <Edit3 size={16} />
                            {processing ? 'Menyimpan...' : 'Simpan Koreksi'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
