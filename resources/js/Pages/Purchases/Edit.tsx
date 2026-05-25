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
import { Edit3 } from 'lucide-react';

interface Partner {
    id: number;
    name: string;
    code?: string;
}

interface CashBankAccount {
    id: number;
    name: string;
}

interface Product {
    id: number;
    product_code: string;
    name: string;
    unit: string;
    purchase_price: number;
    is_stock_tracked: boolean;
    current_stock?: string | number;
}

interface PurchaseItem {
    id: number;
    product_id: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_amount: number;
    tax_amount: number;
}

interface RelatedPayment {
    id: number;
    payment_number: string;
    date?: string | null;
    status: string;
}

interface RelatedPayable {
    id: number;
    payable_number: string;
    paid_amount: number;
    payments: RelatedPayment[];
}

interface Purchase {
    id: number;
    purchase_number: string;
    date: string;
    due_date?: string | null;
    payment_type: string;
    partner_id?: number | null;
    cash_bank_account_id?: number | null;
    notes?: string | null;
    reference?: string | null;
    payable?: RelatedPayable | null;
    items: PurchaseItem[];
}

interface Flash {
    error?: string;
}

interface Props {
    purchase: Purchase;
    partners: Partner[];
    cashBankAccounts: CashBankAccount[];
    products: Product[];
}

interface ItemRow {
    product_id: string;
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
    discount_amount: string;
    tax_amount: string;
}

export default function Edit({ purchase, partners, cashBankAccounts, products }: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const initialItems: ItemRow[] = purchase.items.map((item) => ({
        product_id: String(item.product_id),
        description: item.description || '',
        quantity: String(item.quantity),
        unit: item.unit || '',
        unit_price: String(item.unit_price),
        discount_amount: String(item.discount_amount ?? 0),
        tax_amount: String(item.tax_amount ?? 0),
    }));

    const [items, setItems] = useState<ItemRow[]>(initialItems.length > 0 ? initialItems : [{ product_id: '', description: '', quantity: '1', unit: '', unit_price: '0', discount_amount: '0', tax_amount: '0' }]);
    const { data, setData, post, processing, errors } = useForm({
        partner_id: purchase.partner_id ? String(purchase.partner_id) : '',
        date: purchase.date,
        due_date: purchase.due_date || '',
        payment_type: purchase.payment_type,
        cash_bank_account_id: purchase.cash_bank_account_id ? String(purchase.cash_bank_account_id) : '',
        notes: purchase.notes || '',
        reference: purchase.reference || '',
        items: initialItems.length > 0 ? initialItems : [{ product_id: '', description: '', quantity: '1', unit: '', unit_price: '0', discount_amount: '0', tax_amount: '0' }],
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
                next[index].unit_price = String(product.purchase_price ?? 0);
            }
        }

        syncItems(next);
    };

    const addItem = () => syncItems([...items, { product_id: '', description: '', quantity: '1', unit: '', unit_price: '0', discount_amount: '0', tax_amount: '0' }]);
    const removeItem = (index: number) => syncItems(items.filter((_, idx) => idx !== index));

    const handlePaymentTypeChange = (value: string) => {
        setData('payment_type', value);
        if (value === 'cash') {
            setData('due_date', '');
        }
    };

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(`/transaksi/pembelian/${purchase.id}/koreksi`);
    };

    const total = items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unit_price || 0) - Number(item.discount_amount || 0) + Number(item.tax_amount || 0)), 0);

    return (
        <AuthenticatedLayout>
            <Head title="Koreksi Pembelian" />
            <div className="mx-auto max-w-5xl">
                <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Pembelian', href: '/transaksi/pembelian' }, { label: 'Koreksi' }]} />

                {flash?.error && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{flash.error}</div>}

                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-lg bg-amber-100 p-2">
                        <Edit3 className="text-amber-600" size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Koreksi Pembelian</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Mengoreksi pembelian <span className="font-mono">{purchase.purchase_number}</span></p>
                    </div>
                </div>

                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p>
                        <strong>Perhatian:</strong> Koreksi akan membuat jurnal pembalik untuk pembelian lama dan membuat pembelian baru dengan data yang diperbarui.
                    </p>
                    <p className="mt-1">
                        Untuk pembelian kredit yang sudah ada pembayaran, pembayaran harus dibatalkan terlebih dahulu. Koreksi juga akan ditolak jika stok tidak cukup untuk reverse selisih item.
                    </p>
                </div>

                {purchase.payable && purchase.payable.payments.length > 0 && (
                    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        <p>
                            <strong>Pembelian ini sudah memiliki pembayaran terkait</strong> sebesar Rp {purchase.payable.paid_amount.toLocaleString('id-ID')} pada hutang{' '}
                            <Link href={`/transaksi/hutang/${purchase.payable.id}`} className="font-mono underline hover:text-blue-900">
                                {purchase.payable.payable_number}
                            </Link>
                            . Batalkan pembayaran berikut terlebih dahulu sebelum melakukan koreksi:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {purchase.payable.payments.map((payment) => (
                                <Link
                                    key={payment.id}
                                    href={`/transaksi/hutang-bayar/${payment.id}`}
                                    className="inline-flex items-center rounded-md border border-blue-300 bg-white px-3 py-1.5 font-mono text-xs text-blue-700 hover:bg-blue-100"
                                >
                                    {payment.payment_number}
                                    {payment.date ? ` • ${payment.date}` : ''}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                            <FormField label="Jenis Pembayaran" error={errors.payment_type} required>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.payment_type} onChange={(e) => handlePaymentTypeChange(e.target.value)}>
                                    <option value="cash">Tunai</option>
                                    <option value="credit">Kredit</option>
                                </select>
                            </FormField>
                            <FormField label="Tanggal Pembelian Baru" error={errors.date} required>
                                <Input type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} />
                            </FormField>
                            <FormField label="Supplier" error={errors.partner_id}>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.partner_id} onChange={(e) => setData('partner_id', e.target.value)}>
                                    <option value="">-- Pilih Supplier --</option>
                                    {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.code ? `[${partner.code}] ` : ''}{partner.name}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Kas/Bank" error={errors.cash_bank_account_id}>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.cash_bank_account_id} onChange={(e) => setData('cash_bank_account_id', e.target.value)}>
                                    <option value="">-- Pilih Kas/Bank --</option>
                                    {cashBankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Jatuh Tempo" error={errors.due_date}>
                                <Input disabled={data.payment_type === 'cash'} type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} />
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
                                <h2 className="text-lg font-semibold">Item Pembelian</h2>
                                <Button type="button" variant="outline" onClick={addItem}>Tambah Baris</Button>
                            </div>
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-12">
                                        <div className="md:col-span-3">
                                            <FormField label="Produk" error={errors[`items.${index}.product_id` as keyof typeof errors] as string}>
                                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)}>
                                                    <option value="">-- Pilih Produk --</option>
                                                    {products.map((product) => (
                                                        <option key={product.id} value={product.id}>
                                                            {product.product_code} - {product.name}
                                                            {product.is_stock_tracked ? ` (Stok: ${Number(product.current_stock).toFixed(2)} ${product.unit})` : ''}
                                                        </option>
                                                    ))}
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
                        <div className="text-sm text-muted-foreground">Total dokumen baru</div>
                        <div className="text-lg font-semibold">Rp {total.toLocaleString('id-ID')}</div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing} className="gap-2 bg-amber-600 hover:bg-amber-700">
                            <Edit3 size={16} />
                            {processing ? 'Menyimpan...' : 'Simpan Koreksi'}
                        </Button>
                        <Link href={`/transaksi/pembelian/${purchase.id}`}><Button type="button" variant="outline">Batal</Button></Link>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
