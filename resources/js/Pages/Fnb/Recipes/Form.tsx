import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CookingPot, Plus, Trash2 } from 'lucide-react';

interface ProductOption {
    id: number;
    product_code: string;
    name: string;
    unit: string;
    sales_price?: number;
    average_cost?: number;
    current_stock?: number;
    product_type: string;
}

interface RecipeItemData {
    id?: number;
    ingredient_product_id: number;
    quantity: number;
    unit: string;
    waste_percentage: number;
}

interface RecipeData {
    id: number;
    product_id: number;
    yield_quantity: number;
    yield_unit: string;
    notes?: string | null;
    is_active: boolean;
    items: RecipeItemData[];
}

interface ItemRow {
    ingredient_product_id: string;
    quantity: string;
    unit: string;
    waste_percentage: string;
}

interface Flash {
    error?: string;
}

interface Props {
    recipe?: RecipeData | null;
    menuProducts: ProductOption[];
    ingredientProducts: ProductOption[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function emptyRow(): ItemRow {
    return {
        ingredient_product_id: '',
        quantity: '1',
        unit: '',
        waste_percentage: '0',
    };
}

export default function Form({ recipe, menuProducts, ingredientProducts }: Props) {
    const isEdit = !!recipe;
    const { flash } = usePage().props as { flash?: Flash };
    const [items, setItems] = useState<ItemRow[]>(
        recipe?.items?.length
            ? recipe.items.map((item) => ({
                ingredient_product_id: String(item.ingredient_product_id),
                quantity: String(item.quantity),
                unit: item.unit,
                waste_percentage: String(item.waste_percentage ?? 0),
            }))
            : [emptyRow()],
    );

    const { data, setData, post, put, processing, errors } = useForm({
        product_id: recipe?.product_id ? String(recipe.product_id) : '',
        yield_quantity: recipe?.yield_quantity?.toString() ?? '1',
        yield_unit: recipe?.yield_unit ?? '',
        notes: recipe?.notes ?? '',
        is_active: recipe?.is_active ?? true,
        items: recipe?.items?.length
            ? recipe.items.map((item) => ({
                ingredient_product_id: String(item.ingredient_product_id),
                quantity: String(item.quantity),
                unit: item.unit,
                waste_percentage: String(item.waste_percentage ?? 0),
            }))
            : [emptyRow()],
    });

    const syncItems = (nextItems: ItemRow[]) => {
        setItems(nextItems);
        setData('items', nextItems);
    };

    const updateItem = (index: number, key: keyof ItemRow, value: string) => {
        const next = [...items];
        next[index] = { ...next[index], [key]: value };

        if (key === 'ingredient_product_id') {
            const ingredient = ingredientProducts.find((product) => String(product.id) === value);
            if (ingredient) {
                next[index].unit = ingredient.unit;
            }
        }

        syncItems(next);
    };

    const addItem = () => syncItems([...items, emptyRow()]);
    const removeItem = (index: number) => syncItems(items.filter((_, idx) => idx !== index));

    const selectedMenu = menuProducts.find((product) => String(product.id) === data.product_id);

    const itemCosts = items.map((item) => {
        const ingredient = ingredientProducts.find((product) => String(product.id) === item.ingredient_product_id);
        const averageCost = Number(ingredient?.average_cost ?? 0);
        const quantity = Number(item.quantity || 0);
        const waste = Number(item.waste_percentage || 0);
        const quantityWithWaste = quantity * (1 + waste / 100);
        const total = quantityWithWaste * averageCost;

        return {
            ingredient,
            averageCost,
            quantityWithWaste,
            total,
        };
    });

    const totalCost = itemCosts.reduce((acc, item) => acc + item.total, 0);
    const yieldQuantity = Math.max(Number(data.yield_quantity || 0), 0.00001);
    const costPerYield = totalCost / yieldQuantity;
    const salesPrice = Number(selectedMenu?.sales_price ?? 0);
    const grossProfit = salesPrice - costPerYield;
    const margin = salesPrice > 0 ? (grossProfit / salesPrice) * 100 : 0;

    const handleProductChange = (value: string) => {
        setData('product_id', value);
        const product = menuProducts.find((entry) => String(entry.id) === value);
        if (product && !data.yield_unit) {
            setData('yield_unit', product.unit);
        }
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isEdit && recipe) {
            put(`/fnb/resep/${recipe.id}`);
            return;
        }

        post('/fnb/resep');
    };

    const title = isEdit ? 'Edit Resep' : 'Tambah Resep';

    return (
        <AuthenticatedLayout>
            <Head title={title} />
            <div className="mx-auto max-w-6xl">
                <Breadcrumb items={[{ label: 'F&B' }, { label: 'Resep Menu', href: '/fnb/resep' }, { label: isEdit ? 'Edit' : 'Tambah' }]} />

                {flash?.error && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{flash.error}</div>}

                <div className="mb-6 flex items-center gap-2">
                    <CookingPot className="text-emerald-600" size={24} />
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <Card>
                                <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                                    <FormField label="Menu / Produk Hasil" error={errors.product_id} required className="md:col-span-2">
                                        <Select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={data.product_id} onChange={(event) => handleProductChange(event.target.value)}>
                                            <option value="">-- Pilih Menu / Produk Setengah Jadi --</option>
                                            {menuProducts.map((product) => (
                                                <option key={product.id} value={product.id}>
                                                    {product.product_code} - {product.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormField>
                                    <FormField label="Jumlah Hasil" error={errors.yield_quantity} required>
                                        <Input type="number" min="0" step="0.01" value={data.yield_quantity} onChange={(event) => setData('yield_quantity', event.target.value)} />
                                    </FormField>
                                    <FormField label="Satuan Hasil" error={errors.yield_unit} required>
                                        <Input value={data.yield_unit} onChange={(event) => setData('yield_unit', event.target.value)} />
                                    </FormField>
                                    <FormField label="Catatan" error={errors.notes} className="md:col-span-2">
                                        <Textarea rows={3} value={data.notes} onChange={(event) => setData('notes', event.target.value)} />
                                    </FormField>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={data.is_active} onChange={(event) => setData('is_active', event.target.checked)} />
                                        Aktif
                                    </label>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="space-y-4 p-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Bahan Resep</h2>
                                            <p className="text-sm text-muted-foreground">Tahap ini belum melakukan konversi satuan otomatis.</p>
                                        </div>
                                        <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={addItem}>
                                            <Plus size={16} />
                                            Tambah Bahan
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {items.map((item, index) => {
                                            const cost = itemCosts[index];

                                            return (
                                                <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-12">
                                                    <div className="md:col-span-5">
                                                        <FormField label="Bahan" error={errors[`items.${index}.ingredient_product_id` as keyof typeof errors] as string}>
                                                            <Select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={item.ingredient_product_id} onChange={(event) => updateItem(index, 'ingredient_product_id', event.target.value)}>
                                                                <option value="">-- Pilih Bahan --</option>
                                                                {ingredientProducts.map((product) => (
                                                                    <option key={product.id} value={product.id}>
                                                                        {product.product_code} - {product.name} ({Number(product.current_stock ?? 0).toFixed(2)} {product.unit})
                                                                    </option>
                                                                ))}
                                                            </Select>
                                                        </FormField>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <FormField label="Qty" error={errors[`items.${index}.quantity` as keyof typeof errors] as string}>
                                                            <Input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
                                                        </FormField>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <FormField label="Satuan" error={errors[`items.${index}.unit` as keyof typeof errors] as string}>
                                                            <Input value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)} />
                                                        </FormField>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <FormField label="Waste %" error={errors[`items.${index}.waste_percentage` as keyof typeof errors] as string}>
                                                            <Input type="number" min="0" max="100" step="0.01" value={item.waste_percentage} onChange={(event) => updateItem(index, 'waste_percentage', event.target.value)} />
                                                        </FormField>
                                                    </div>
                                                    <div className="flex items-end justify-end md:col-span-1">
                                                        {items.length > 1 && (
                                                            <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => removeItem(index)}>
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-12 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                                        <span>
                                                            Avg cost: {formatCurrency(cost.averageCost)} / {(cost.ingredient?.unit ?? item.unit) || '-'}
                                                        </span>
                                                        <span className="font-medium text-gray-700">
                                                            Estimasi baris: {formatCurrency(cost.total)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardContent className="space-y-4 p-6">
                                    <h2 className="text-lg font-semibold text-gray-900">Estimasi HPP</h2>
                                    <div className="rounded-lg border bg-muted/30 p-4">
                                        <p className="text-sm text-muted-foreground">Total biaya resep</p>
                                        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm text-muted-foreground">HPP per {data.yield_unit || 'unit'}</p>
                                        <p className="mt-1 text-xl font-semibold text-emerald-700">{formatCurrency(costPerYield)}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border p-4">
                                            <p className="text-sm text-muted-foreground">Harga jual</p>
                                            <p className="mt-1 font-semibold text-gray-900">{formatCurrency(salesPrice)}</p>
                                        </div>
                                        <div className="rounded-lg border p-4">
                                            <p className="text-sm text-muted-foreground">Margin</p>
                                            <p className={`mt-1 font-semibold ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                {margin.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Estimasi memakai average cost bahan saat ini. Konversi satuan otomatis dan costing aktual saat penjualan masuk tahap berikutnya.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button type="submit" disabled={processing}>{isEdit ? 'Simpan Perubahan' : 'Tambah Resep'}</Button>
                        <Link href="/fnb/resep">
                            <Button type="button" variant="outline" className="w-full sm:w-auto">Batal</Button>
                        </Link>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
