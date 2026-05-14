import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { TrendingDown } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

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

interface Supplier {
    id: number;
    name: string;
}

interface Props {
    cashBankAccounts: CashBankAccount[];
    categories: Category[];
    suppliers: Supplier[];
    defaultDate: string;
}

const SELECT_CLASS =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:border-destructive';

export default function Create({ cashBankAccounts, categories, suppliers, defaultDate }: Props) {
    const { props } = usePage<{ flash?: { error?: string } }>();
    const flashError = props.flash?.error;

    const { data, setData, post, processing, errors } = useForm({
        date: defaultDate,
        amount: '' as string | number,
        cash_bank_account_id: '',
        category_id: '',
        supplier_id: '',
        description: '',
        reference: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/transaksi/uang-keluar');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Catat Uang Keluar" />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Uang Keluar', href: '/transaksi/uang-keluar' },
                    { label: 'Catat' },
                ]} />

                {flashError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flashError}
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <TrendingDown className="text-red-500" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Catat Uang Keluar</h1>
                        <p className="text-sm text-gray-500">
                            Pengeluaran akan otomatis dijurnal setelah disimpan
                        </p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <Card>
                        <CardContent className="p-6 space-y-5">

                            {/* Tanggal & Jumlah */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    label="Tanggal Transaksi"
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

                            {/* Kas / Bank sumber */}
                            <FormField
                                label="Dibayar dari Kas / Bank"
                                required
                                error={errors.cash_bank_account_id}
                                hint="Pilih rekening atau kas yang digunakan untuk membayar"
                            >
                                <select
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
                                </select>
                            </FormField>

                            {/* Keterangan */}
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

                            {/* Akun & Supplier */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    label="Akun Pengeluaran"
                                    error={errors.category_id}
                                    hint="Opsional"
                                >
                                    <select
                                        className={SELECT_CLASS}
                                        value={data.category_id}
                                        onChange={(e) => setData('category_id', e.target.value)}
                                        aria-invalid={!!errors.category_id}
                                    >
                                        <option value="">-- Tanpa Akun --</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>

                                <FormField
                                    label="Kepada Supplier"
                                    error={errors.supplier_id}
                                    hint="Opsional"
                                >
                                    <select
                                        className={SELECT_CLASS}
                                        value={data.supplier_id}
                                        onChange={(e) => setData('supplier_id', e.target.value)}
                                        aria-invalid={!!errors.supplier_id}
                                    >
                                        <option value="">-- Tanpa Supplier --</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>

                            {/* Nomor Referensi */}
                            <FormField
                                label="Nomor Referensi"
                                error={errors.reference}
                                hint="Opsional – nomor nota, kwitansi, atau bukti pembayaran"
                            >
                                <Input
                                    placeholder="Contoh: NOTA-2024-001"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                    aria-invalid={!!errors.reference}
                                />
                            </FormField>

                            {/* Info jurnal otomatis */}
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                <p className="font-medium mb-1">Jurnal otomatis akan dibuat:</p>
                                <ul className="space-y-0.5 text-red-700">
                                    <li>• <span className="font-medium">Debit</span> – Akun beban (sesuai akun yang dipilih)</li>
                                    <li>• <span className="font-medium">Kredit</span> – Kas/Bank yang dipilih</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-5">
                        <Link href="/transaksi/uang-keluar">
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="gap-2 min-w-36 bg-red-600 hover:bg-red-700"
                        >
                            <TrendingDown size={16} />
                            {processing ? 'Menyimpan...' : 'Simpan & Posting'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
