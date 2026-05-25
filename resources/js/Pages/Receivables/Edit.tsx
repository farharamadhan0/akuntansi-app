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

interface Partner {
    id: number;
    name: string;
    code?: string;
}

interface Category {
    id: number;
    name: string;
}

interface Receivable {
    id: number;
    receivable_number: string;
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
    receivable: Receivable;
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

export default function Edit({ receivable, partners, categories }: Props) {
    const { flash } = usePage().props as { flash?: { error?: string } };
    const flashError = flash?.error;

    const { data, setData, post, processing, errors } = useForm({
        partner_id: String(receivable.partner_id),
        date: receivable.date,
        due_date: receivable.due_date,
        amount: receivable.amount as string | number,
        description: receivable.description || '',
        category_id: receivable.category_id ? String(receivable.category_id) : '',
        reference: receivable.reference || '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(`/transaksi/piutang/${receivable.id}/koreksi`);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Koreksi Piutang" />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Piutang', href: '/transaksi/piutang' },
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
                        <h1 className="text-xl font-bold text-gray-900">Koreksi Piutang</h1>
                        <p className="text-sm text-gray-500">
                            Mengoreksi piutang <span className="font-mono">{receivable.receivable_number}</span>
                        </p>
                    </div>
                </div>

                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-800">
                        <strong>Perhatian:</strong> Koreksi akan membuat jurnal pembalik untuk piutang lama dan membuat piutang baru dengan data yang diperbarui.
                        {receivable.paid_amount > 0 && (
                            <span className="block mt-1">
                                Pembayaran yang sudah ada ({formatCurrency(receivable.paid_amount)}) akan dipindahkan ke piutang baru.
                            </span>
                        )}
                    </p>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <FormField label="Pelanggan" error={errors.partner_id} required>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.partner_id}
                                    onChange={(e) => setData('partner_id', e.target.value)}
                                >
                                    <option value="">-- Pilih Pelanggan --</option>
                                    {partners.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.code ? `[${c.code}] ` : ''}{c.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Tanggal Piutang Baru" error={errors.date} required>
                                    <Input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                    />
                                </FormField>

                                <FormField label="Jatuh Tempo" error={errors.due_date} required hint="Batas waktu pelanggan harus membayar">
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
                                    placeholder="Contoh: Tagihan penjualan barang bulan April"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                />
                            </FormField>

                            <FormField label="Akun" error={errors.category_id} hint="Opsional">
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.category_id}
                                    onChange={(e) => setData('category_id', e.target.value)}
                                >
                                    <option value="">-- Tanpa Akun --</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Referensi" error={errors.reference} hint="Opsional – nomor invoice atau PO">
                                <Input
                                    placeholder="No. Invoice, PO, dll"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                />
                            </FormField>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <Link href={`/transaksi/piutang/${receivable.id}`}>
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
