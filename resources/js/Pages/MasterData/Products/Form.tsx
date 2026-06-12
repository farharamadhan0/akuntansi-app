import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

interface Account { id: number; code: string; name: string; type: string; subtype?: string | null; }
interface ProductTypeOption { value: 'goods' | 'service'; label: string; }
interface ProductData {
    id: number;
    product_code?: string;
    sku?: string | null;
    name: string;
    product_type: 'goods' | 'service';
    unit: string;
    description?: string | null;
    is_stock_tracked: boolean;
    sales_price: number;
    purchase_price: number;
    inventory_account_id?: number | null;
    revenue_account_id?: number | null;
    cogs_account_id?: number | null;
    is_active?: boolean;
}

interface Props {
    product?: ProductData | null;
    accounts: Account[];
    product_types: ProductTypeOption[];
    readonly?: boolean;
}

export default function Form({ product, product_types, readonly = false }: Props) {
    const isEdit = !!product && !readonly;
    const { data, setData, post, put, processing, errors } = useForm({
        product_code: product?.product_code ?? '',
        sku: product?.sku ?? '',
        name: product?.name ?? '',
        product_type: product?.product_type ?? 'goods',
        unit: product?.unit ?? '',
        description: product?.description ?? '',
        is_stock_tracked: product?.is_stock_tracked ?? true,
        sales_price: product?.sales_price?.toString() ?? '0',
        purchase_price: product?.purchase_price?.toString() ?? '0',
        inventory_account_id: product?.inventory_account_id?.toString() ?? '',
        revenue_account_id: product?.revenue_account_id?.toString() ?? '',
        cogs_account_id: product?.cogs_account_id?.toString() ?? '',
        is_active: product?.is_active ?? true,
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (readonly) return;
        if (isEdit && product) {
            put(`/master/produk/${product.id}`);
        } else {
            post('/master/produk');
        }
    };

    const title = readonly ? 'Detail Produk' : isEdit ? 'Edit Produk' : 'Tambah Produk';

    return (
        <AuthenticatedLayout>
            <Head title={title} />
            <div className="mx-auto max-w-3xl">
                <Breadcrumb items={[{ label: 'Master Data' }, { label: 'Produk', href: '/master/produk' }, { label: readonly ? 'Detail' : isEdit ? 'Edit' : 'Tambah' }]} />
                <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">{title}</h1></div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Kode Produk" error={errors.product_code} hint="Opsional, kosongkan untuk auto-number">
                                    <Input value={data.product_code} onChange={(e) => setData('product_code', e.target.value)} disabled={readonly} />
                                </FormField>
                                <FormField label="SKU" error={errors.sku}>
                                    <Input value={data.sku} onChange={(e) => setData('sku', e.target.value)} disabled={readonly} />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Nama Produk" error={errors.name} required>
                                    <Input value={data.name} onChange={(e) => setData('name', e.target.value)} disabled={readonly} />
                                </FormField>
                                <FormField label="Tipe Produk" error={errors.product_type} required>
                                    <Select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.product_type} onChange={(e) => {
                                        const value = e.target.value as 'goods' | 'service';
                                        setData('product_type', value);
                                        if (value === 'service') setData('is_stock_tracked', false);
                                    }} disabled={readonly}>
                                        {product_types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                                    </Select>
                                </FormField>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField label="Satuan" error={errors.unit} required>
                                    <Input value={data.unit} onChange={(e) => setData('unit', e.target.value)} disabled={readonly} />
                                </FormField>
                                <FormField label="Harga Jual" error={errors.sales_price}>
                                    <Input type="number" min="0" step="0.01" value={data.sales_price} onChange={(e) => setData('sales_price', e.target.value)} disabled={readonly} />
                                </FormField>
                                <FormField label="Harga Beli" error={errors.purchase_price}>
                                    <Input type="number" min="0" step="0.01" value={data.purchase_price} onChange={(e) => setData('purchase_price', e.target.value)} disabled={readonly} />
                                </FormField>
                            </div>

                            <FormField label="Deskripsi" error={errors.description}>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} disabled={readonly} rows={3} />
                            </FormField>

                            <div className="flex flex-wrap items-center gap-6">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.is_stock_tracked} onChange={(e) => setData('is_stock_tracked', e.target.checked)} disabled={readonly || data.product_type === 'service'} />
                                    Produk stok
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} disabled={readonly} />
                                    Aktif
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                {!readonly && <Button type="submit" disabled={processing}>{isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}</Button>}
                                {readonly && product && <Link href={`/master/produk/${product.id}/edit`}><Button type="button">Edit Produk</Button></Link>}
                                <Link href="/master/produk"><Button type="button" variant="outline">Kembali</Button></Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
