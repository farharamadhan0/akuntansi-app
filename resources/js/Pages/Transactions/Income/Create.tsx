import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { TrendingUp } from 'lucide-react';
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

interface Partner {
    id: number;
    name: string;
}

interface Props {
    cashBankAccounts: CashBankAccount[];
    categories: Category[];
    partners: Partner[];
    defaultDate: string;
}

function formatCurrency(value: string) {
    const num = parseFloat(value.replace(/\D/g, ''));
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('id-ID').format(num);
}

export default function Create({ cashBankAccounts, categories, partners, defaultDate }: Props) {
    const { props } = usePage<{ flash?: { error?: string } }>();
    const flashError = props.flash?.error;

    const { data, setData, post, processing, errors } = useForm({
        date: defaultDate,
        amount: '' as string | number,
        cash_bank_account_id: '',
        category_id: '',
        partner_id: '',
        description: '',
        reference: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/transaksi/uang-masuk');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Catat Uang Masuk" />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Uang Masuk', href: '/transaksi/uang-masuk' },
                    { label: 'Catat' },
                ]} />

                {flashError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flashError}
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="text-green-600" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Catat Uang Masuk</h1>
                        <p className="text-sm text-gray-500">
                            Uang akan otomatis dijurnal setelah disimpan
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
                                    label="Jumlah Diterima (Rp)"
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

                            {/* Kas / Bank penerima */}
                            <FormField
                                label="Diterima di Kas / Bank"
                                required
                                error={errors.cash_bank_account_id}
                                hint="Pilih rekening atau kas yang menerima uang ini"
                            >
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:border-destructive"
                                    value={data.cash_bank_account_id}
                                    onChange={(e) => setData('cash_bank_account_id', e.target.value)}
                                    aria-invalid={!!errors.cash_bank_account_id}
                                >
                                    <option value="">-- Pilih Kas/Bank --</option>
                                    {cashBankAccounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name}
                                            {acc.type === 'bank' ? ` (Bank)` : ` (Kas)`}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            {/* Keterangan */}
                            <FormField
                                label="Keterangan"
                                required
                                error={errors.description}
                                hint="Jelaskan dari mana uang ini berasal"
                            >
                                <Textarea
                                    placeholder="Contoh: Pembayaran jasa konsultasi bulan April"
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    aria-invalid={!!errors.description}
                                />
                            </FormField>

                            {/* Kategori & Pelanggan */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    label="Kategori Pemasukan"
                                    error={errors.category_id}
                                    hint="Opsional"
                                >
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                    </select>
                                </FormField>

                                <FormField
                                    label="Dari Pelanggan"
                                    error={errors.partner_id}
                                    hint="Opsional"
                                >
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:border-destructive"
                                        value={data.partner_id}
                                        onChange={(e) => setData('partner_id', e.target.value)}
                                        aria-invalid={!!errors.partner_id}
                                    >
                                        <option value="">-- Tanpa Pelanggan --</option>
                                        {partners.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>

                            {/* No. Referensi */}
                            <FormField
                                label="Nomor Referensi"
                                error={errors.reference}
                                hint="Opsional – nomor kwitansi, invoice, atau bukti lainnya"
                            >
                                <Input
                                    placeholder="Contoh: INV-2024-001"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                    aria-invalid={!!errors.reference}
                                />
                            </FormField>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-5">
                        <Link href="/transaksi/uang-masuk">
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing} className="gap-2 min-w-36">
                            <TrendingUp size={16} />
                            {processing ? 'Menyimpan...' : 'Simpan & Posting'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
