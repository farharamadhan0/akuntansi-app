import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { CookingPot, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ProductRef {
    id: number;
    product_code: string;
    name: string;
    unit: string;
    sales_price: number;
    product_type: string;
    is_active: boolean;
}

interface EstimatedCost {
    total_cost: number;
    cost_per_yield: number;
    gross_profit: number;
    margin_percentage: number;
}

interface Recipe {
    id: number;
    yield_quantity: number;
    yield_unit: string;
    is_active: boolean;
    items_count: number;
    productions_count: number;
    product: ProductRef;
    estimated_cost: EstimatedCost;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedRecipes {
    data: Recipe[];
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    links: PaginationLink[];
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Props {
    recipes: PaginatedRecipes;
    filters: {
        per_page: number;
    };
}

interface Flash {
    error?: string;
    success?: string;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatPercent(value: number) {
    return `${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
}

export default function Index({ recipes, filters }: Props) {
    const { can } = usePermissions();
    const { flash } = usePage().props as { flash?: Flash };
    const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
    const perPage = filters?.per_page ?? 25;

    const handleDelete = (recipe: Recipe) => {
        router.delete(`/fnb/resep/${recipe.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Resep Menu" />
            <Breadcrumb items={[{ label: 'F&B' }, { label: 'Resep Menu' }]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <CookingPot className="shrink-0 text-emerald-600" size={24} />
                        Resep Menu
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Kelola komposisi bahan dan estimasi HPP menu F&B.</p>
                </div>
                {can('recipes.create') && (
                    <Link href="/fnb/resep/tambah" className="w-full sm:w-auto">
                        <Button className="w-full gap-2 sm:w-auto">
                            <Plus size={16} />
                            Tambah Resep
                        </Button>
                    </Link>
                )}
            </div>

            {flash?.error && (
                <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {flash.error}
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    {recipes.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <CookingPot size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada resep</p>
                            <p className="mt-1 text-sm">Tambahkan produk bertipe Menu Jual atau Produk Setengah Jadi, lalu buat resepnya.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {recipes.data.map((recipe) => (
                                    <div key={recipe.id} className={`p-4 ${!recipe.is_active ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-mono text-sm text-primary">{recipe.product.product_code}</p>
                                                <p className="mt-1 font-medium text-gray-900 [overflow-wrap:anywhere]">{recipe.product.name}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Hasil: {Number(recipe.yield_quantity).toFixed(2)} {recipe.yield_unit} · {recipe.items_count} bahan
                                                </p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="shrink-0">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {can('recipes.edit') && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/fnb/resep/${recipe.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil size={15} />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('recipes.delete') && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteTarget(recipe)}
                                                                className="flex items-center gap-2 text-red-500 focus:bg-red-50 focus:text-red-500"
                                                            >
                                                                <Trash2 size={15} />
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                                            <div>
                                                <p>HPP per {recipe.yield_unit}</p>
                                                <p className="mt-1 font-semibold text-gray-900">{formatCurrency(recipe.estimated_cost.cost_per_yield)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p>Margin</p>
                                                <p className="mt-1 font-semibold text-gray-900">{formatPercent(recipe.estimated_cost.margin_percentage)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Menu / Produk</TableHead>
                                            <TableHead>Hasil Resep</TableHead>
                                            <TableHead className="text-right">Bahan</TableHead>
                                            <TableHead className="text-right">Harga Jual</TableHead>
                                            <TableHead className="text-right">HPP / Unit</TableHead>
                                            <TableHead className="text-right">Margin</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recipes.data.map((recipe) => (
                                            <TableRow key={recipe.id} className={!recipe.is_active ? 'opacity-60' : ''}>
                                                <TableCell>
                                                    <Link href={`/fnb/resep/${recipe.id}/edit`} className="font-medium text-blue-600 hover:underline">
                                                        {recipe.product.name}
                                                    </Link>
                                                    <div className="font-mono text-xs text-muted-foreground">{recipe.product.product_code}</div>
                                                </TableCell>
                                                <TableCell>{Number(recipe.yield_quantity).toFixed(2)} {recipe.yield_unit}</TableCell>
                                                <TableCell className="text-right">{recipe.items_count}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(recipe.product.sales_price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(recipe.estimated_cost.cost_per_yield)}</TableCell>
                                                <TableCell className="text-right">{formatPercent(recipe.estimated_cost.margin_percentage)}</TableCell>
                                                <TableCell>
                                                    <span className={`rounded-full px-2 py-1 text-xs ${recipe.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {recipe.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreVertical size={16} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {can('recipes.edit') && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/fnb/resep/${recipe.id}/edit`} className="flex items-center gap-2">
                                                                        <Pencil size={15} />
                                                                        Edit
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {can('recipes.delete') && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeleteTarget(recipe)}
                                                                        className="flex items-center gap-2 text-red-500 focus:bg-red-50 focus:text-red-500"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                        Hapus
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={recipes} perPage={perPage} onPerPageChange={(val) => router.get('/fnb/resep', { per_page: val }, { preserveState: true, replace: true })} />
                </CardContent>
            </Card>

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-2 text-lg font-semibold">Hapus Resep</h3>
                        <p className="mb-4 text-sm text-gray-600">
                            Hapus resep <strong>{deleteTarget.product.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteTarget(null)}>
                                Batal
                            </Button>
                            <Button variant="destructive" className="w-full sm:w-auto" onClick={() => handleDelete(deleteTarget)}>
                                Hapus
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
