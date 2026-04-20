import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Wallet } from 'lucide-react';

interface Supplier {
    id: number;
    name: string;
    code?: string;
}

interface Category {
    id: number;
    name: string;
}

interface Props {
    suppliers: Supplier[];
    categories: Category[];
}

export default function Create({ suppliers, categories }: Props) {
    const { flash } = usePage().props as { flash?: { error?: string } };

    const { data, setData, post, processing, errors } = useForm({
        supplier_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: '',
        amount: '',
        description: '',
        category_id: '',
        reference: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/transaksi/hutang');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Catat Hutang" />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Hutang', href: '/transaksi/hutang' },
                    { label: 'Catat Hutang' },
                ]} />

                {flash?.error && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flash.error}
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <Wallet className="text-orange-600" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Catat Hutang</h1>
                        <p className="text-sm text-gray-500">
                            Catat tagihan yang harus dibayar ke pemasok
                        </p>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <FormField label="Pemasok" error={errors.supplier_id} required>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.supplier_id}
                                    onChange={(e) => setData('supplier_id', e.target.value)}
                                >
                                    <option value="">-- Pilih Pemasok --</option>
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.code ? `[${s.code}] ` : ''}{s.name}
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

                                <FormField label="Jatuh Tempo" error={errors.due_date} required hint="Batas waktu pembayaran ke pemasok">
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

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Kategori Pengeluaran" error={errors.category_id} hint="Opsional">
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={data.category_id}
                                        onChange={(e) => setData('category_id', e.target.value)}
                                    >
                                        <option value="">-- Tanpa Kategori --</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
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
                            </div>

                            {/* Journal Info */}
                            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm">
                                <p className="font-medium text-orange-800">Jurnal Otomatis</p>
                                <ul className="text-orange-700 space-y-0.5 mt-1">
                                    <li>• <span className="font-medium">Debit</span> – Beban / Akun Pengeluaran</li>
                                    <li>• <span className="font-medium">Kredit</span> – Hutang Usaha</li>
                                </ul>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={processing}>
                                    Simpan Hutang
                                </Button>
                                <Link href="/transaksi/hutang">
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
