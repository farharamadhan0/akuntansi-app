import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { Download, MoreVertical, Package, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Product {
    id: number;
    product_code: string;
    sku?: string | null;
    name: string;
    product_type: 'goods' | 'service';
    unit: string;
    is_stock_tracked: boolean;
    sales_price: number;
    purchase_price: number;
    current_stock: number;
    average_cost: number;
    is_active: boolean;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedProducts {
    data: Product[];
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
    products: PaginatedProducts;
    filters: {
        per_page: number;
    };
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function Index({ products, filters }: Props) {
    const { can } = usePermissions();
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const perPage = filters?.per_page ?? 25;
    const {
        data: importData,
        setData: setImportData,
        post: postImport,
        processing: importing,
        errors: importErrors,
        reset: resetImport,
        clearErrors: clearImportErrors,
    } = useForm<{ file: File | null }>({
        file: null,
    });

    const handleDelete = (product: Product) => {
        router.delete(`/master/produk/${product.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        resetImport('file');
        clearImportErrors();
    };

    const submitImport = (event: FormEvent) => {
        event.preventDefault();

        postImport('/master/produk/import', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: closeImportModal,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Produk" />
            <Breadcrumb items={[{ label: 'Master Data' }, { label: 'Produk' }]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Package className="shrink-0 text-amber-600" size={24} />
                        Produk
                    </h1>
                    <p className="mt-1 max-w-full text-sm text-muted-foreground">Kelola barang dan jasa dalam satu master produk.</p>
                </div>
                {can('products.create') && (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full min-w-0 justify-center gap-2 overflow-hidden sm:w-auto"
                            onClick={() => setShowImportModal(true)}
                        >
                            <Upload size={16} className="shrink-0" />
                            <span className="truncate">Import</span>
                        </Button>
                        <Link href="/master/produk/tambah" className="w-full sm:w-auto">
                            <Button className="w-full min-w-0 justify-center gap-2 overflow-hidden sm:w-auto">
                                <Plus size={16} className="shrink-0" />
                                <span className="truncate">Tambah Produk</span>
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {products.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <Package size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada produk</p>
                            <p className="mt-1 text-sm">Klik "Tambah Produk" untuk menambahkan produk pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {products.data.map((product) => (
                                    <div key={product.id} className={`p-4 ${!product.is_active ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <Link href={`/master/produk/${product.id}`} className="min-w-0 flex-1">
                                                <p className="truncate font-mono text-sm text-primary">
                                                    {product.product_code}
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                                    {product.name}
                                                </p>
                                                {product.sku && (
                                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                                        SKU: {product.sku}
                                                    </p>
                                                )}
                                            </Link>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="shrink-0">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {can('products.edit') && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/master/produk/${product.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil size={15} />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('products.edit') && (
                                                        <DropdownMenuItem
                                                            onClick={() => router.post(`/master/produk/${product.id}/toggle`)}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {product.is_active
                                                                ? <><ToggleRight size={15} className="text-green-600" />Nonaktifkan</>
                                                                : <><ToggleLeft size={15} className="text-gray-400" />Aktifkan</>
                                                            }
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('products.delete') && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteTarget(product)}
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

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${product.product_type === 'goods' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                                                {product.product_type === 'goods' ? 'Barang' : 'Jasa'}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {product.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                            {product.is_stock_tracked && (
                                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                                    Stok tracked
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                                            <div className="min-w-0">
                                                <p>Harga Jual</p>
                                                <p className="mt-1 font-semibold text-gray-900 [overflow-wrap:anywhere]">
                                                    {formatCurrency(product.sales_price)}
                                                </p>
                                            </div>
                                            <div className="min-w-0 text-right">
                                                <p>Harga Beli</p>
                                                <p className="mt-1 font-semibold text-gray-900 [overflow-wrap:anywhere]">
                                                    {formatCurrency(product.purchase_price)}
                                                </p>
                                            </div>
                                        </div>

                                        {product.is_stock_tracked && (
                                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                                                <div className="min-w-0">
                                                    <p>Stok</p>
                                                    <p className="mt-1 font-medium text-gray-700 [overflow-wrap:anywhere]">
                                                        {product.current_stock.toFixed(2)} {product.unit}
                                                    </p>
                                                </div>
                                                <div className="min-w-0 text-right">
                                                    <p>Avg Cost</p>
                                                    <p className="mt-1 font-medium text-gray-700 [overflow-wrap:anywhere]">
                                                        {formatCurrency(product.average_cost)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Kode</TableHead>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>Tipe</TableHead>
                                            <TableHead className="text-right">Harga Jual</TableHead>
                                            <TableHead className="text-right">Harga Beli</TableHead>
                                            <TableHead className="text-right">Stok</TableHead>
                                            <TableHead className="text-right">Avg Cost</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.data.map((product) => (
                                            <TableRow key={product.id} className={!product.is_active ? 'opacity-60' : ''}>
                                                <TableCell className="font-mono text-xs">
                                                    <Link href={`/master/produk/${product.id}`} className="text-blue-600 hover:underline">
                                                        {product.product_code}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{product.name}</div>
                                                    {product.sku && <div className="text-xs text-muted-foreground">{product.sku}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`rounded-full px-2 py-1 text-xs ${product.product_type === 'goods' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                                                        {product.product_type === 'goods' ? 'Barang' : 'Jasa'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(product.sales_price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(product.purchase_price)}</TableCell>
                                                <TableCell className="text-right">{product.is_stock_tracked ? `${product.current_stock.toFixed(2)} ${product.unit}` : '-'}</TableCell>
                                                <TableCell className="text-right">{product.is_stock_tracked ? formatCurrency(product.average_cost) : '-'}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreVertical size={16} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {can('products.edit') && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/master/produk/${product.id}/edit`} className="flex items-center gap-2">
                                                                        <Pencil size={15} />
                                                                        Edit
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {can('products.edit') && (
                                                                <DropdownMenuItem
                                                                    onClick={() => router.post(`/master/produk/${product.id}/toggle`)}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    {product.is_active
                                                                        ? <><ToggleRight size={15} className="text-green-600" />Nonaktifkan</>
                                                                        : <><ToggleLeft size={15} className="text-gray-400" />Aktifkan</>
                                                                    }
                                                                </DropdownMenuItem>
                                                            )}
                                                            {can('products.delete') && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeleteTarget(product)}
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
                    <Pagination transactions={products} perPage={perPage} onPerPageChange={(val) => router.get('/master/produk', { per_page: val }, { preserveState: true, replace: true })} />
                </CardContent>
            </Card>
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-2 text-lg font-semibold">Hapus Produk</h3>
                        <p className="mb-4 text-sm text-gray-600">
                            Hapus produk <strong>{deleteTarget.name}</strong>? Tindakan ini tidak dapat dibatalkan.
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
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={submitImport} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-2 text-lg font-semibold">Import Produk</h3>
                        <p className="mb-4 text-sm text-gray-600">
                            Gunakan CSV dari template. Jika ada satu baris gagal validasi, seluruh import dibatalkan.
                        </p>

                        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-center gap-2 sm:w-auto"
                                onClick={() => { window.location.href = '/master/produk/template-import'; }}
                            >
                                <Download size={16} />
                                Template CSV
                            </Button>
                        </div>

                        <label className="block text-sm font-medium text-gray-700" htmlFor="product-import-file">
                            File CSV
                        </label>
                        <input
                            id="product-import-file"
                            type="file"
                            accept=".csv,text/csv"
                            className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:h-8 file:border file:border-border file:bg-background file:px-3 file:text-xs file:font-medium"
                            onChange={(event) => setImportData('file', event.target.files?.[0] ?? null)}
                        />
                        {importData.file && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                {importData.file.name}
                            </p>
                        )}
                        {importErrors.file && (
                            <div className="mt-3 max-h-40 overflow-auto whitespace-pre-line rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                {importErrors.file}
                            </div>
                        )}

                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeImportModal} disabled={importing}>
                                Batal
                            </Button>
                            <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={importing}>
                                <Upload size={16} />
                                {importing ? 'Mengimport...' : 'Import'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
