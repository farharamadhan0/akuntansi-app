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
import { ClipboardList } from 'lucide-react';

interface RecipeItemOption {
    ingredient_product_id: number;
    quantity: number;
    unit: string;
    waste_percentage: number;
    ingredient: {
        id: number;
        product_code: string;
        name: string;
        unit: string;
        current_stock: number;
        average_cost: number;
        product_type: string;
    };
}

interface RecipeOption {
    id: number;
    product: {
        id: number;
        product_code: string;
        name: string;
        unit: string;
        current_stock: number;
        average_cost: number;
        product_type: string;
    };
    yield_quantity: number;
    yield_unit: string;
    items: RecipeItemOption[];
}

interface InputRow {
    product_id: string;
    planned_quantity: string;
    actual_quantity: string;
    unit: string;
}

interface Flash {
    error?: string;
}

interface Props {
    recipes: RecipeOption[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function inputRowsFromRecipe(recipe: RecipeOption, targetYieldQuantity = recipe.yield_quantity): InputRow[] {
    const multiplier = recipe.yield_quantity > 0
        ? Number(targetYieldQuantity || 0) / recipe.yield_quantity
        : 1;

    return recipe.items.map((item) => {
        const quantityWithWaste = item.quantity * (1 + item.waste_percentage / 100) * multiplier;
        const formattedQuantity = String(Number(quantityWithWaste.toFixed(2)));

        return {
            product_id: String(item.ingredient_product_id),
            planned_quantity: formattedQuantity,
            actual_quantity: formattedQuantity,
            unit: item.unit,
        };
    });
}

export default function Create({ recipes }: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const [selectedRecipeId, setSelectedRecipeId] = useState('');
    const [inputs, setInputs] = useState<InputRow[]>([]);
    const selectedRecipe = recipes.find((recipe) => String(recipe.id) === selectedRecipeId) ?? null;

    const { data, setData, post, processing, errors } = useForm({
        date: new Date().toISOString().split('T')[0],
        product_id: '',
        actual_yield_quantity: '',
        notes: '',
        inputs: [] as InputRow[],
    });

    const syncInputs = (nextInputs: InputRow[]) => {
        setInputs(nextInputs);
        setData('inputs', nextInputs);
    };

    const handleRecipeChange = (value: string) => {
        setSelectedRecipeId(value);
        const recipe = recipes.find((entry) => String(entry.id) === value);

        if (!recipe) {
            setData('product_id', '');
            setData('actual_yield_quantity', '');
            syncInputs([]);
            return;
        }

        setData('product_id', String(recipe.product.id));
        setData('actual_yield_quantity', String(recipe.yield_quantity));
        syncInputs(inputRowsFromRecipe(recipe));
    };

    const handleYieldQuantityChange = (value: string) => {
        setData('actual_yield_quantity', value);

        if (!selectedRecipe) {
            return;
        }

        const targetYieldQuantity = Number(value);
        if (targetYieldQuantity > 0) {
            syncInputs(inputRowsFromRecipe(selectedRecipe, targetYieldQuantity));
        }
    };

    const updateInput = (index: number, key: keyof InputRow, value: string) => {
        const next = [...inputs];
        next[index] = { ...next[index], [key]: value };
        syncInputs(next);
    };

    const estimatedCost = inputs.reduce((total, input) => {
        const recipeItem = selectedRecipe?.items.find((item) => String(item.ingredient_product_id) === input.product_id);
        const averageCost = Number(recipeItem?.ingredient.average_cost ?? 0);
        return total + Number(input.actual_quantity || 0) * averageCost;
    }, 0);
    const unitCost = Number(data.actual_yield_quantity || 0) > 0
        ? estimatedCost / Number(data.actual_yield_quantity || 1)
        : 0;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/fnb/produksi');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Buat Produksi / Prep" />
            <div className="mx-auto max-w-6xl">
                <Breadcrumb items={[{ label: 'F&B' }, { label: 'Produksi / Prep', href: '/fnb/produksi' }, { label: 'Buat' }]} />

                {flash?.error && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{flash.error}</div>}

                <div className="mb-6 flex items-center gap-2">
                    <ClipboardList className="text-emerald-600" size={24} />
                    <h1 className="text-2xl font-bold text-gray-900">Buat Produksi / Prep</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <Card>
                                <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                                    <FormField label="Produk Hasil / Resep" error={errors.product_id} required className="md:col-span-2">
                                        <Select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedRecipeId} onChange={(event) => handleRecipeChange(event.target.value)}>
                                            <option value="">-- Pilih Resep Produk Stok --</option>
                                            {recipes.map((recipe) => (
                                                <option key={recipe.id} value={recipe.id}>
                                                    {recipe.product.product_code} - {recipe.product.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormField>
                                    <FormField label="Tanggal" error={errors.date} required>
                                        <Input type="date" value={data.date} onChange={(event) => setData('date', event.target.value)} />
                                    </FormField>
                                    <FormField label={`Jumlah Produksi${selectedRecipe ? ` (${selectedRecipe.yield_unit})` : ''}`} error={errors.actual_yield_quantity} required>
                                        <Input type="number" min="0" step="1" value={data.actual_yield_quantity} onChange={(event) => handleYieldQuantityChange(event.target.value)} />
                                    </FormField>
                                    <FormField label="Catatan" error={errors.notes} className="md:col-span-2">
                                        <Textarea rows={3} value={data.notes} onChange={(event) => setData('notes', event.target.value)} />
                                    </FormField>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="space-y-4 p-6">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Input Bahan Aktual</h2>
                                        <p className="text-sm text-muted-foreground">Qty bahan otomatis mengikuti jumlah produksi. Ubah qty aktual jika ada selisih pemakaian.</p>
                                    </div>

                                    {inputs.length === 0 ? (
                                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                            Pilih resep terlebih dahulu.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {inputs.map((input, index) => {
                                                const recipeItem = selectedRecipe?.items.find((item) => String(item.ingredient_product_id) === input.product_id);
                                                const ingredient = recipeItem?.ingredient;
                                                const lineCost = Number(input.actual_quantity || 0) * Number(ingredient?.average_cost ?? 0);

                                                return (
                                                    <div key={input.product_id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-12">
                                                        <div className="md:col-span-5">
                                                            <p className="text-sm font-medium text-gray-900">{ingredient?.name ?? '-'}</p>
                                                            <p className="font-mono text-xs text-muted-foreground">{ingredient?.product_code ?? '-'}</p>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <FormField label="Rencana">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    value={input.planned_quantity}
                                                                    readOnly
                                                                    className="bg-muted/50 text-muted-foreground"
                                                                />
                                                            </FormField>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <FormField label="Aktual" error={errors[`inputs.${index}.actual_quantity` as keyof typeof errors] as string}>
                                                                <Input type="number" min="0" step="1" value={input.actual_quantity} onChange={(event) => updateInput(index, 'actual_quantity', event.target.value)} />
                                                            </FormField>
                                                        </div>
                                                        <div className="md:col-span-1">
                                                            <FormField label="Unit">
                                                                <Input value={input.unit} onChange={(event) => updateInput(index, 'unit', event.target.value)} />
                                                            </FormField>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <p className="text-xs text-muted-foreground">Estimasi Cost</p>
                                                            <p className="mt-2 text-sm font-semibold text-gray-900">{formatCurrency(lineCost)}</p>
                                                        </div>
                                                        <div className="md:col-span-12 text-xs text-muted-foreground">
                                                            Stok tersedia {Number(ingredient?.current_stock ?? 0).toFixed(2)} {ingredient?.unit ?? input.unit}, avg cost {formatCurrency(Number(ingredient?.average_cost ?? 0))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="h-fit">
                            <CardContent className="space-y-4 p-6">
                                <h2 className="text-lg font-semibold text-gray-900">Estimasi Cost</h2>
                                <div className="rounded-lg border bg-muted/30 p-4">
                                    <p className="text-sm text-muted-foreground">Total input</p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(estimatedCost)}</p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <p className="text-sm text-muted-foreground">Unit cost hasil</p>
                                    <p className="mt-1 text-xl font-semibold text-emerald-700">{formatCurrency(unitCost)}</p>
                                </div>
                                {selectedRecipe && (
                                    <p className="text-xs text-muted-foreground">
                                        Resep standar menghasilkan {Number(selectedRecipe.yield_quantity).toFixed(2)} {selectedRecipe.yield_unit}. Jika hasil aktual lebih kecil, unit cost hasil akan naik.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button type="submit" disabled={processing || !selectedRecipe}>Posting Produksi</Button>
                        <Link href="/fnb/produksi">
                            <Button type="button" variant="outline" className="w-full sm:w-auto">Batal</Button>
                        </Link>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
