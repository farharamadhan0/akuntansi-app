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

interface Customer {
    id: number;
    name: string;
    code?: string;
}

interface Category {
    id: number;
    name: string;
}

interface Props {
    customers: Customer[];
    categories: Category[];
}

export default function Create({ customers, categories }: Props) {
    const { flash } = usePage().props as { flash?: { error?: string } };
    const flashError = flash?.error;

    const { data, setData, post, processing, errors } = useForm({
        customer_id: '',
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
                            <FormField label="Pelanggan" error={errors.customer_id} required>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.customer_id}
                                    onChange={(e) => setData('customer_id', e.target.value)}
                                >
                                    <option value="">Pilih pelanggan...</option>
                                    {customers.map((c) => (
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

                                <FormField label="Jatuh Tempo" error={errors.due_date} required>
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
                                    placeholder="Deskripsi tagihan..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                />
                            </FormField>

                            <FormField label="Kategori" error={errors.category_id}>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.category_id}
                                    onChange={(e) => setData('category_id', e.target.value)}
                                >
                                    <option value="">Tanpa kategori</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Referensi" error={errors.reference}>
                                <Input
                                    placeholder="No. Invoice, PO, dll (opsional)"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                />
                            </FormField>

                            {/* Journal Info */}
                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
                                <p className="font-medium text-blue-800 mb-1">Jurnal Otomatis</p>
                                <p className="text-blue-700">
                                    Sistem akan mencatat jurnal: Debit Piutang Usaha, Kredit Pendapatan.
                                </p>
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
