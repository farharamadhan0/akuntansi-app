import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { MoreVertical, Package, Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
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

interface Props {
    products: Product[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function Index({ products }: Props) {
    const { can } = usePermissions();
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

    const handleDelete = (product: Product) => {
        router.delete(`/master/produk/${product.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Produk" />
            <Breadcrumb items={[{ label: 'Master Data' }, { label: 'Produk' }]} />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Package className="text-amber-600" size={24} />
                        Produk
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Kelola barang dan jasa dalam satu master produk.</p>
                </div>
                {can('products.create') && (
                    <Link href="/master/produk/tambah">
                        <Button className="gap-2"><Plus size={16} />Tambah Produk</Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
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
                            {products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Belum ada produk.</TableCell>
                                </TableRow>
                            ) : products.map((product) => (
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
                                    <TableCell className="text-right">{product.is_stock_tracked ? product.current_stock.toFixed(2) : '-'}</TableCell>
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
                                                            className="flex items-center gap-2 text-red-500 focus:text-red-500 focus:bg-red-50"
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
                </CardContent>
            </Card>
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold mb-2">Hapus Produk</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Hapus produk <strong>{deleteTarget.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                Batal
                            </Button>
                            <Button variant="destructive" onClick={() => handleDelete(deleteTarget)}>
                                Hapus
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
