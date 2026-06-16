import { Head, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ChartNoAxesColumnIncreasing, CookingPot, PackageCheck, PackageX } from 'lucide-react';

interface Filters {
    from: string;
    to: string;
}

interface Summary {
    revenue: number;
    cogs: number;
    gross_profit: number;
    quantity: number;
    menu_count: number;
    margin_percentage: number | null;
}

interface MenuPerformance {
    product_id: number;
    product_code: string;
    product_name: string;
    unit: string;
    quantity: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    margin_percentage: number | null;
}

interface LimitingIngredient {
    id: number;
    name: string;
    stock: number;
    unit: string;
    required_per_unit: number;
}

interface RecipeAvailability {
    recipe_id: number;
    product_id: number;
    product_code: string;
    product_name: string;
    yield_unit: string;
    available_units: number;
    limiting_ingredient: LimitingIngredient | null;
}

interface StockAttentionItem {
    id: number;
    product_code: string;
    name: string;
    unit: string;
    current_stock: number;
    average_cost: number;
    product_type: string;
}

interface Props {
    filters: Filters;
    summary: Summary;
    menuPerformance: MenuPerformance[];
    recipeAvailability: RecipeAvailability[];
    stockAttention: StockAttentionItem[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 2) {
    return Number(value).toLocaleString('id-ID', { maximumFractionDigits });
}

function formatPercent(value: number | null) {
    if (value === null) return '-';
    return `${formatNumber(value)}%`;
}

function productTypeLabel(type: string) {
    const labels: Record<string, string> = {
        raw_material: 'Bahan Baku',
        semi_finished: 'Setengah Jadi',
        goods: 'Barang',
    };

    return labels[type] ?? type;
}

export default function Index({ filters, summary, menuPerformance, recipeAvailability, stockAttention }: Props) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get('/fnb/analitik', { from, to }, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Analitik F&B" />
            <Breadcrumb items={[{ label: 'F&B' }, { label: 'Analitik F&B' }]} />

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <ChartNoAxesColumnIncreasing className="shrink-0 text-emerald-600" size={24} />
                        Analitik F&B
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Pantau margin menu, estimasi porsi tersedia, dan bahan yang perlu perhatian.
                    </p>
                </div>

                <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-white p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <FormField label="Dari">
                        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                    </FormField>
                    <FormField label="Sampai">
                        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                    </FormField>
                    <div className="flex items-end">
                        <Button type="submit" className="w-full">Terapkan</Button>
                    </div>
                </form>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Penjualan Menu</p>
                                <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.revenue)}</p>
                            </div>
                            <CookingPot className="text-emerald-600" size={24} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{formatNumber(summary.quantity)} unit terjual dari {summary.menu_count} menu</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">HPP Menu</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(summary.cogs)}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Berdasarkan cost aktual sale item</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Gross Profit</p>
                        <p className={`mt-1 text-2xl font-bold ${summary.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(summary.gross_profit)}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">Sebelum beban operasional</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Margin Rata-rata</p>
                        <p className={`mt-1 text-2xl font-bold ${(summary.margin_percentage ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatPercent(summary.margin_percentage)}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">Gross profit / penjualan</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card>
                        <CardContent className="p-0">
                            <div className="border-b p-5">
                                <h2 className="text-lg font-semibold text-gray-900">Performa Menu</h2>
                                <p className="mt-1 text-sm text-muted-foreground">Top 25 menu berdasarkan penjualan pada periode terpilih.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Menu</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Penjualan</TableHead>
                                            <TableHead className="text-right">HPP</TableHead>
                                            <TableHead className="text-right">Profit</TableHead>
                                            <TableHead className="text-right">Margin</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {menuPerformance.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                                                    Belum ada penjualan menu pada periode ini.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            menuPerformance.map((item) => (
                                                <TableRow key={`${item.product_id}-${item.unit}`}>
                                                    <TableCell>
                                                        <div className="font-medium text-gray-900">{item.product_name}</div>
                                                        <div className="font-mono text-xs text-muted-foreground">{item.product_code}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatNumber(item.quantity)} {item.unit}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.cogs)}</TableCell>
                                                    <TableCell className={`text-right font-medium ${item.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                        {formatCurrency(item.gross_profit)}
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatPercent(item.margin_percentage)}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <div className="border-b p-5">
                                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                    <PackageCheck size={18} className="text-emerald-600" />
                                    Estimasi Porsi Tersedia
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">Dihitung dari stok bahan pembatas di tiap resep aktif.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Menu / Resep</TableHead>
                                            <TableHead className="text-right">Estimasi Bisa Jual</TableHead>
                                            <TableHead>Bahan Pembatas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recipeAvailability.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                                                    Belum ada resep aktif.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recipeAvailability.map((item) => (
                                                <TableRow key={item.recipe_id}>
                                                    <TableCell>
                                                        <div className="font-medium text-gray-900">{item.product_name}</div>
                                                        <div className="font-mono text-xs text-muted-foreground">{item.product_code}</div>
                                                    </TableCell>
                                                    <TableCell className={`text-right font-semibold ${item.available_units <= 5 ? 'text-red-700' : 'text-gray-900'}`}>
                                                        {formatNumber(item.available_units, 0)} {item.yield_unit}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.limiting_ingredient ? (
                                                            <div>
                                                                <div className="font-medium text-gray-900">{item.limiting_ingredient.name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Stok {formatNumber(item.limiting_ingredient.stock)} {item.limiting_ingredient.unit}, butuh {formatNumber(item.limiting_ingredient.required_per_unit)} / {item.yield_unit}
                                                                </div>
                                                            </div>
                                                        ) : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="border-b p-5">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <PackageX size={18} className="text-red-600" />
                                Bahan Perlu Perhatian
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">Stok bahan tracked yang tersisa 5 unit atau kurang.</p>
                        </div>
                        {stockAttention.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Tidak ada bahan dengan stok rendah.
                            </div>
                        ) : (
                            <div className="divide-y">
                                {stockAttention.map((item) => (
                                    <div key={item.id} className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 [overflow-wrap:anywhere]">{item.name}</p>
                                                <p className="font-mono text-xs text-muted-foreground">{item.product_code}</p>
                                            </div>
                                            {item.current_stock <= 0 && <AlertTriangle size={18} className="shrink-0 text-red-600" />}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{productTypeLabel(item.product_type)}</span>
                                            <span className={`font-semibold ${item.current_stock <= 0 ? 'text-red-700' : 'text-amber-700'}`}>
                                                {formatNumber(item.current_stock)} {item.unit}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground">Avg cost {formatCurrency(item.average_cost)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
