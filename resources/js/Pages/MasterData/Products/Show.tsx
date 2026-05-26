import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateDDMMYYYY } from '@/lib/format';
import { usePermissions } from '@/lib/permissions';
import { ArchiveX, ArrowDownCircle, ArrowUpCircle, FileText, Package, Pencil, ToggleLeft, ToggleRight, TrendingUp, Warehouse } from 'lucide-react';

interface AccountRef {
    id: number;
    code: string;
    name: string;
}

interface ProductDetail {
    id: number;
    product_code: string;
    sku?: string | null;
    name: string;
    product_type: 'goods' | 'service';
    unit: string;
    description?: string | null;
    is_stock_tracked: boolean;
    sales_price: number;
    purchase_price: number;
    current_stock: number;
    average_cost: number;
    is_active: boolean;
    created_by_name?: string | null;
    inventory_account?: AccountRef | null;
    revenue_account?: AccountRef | null;
    expense_account?: AccountRef | null;
    cogs_account?: AccountRef | null;
}

interface StockMovementItem {
    id: number;
    date: string;
    movement_type: string;
    quantity_in: number;
    quantity_out: number;
    unit_cost: number;
    total_cost: number;
    balance_quantity: number;
    balance_average_cost: number;
    notes?: string | null;
    source_type?: string | null;
}

interface Props {
    product: ProductDetail;
    recentMovements: StockMovementItem[];
    total_purchases: number;
    total_sales: number;
}

function formatCurrency(value: number | null | undefined) {
    if (value == null) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    return formatDateDDMMYYYY(value);
}

function statusClasses(status: string) {
    const classes: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        inactive: 'bg-gray-100 text-gray-600',
        goods: 'bg-amber-100 text-amber-700',
        service: 'bg-sky-100 text-sky-700',
    };
    return classes[status] ?? 'bg-slate-100 text-slate-700';
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-1 text-sm font-medium text-gray-900">{value}</div>
        </div>
    );
}

function movementTypeLabel(type: string) {
    const labels: Record<string, string> = {
        purchase: 'Pembelian',
        sale: 'Penjualan',
        adjustment_in: 'Penyesuaian Masuk',
        adjustment_out: 'Penyesuaian Keluar',
        opening: 'Stok Awal',
    };
    return labels[type] ?? type;
}

export default function Show({ product, recentMovements, total_purchases, total_sales }: Props) {
    const { can } = usePermissions();

    return (
        <AuthenticatedLayout>
            <Head title={`Produk ${product.product_code}`} />

            <div className="mx-auto max-w-6xl">
                <Breadcrumb items={[
                    { label: 'Master Data' },
                    { label: 'Produk', href: '/master/produk' },
                    { label: 'Detail' },
                ]} />

                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-100 p-3">
                            <Package className="text-amber-600" size={24} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(product.is_active ? 'active' : 'inactive')}`}>
                                    {product.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(product.product_type)}`}>
                                    {product.product_type === 'goods' ? 'Barang' : 'Jasa'}
                                </span>
                            </div>
                            <p className="mt-1 font-mono text-sm text-muted-foreground">
                                {product.product_code}
                                {product.sku && <span className="ml-2 text-muted-foreground">· SKU: {product.sku}</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link href="/master/produk">
                            <Button variant="outline">Kembali</Button>
                        </Link>
                        {can('products.edit') && (
                            <Button
                                variant="outline"
                                onClick={() => router.post(`/master/produk/${product.id}/toggle`)}
                            >
                                {product.is_active
                                    ? <><ToggleRight size={16} className="mr-1.5 text-green-600" />Nonaktifkan</>
                                    : <><ToggleLeft size={16} className="mr-1.5 text-gray-400" />Aktifkan</>
                                }
                            </Button>
                        )}
                        {can('products.edit') && (
                            <Link href={`/master/produk/${product.id}/edit`}>
                                <Button className="gap-1.5">
                                    <Pencil size={16} />
                                    Edit
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <FileText size={18} className="text-muted-foreground" />
                                    <h2 className="text-lg font-semibold text-gray-900">Informasi Produk</h2>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <DetailItem label="Kode Produk" value={<span className="font-mono">{product.product_code}</span>} />
                                    <DetailItem label="SKU" value={product.sku || '-'} />
                                    <DetailItem label="Nama Produk" value={product.name} />
                                    <DetailItem label="Satuan" value={product.unit} />
                                    <DetailItem label="Harga Jual" value={formatCurrency(product.sales_price)} />
                                    <DetailItem label="Harga Beli" value={formatCurrency(product.purchase_price)} />
                                    {product.description && (
                                        <div className="md:col-span-2">
                                            <DetailItem
                                                label="Deskripsi"
                                                value={<span className="whitespace-pre-line">{product.description}</span>}
                                            />
                                        </div>
                                    )}
                                    {product.created_by_name && (
                                        <DetailItem label="Dibuat oleh" value={product.created_by_name} />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-muted-foreground" />
                                    <h2 className="text-lg font-semibold text-gray-900">Akun Terhubung</h2>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <DetailItem
                                        label="Akun Persediaan"
                                        value={product.inventory_account
                                            ? `${product.inventory_account.code} - ${product.inventory_account.name}`
                                            : '-'}
                                    />
                                    <DetailItem
                                        label="Akun Penjualan"
                                        value={product.revenue_account
                                            ? `${product.revenue_account.code} - ${product.revenue_account.name}`
                                            : '-'}
                                    />
                                    <DetailItem
                                        label="Akun Beban"
                                        value={product.expense_account
                                            ? `${product.expense_account.code} - ${product.expense_account.name}`
                                            : '-'}
                                    />
                                    <DetailItem
                                        label="Akun HPP"
                                        value={product.cogs_account
                                            ? `${product.cogs_account.code} - ${product.cogs_account.name}`
                                            : '-'}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {product.is_stock_tracked && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <Warehouse size={18} className="text-muted-foreground" />
                                        <h2 className="text-lg font-semibold text-gray-900">Riwayat Pergerakan Stok</h2>
                                    </div>

                                    {recentMovements.length === 0 ? (
                                        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                                            <ArchiveX size={32} className="opacity-40" />
                                            <p className="text-sm">Belum ada pergerakan stok untuk produk ini.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b text-left text-muted-foreground">
                                                        <th className="pb-3 font-medium">Tanggal</th>
                                                        <th className="pb-3 font-medium">Tipe</th>
                                                        <th className="pb-3 text-right font-medium">Masuk</th>
                                                        <th className="pb-3 text-right font-medium">Keluar</th>
                                                        <th className="pb-3 text-right font-medium">Saldo</th>
                                                        <th className="pb-3 text-right font-medium">Avg Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentMovements.map((item) => (
                                                        <tr key={item.id} className="border-b last:border-0">
                                                            <td className="py-3">{formatDate(item.date)}</td>
                                                            <td className="py-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    {Number(item.quantity_in) > 0
                                                                        ? <ArrowDownCircle size={14} className="shrink-0 text-green-500" />
                                                                        : <ArrowUpCircle size={14} className="shrink-0 text-red-500" />
                                                                    }
                                                                    {movementTypeLabel(item.movement_type)}
                                                                </div>
                                                                {item.notes && (
                                                                    <div className="mt-0.5 text-xs text-muted-foreground">{item.notes}</div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 text-right font-medium text-green-700">
                                                                {Number(item.quantity_in) > 0 ? `+${Number(item.quantity_in).toFixed(2)}` : '-'}
                                                            </td>
                                                            <td className="py-3 text-right font-medium text-red-700">
                                                                {Number(item.quantity_out) > 0 ? `-${Number(item.quantity_out).toFixed(2)}` : '-'}
                                                            </td>
                                                            <td className="py-3 text-right">{Number(item.balance_quantity).toFixed(2)}</td>
                                                            <td className="py-3 text-right">{formatCurrency(item.balance_average_cost)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardContent className="grid gap-4 p-6">
                                {product.is_stock_tracked ? (
                                    <>
                                        <div className="rounded-xl border bg-amber-50 p-4">
                                            <p className="text-sm text-muted-foreground">Stok Saat Ini</p>
                                            <p className="mt-1 text-2xl font-bold text-amber-700">
                                                {Number(product.current_stock).toFixed(2)} <span className="text-base font-normal text-muted-foreground">{product.unit}</span>
                                            </p>
                                        </div>
                                        <div className="rounded-xl border p-4">
                                            <p className="text-sm text-muted-foreground">Rata-rata Harga Pokok</p>
                                            <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(product.average_cost)}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-xl border bg-sky-50 p-4">
                                        <p className="text-sm text-muted-foreground">Tipe</p>
                                        <p className="mt-1 text-lg font-semibold text-sky-700">Jasa / Non-Stok</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border p-4">
                                        <p className="text-sm text-muted-foreground">Total Pembelian</p>
                                        <p className="mt-1 text-xl font-semibold text-gray-900">{total_purchases}</p>
                                    </div>
                                    <div className="rounded-xl border p-4">
                                        <p className="text-sm text-muted-foreground">Total Penjualan</p>
                                        <p className="mt-1 text-xl font-semibold text-gray-900">{total_sales}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <Package size={18} className="text-muted-foreground" />
                                    <h2 className="text-lg font-semibold text-gray-900">Tindakan Cepat</h2>
                                </div>
                                <div className="grid gap-3">
                                    {can('purchases.create') && (
                                        <Link href={`/transaksi/pembelian/buat?product_id=${product.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Buat Pembelian
                                            </Button>
                                        </Link>
                                    )}
                                    {can('sales.create') && (
                                        <Link href={`/transaksi/penjualan/buat?product_id=${product.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Buat Penjualan
                                            </Button>
                                        </Link>
                                    )}
                                    {can('inventory_adjustments.create') && product.is_stock_tracked && (
                                        <Link href={`/transaksi/stok-penyesuaian/buat?product_id=${product.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Penyesuaian Stok
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
