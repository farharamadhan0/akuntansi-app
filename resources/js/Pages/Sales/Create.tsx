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

interface Customer { id: number; name: string; code?: string; }
interface CashBankAccount { id: number; name: string; }
interface Product { id: number; product_code: string; name: string; unit: string; sales_price: number; }
interface Flash { error?: string; }
interface Props { customers: Customer[]; cashBankAccounts: CashBankAccount[]; products: Product[]; }
interface ItemRow { product_id: string; description: string; quantity: string; unit: string; unit_price: string; discount_amount: string; tax_amount: string; }

export default function Create({ customers, cashBankAccounts, products }: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const [items, setItems] = useState<ItemRow[]>([{ product_id: '', description: '', quantity: '1', unit: '', unit_price: '0', discount_amount: '0', tax_amount: '0' }]);
    const { data, setData, post, processing, errors } = useForm({
        customer_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: '',
        payment_type: 'cash',
        cash_bank_account_id: '',
        notes: '',
        reference: '',
        items: [] as ItemRow[],
    });

    const syncItems = (nextItems: ItemRow[]) => {
        setItems(nextItems);
        setData('items', nextItems);
    };

    const updateItem = (index: number, key: keyof ItemRow, value: string) => {
        const next = [...items];
        next[index] = { ...next[index], [key]: value };

        if (key === 'product_id') {
            const product = products.find((entry) => String(entry.id) === value);
            if (product) {
                next[index].unit = product.unit;
                next[index].description = product.name;
                next[index].unit_price = String(product.sales_price ?? 0);
            }
        }

        syncItems(next);
    };

    const addItem = () => syncItems([...items, { product_id: '', description: '', quantity: '1', unit: '', unit_price: '0', discount_amount: '0', tax_amount: '0' }]);
    const removeItem = (index: number) => syncItems(items.filter((_, idx) => idx !== index));

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/transaksi/penjualan');
    };

    const total = items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unit_price || 0) - Number(item.discount_amount || 0) + Number(item.tax_amount || 0)), 0);

    return (
        <AuthenticatedLayout>
            <Head title="Buat Penjualan" />
            <div className="mx-auto max-w-5xl">
                <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Penjualan', href: '/transaksi/penjualan' }, { label: 'Buat' }]} />

                {flash?.error && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{flash.error}</div>}

                <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Buat Penjualan</h1></div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                            <FormField label="Jenis Pembayaran" error={errors.payment_type} required>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.payment_type} onChange={(e) => setData('payment_type', e.target.value)}>
                                    <option value="cash">Tunai</option>
                                    <option value="credit">Kredit</option>
                                </select>
                            </FormField>
                            <FormField label="Tanggal" error={errors.date} required>
                                <Input type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} />
                            </FormField>
                            <FormField label="Pelanggan" error={errors.customer_id}>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.customer_id} onChange={(e) => setData('customer_id', e.target.value)}>
                                    <option value="">-- Pilih Pelanggan --</option>
                                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.code ? `[${customer.code}] ` : ''}{customer.name}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Kas/Bank" error={errors.cash_bank_account_id}>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.cash_bank_account_id} onChange={(e) => setData('cash_bank_account_id', e.target.value)}>
                                    <option value="">-- Pilih Kas/Bank --</option>
                                    {cashBankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Jatuh Tempo" error={errors.due_date}>
                                <Input type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} />
                            </FormField>
                            <FormField label="Referensi" error={errors.reference}>
                                <Input value={data.reference} onChange={(e) => setData('reference', e.target.value)} />
                            </FormField>
                            <FormField label="Catatan" error={errors.notes} className="md:col-span-2">
                                <Textarea rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                            </FormField>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="space-y-4 p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Item Penjualan</h2>
                                <Button type="button" variant="outline" onClick={addItem}>Tambah Baris</Button>
                            </div>
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-12">
                                        <div className="md:col-span-3">
                                            <FormField label="Produk" error={errors[`items.${index}.product_id` as keyof typeof errors] as string}>
                                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)}>
                                                    <option value="">-- Pilih Produk --</option>
                                                    {products.map((product) => <option key={product.id} value={product.id}>{product.product_code} - {product.name}</option>)}
                                                </select>
                                            </FormField>
                                        </div>
                                        <div className="md:col-span-3"><FormField label="Deskripsi"><Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} /></FormField></div>
                                        <div className="md:col-span-1"><FormField label="Qty"><Input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} /></FormField></div>
                                        <div className="md:col-span-1"><FormField label="Unit"><Input value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} /></FormField></div>
                                        <div className="md:col-span-2"><FormField label="Harga"><Input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} /></FormField></div>
                                        <div className="md:col-span-1"><FormField label="Diskon"><Input type="number" min="0" step="0.01" value={item.discount_amount} onChange={(e) => updateItem(index, 'discount_amount', e.target.value)} /></FormField></div>
                                        <div className="md:col-span-1"><FormField label="Pajak"><Input type="number" min="0" step="0.01" value={item.tax_amount} onChange={(e) => updateItem(index, 'tax_amount', e.target.value)} /></FormField></div>
                                        <div className="md:col-span-12 flex justify-between text-sm text-muted-foreground">
                                            <span>Total baris: {(Number(item.quantity || 0) * Number(item.unit_price || 0) - Number(item.discount_amount || 0) + Number(item.tax_amount || 0)).toLocaleString('id-ID')}</span>
                                            {items.length > 1 && <button type="button" className="text-red-600" onClick={() => removeItem(index)}>Hapus</button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                        <div className="text-sm text-muted-foreground">Total dokumen</div>
                        <div className="text-lg font-semibold">Rp {total.toLocaleString('id-ID')}</div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>Simpan Penjualan</Button>
                        <Link href="/transaksi/penjualan"><Button type="button" variant="outline">Batal</Button></Link>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
