import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

interface Product { id: number; product_code: string; sku?: string | null; name: string; unit: string; current_stock: number; average_cost: number; }
interface Flash { error?: string; }
interface Props { products: Product[]; }
interface ItemRow { product_id: string; adjustment_type: 'in' | 'out'; quantity: string; unit_cost: string; reason: string; }

export default function Create({ products }: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const [items, setItems] = useState<ItemRow[]>([{ product_id: '', adjustment_type: 'out', quantity: '1', unit_cost: '', reason: '' }]);
    const { data, setData, post, processing, errors } = useForm({
        date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [] as ItemRow[],
    });

    const syncItems = (nextItems: ItemRow[]) => {
        setItems(nextItems);
        setData('items', nextItems);
    };

    const updateItem = (index: number, key: keyof ItemRow, value: string) => {
        const next = [...items];
        next[index] = { ...next[index], [key]: value } as ItemRow;

        if (key === 'product_id') {
            const product = products.find((entry) => String(entry.id) === value);
            if (product && next[index].adjustment_type === 'in') {
                next[index].unit_cost = String(product.average_cost || 0);
            }
        }

        if (key === 'adjustment_type') {
            const product = products.find((entry) => String(entry.id) === next[index].product_id);

            if (value === 'in' && product) {
                next[index].unit_cost = String(product.average_cost || 0);
            }

            if (value === 'out') {
                next[index].unit_cost = '';
            }
        }

        syncItems(next);
    };

    const addItem = () => syncItems([...items, { product_id: '', adjustment_type: 'out', quantity: '1', unit_cost: '', reason: '' }]);
    const removeItem = (index: number) => syncItems(items.filter((_, idx) => idx !== index));

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/transaksi/stok-penyesuaian');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Buat Penyesuaian Stok" />
            <div className="mx-auto max-w-5xl">
                <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Penyesuaian Stok', href: '/transaksi/stok-penyesuaian' }, { label: 'Buat' }]} />

                {flash?.error && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{flash.error}</div>}

                <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Buat Penyesuaian Stok</h1></div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                            <FormField label="Tanggal" error={errors.date} required>
                                <Input type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} />
                            </FormField>
                            <FormField label="Catatan" error={errors.notes} className="md:col-span-2">
                                <Textarea rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                            </FormField>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="space-y-4 p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Item Penyesuaian</h2>
                                <Button type="button" variant="outline" onClick={addItem}>Tambah Baris</Button>
                            </div>
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-12">
                                        <div className="md:col-span-4">
                                            <FormField label="Produk" error={errors[`items.${index}.product_id` as keyof typeof errors] as string}>
                                                <Select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)}>
                                                    <option value="">-- Pilih Produk --</option>
                                                    {products.map((product) => <option key={product.id} value={product.id}>{product.product_code} - {product.name}</option>)}
                                                </Select>
                                            </FormField>
                                        </div>
                                        <div className="md:col-span-2">
                                            <FormField label="Jenis">
                                                <Select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={item.adjustment_type} onChange={(e) => updateItem(index, 'adjustment_type', e.target.value)}>
                                                    <option value="out">Kurang</option>
                                                    <option value="in">Tambah</option>
                                                </Select>
                                            </FormField>
                                        </div>
                                        <div className="md:col-span-2"><FormField label="Qty"><Input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} /></FormField></div>
                                        <div className="md:col-span-2"><FormField label="Unit Cost"><Input type="number" min="0" step="0.01" value={item.unit_cost} onChange={(e) => updateItem(index, 'unit_cost', e.target.value)} disabled={item.adjustment_type === 'out'} /></FormField></div>
                                        <div className="md:col-span-2"><FormField label="Alasan"><Input value={item.reason} onChange={(e) => updateItem(index, 'reason', e.target.value)} /></FormField></div>
                                        <div className="md:col-span-12 flex justify-end">{items.length > 1 && <button type="button" className="text-sm text-red-600" onClick={() => removeItem(index)}>Hapus</button>}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>Simpan Penyesuaian</Button>
                        <Link href="/transaksi/stok-penyesuaian"><Button type="button" variant="outline">Batal</Button></Link>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
