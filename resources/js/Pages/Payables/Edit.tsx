import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Edit3 } from 'lucide-react';

interface Partner {
    id: number;
    name: string;
    code?: string;
}

interface Category {
    id: number;
    name: string;
}

interface Payable {
    id: number;
    payable_number: string;
    partner_id: number;
    date: string;
    due_date: string;
    amount: number;
    paid_amount: number;
    description: string;
    category_id?: number;
    reference?: string;
}

interface Props {
    payable: Payable;
    partners: Partner[];
    categories: Category[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function Edit({ payable, partners, categories }: Props) {
    const { flash } = usePage().props as { flash?: { error?: string } };

    const { data, setData, post, processing, errors } = useForm({
        partner_id: String(payable.partner_id),
        date: payable.date,
        due_date: payable.due_date,
        amount: payable.amount as string | number,
        description: payable.description || '',
        category_id: payable.category_id ? String(payable.category_id) : '',
        reference: payable.reference || '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(`/transaksi/hutang/${payable.id}/koreksi`);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Koreksi Hutang" />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Hutang', href: '/transaksi/hutang' },
                    { label: 'Koreksi' },
                ]} />

                {flash?.error && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flash.error}
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Edit3 className="text-amber-600" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Koreksi Hutang</h1>
                        <p className="text-sm text-gray-500">
                            Mengoreksi hutang <span className="font-mono">{payable.payable_number}</span>
                        </p>
                    </div>
                </div>

                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-800">
                        <strong>Perhatian:</strong> Koreksi akan membuat jurnal pembalik untuk hutang lama dan membuat hutang baru dengan data yang diperbarui.
                        {payable.paid_amount > 0 && (
                            <span className="block mt-1">
                                Pembayaran yang sudah ada ({formatCurrency(payable.paid_amount)}) akan dipindahkan ke hutang baru.
                            </span>
                        )}
                    </p>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <FormField label="Supplier" error={errors.partner_id} required>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.partner_id}
                                    onChange={(e) => setData('partner_id', e.target.value)}
                                >
                                    <option value="">-- Pilih Supplier --</option>
                                    {partners.map((partner) => (
                                        <option key={partner.id} value={partner.id}>
                                            {partner.code ? `[${partner.code}] ` : ''}{partner.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Tanggal Hutang Baru" error={errors.date} required>
                                    <Input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                    />
                                </FormField>

                                <FormField label="Jatuh Tempo" error={errors.due_date} required hint="Batas waktu pembayaran ke supplier">
                                    <Input
                                        type="date"
                                        value={data.due_date}
                                        onChange={(e) => setData('due_date', e.target.value)}
                                        min={data.date}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Jumlah (Rp)" error={errors.amount} required>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="0"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                />
                            </FormField>

                            <FormField label="Keterangan" error={errors.description} required>
                                <Textarea
                                    placeholder="Contoh: Pembelian bahan baku bulan April"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                />
                            </FormField>

                            <FormField label="Akun Pengeluaran" error={errors.category_id} hint="Opsional">
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.category_id}
                                    onChange={(e) => setData('category_id', e.target.value)}
                                >
                                    <option value="">-- Tanpa Akun --</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Referensi / No. Invoice" error={errors.reference} hint="Opsional">
                                <Input
                                    placeholder="No. PO, Invoice, dll"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                />
                            </FormField>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <Link href={`/transaksi/hutang/${payable.id}`}>
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
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
