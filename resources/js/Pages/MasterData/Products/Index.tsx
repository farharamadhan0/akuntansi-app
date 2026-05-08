import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { Package, Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';

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
                                <TableHead>Satuan</TableHead>
                                <TableHead className="text-right">Harga Jual</TableHead>
                                <TableHead className="text-right">Harga Beli</TableHead>
                                <TableHead className="text-right">Stok</TableHead>
                                <TableHead className="text-right">Avg Cost</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-28">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Belum ada produk.</TableCell>
                                </TableRow>
                            ) : products.map((product) => (
                                <TableRow key={product.id} className={!product.is_active ? 'opacity-60' : ''}>
                                    <TableCell className="font-mono text-xs">{product.product_code}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{product.name}</div>
                                        {product.sku && <div className="text-xs text-muted-foreground">{product.sku}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`rounded-full px-2 py-1 text-xs ${product.product_type === 'goods' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                                            {product.product_type === 'goods' ? 'Barang' : 'Jasa'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{product.unit}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(product.sales_price)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(product.purchase_price)}</TableCell>
                                    <TableCell className="text-right">{product.is_stock_tracked ? product.current_stock.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-right">{product.is_stock_tracked ? formatCurrency(product.average_cost) : '-'}</TableCell>
                                    <TableCell>
                                        <span className={`rounded-full px-2 py-1 text-xs ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {product.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {can('products.edit') && (
                                                <Link href={`/master/produk/${product.id}/edit`}>
                                                    <Button variant="ghost" size="sm"><Pencil size={15} /></Button>
                                                </Link>
                                            )}
                                            {can('products.edit') && (
                                                <Button variant="ghost" size="sm" onClick={() => router.post(`/master/produk/${product.id}/toggle`)}>
                                                    {product.is_active ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} className="text-gray-400" />}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
