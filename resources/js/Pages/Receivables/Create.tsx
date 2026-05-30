import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Users } from 'lucide-react';
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

interface Props {
    partners: Partner[];
    categories: Category[];
}

export default function Create({ partners, categories }: Props) {
    const { flash } = usePage().props as { flash?: { error?: string } };
    const flashError = flash?.error;

    const { data, setData, post, processing, errors } = useForm({
        partner_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: '',
        amount: '',
        description: '',
        category_id: '',
        reference: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/transaksi/piutang');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Buat Piutang" />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Piutang', href: '/transaksi/piutang' },
                    { label: 'Buat' },
                ]} />

                {flashError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flashError}
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="text-blue-500" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Buat Piutang</h1>
                        <p className="text-sm text-gray-500">
                            Catat tagihan kepada pelanggan
                        </p>
                    </div>
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
                                <FormField label="Tanggal" error={errors.date} required>
                                    <Input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
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

                            <FormField label="Kategori Pemasukan" error={errors.category_id} hint="Opsional">
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.category_id}
                                    onChange={(e) => setData('category_id', e.target.value)}
                                >
                                    <option value="">-- Tanpa Kategori --</option>
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

                            {/* Journal Info */}
                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
                                <p className="font-medium text-blue-800 mb-1">Jurnal Otomatis</p>
                                <ul className="text-blue-700 space-y-0.5 mt-1">
                                    <li>• <span className="font-medium">Debit</span> – Piutang Usaha</li>
                                    <li>• <span className="font-medium">Kredit</span> – Pendapatan</li>
                                </ul>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="submit" disabled={processing}>
                                    Simpan Piutang
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
