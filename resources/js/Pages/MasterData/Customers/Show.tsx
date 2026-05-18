import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/permissions';
import { BadgeDollarSign, CreditCard, FileText, Pencil, ShoppingBag, UserRound } from 'lucide-react';

interface CustomerDetail {
    id: number;
    code?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    tax_id?: string | null;
    credit_limit?: number | null;
    notes?: string | null;
    is_active: boolean;
    outstanding_receivables: number;
    total_receivables: number;
    active_receivables: number;
    total_sales: number;
}

interface ReceivableItem {
    id: number;
    receivable_number: string;
    date?: string | null;
    due_date?: string | null;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    status_label: string;
    payment_status: string;
    payment_status_label: string;
}

interface SaleItem {
    id: number;
    sale_number: string;
    date?: string | null;
    due_date?: string | null;
    payment_type: string;
    payment_type_label: string;
    total_amount: number;
    status: string;
    status_label: string;
}

interface Props {
    customer: CustomerDetail;
    recentReceivables: ReceivableItem[];
    recentSales: SaleItem[];
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

    return new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function statusClasses(status: string) {
    const classes: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        inactive: 'bg-gray-100 text-gray-600',
        unpaid: 'bg-red-100 text-red-700',
        partial: 'bg-yellow-100 text-yellow-700',
        paid: 'bg-green-100 text-green-700',
        draft: 'bg-gray-100 text-gray-700',
        posted: 'bg-blue-100 text-blue-700',
        voided: 'bg-gray-100 text-gray-600',
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

export default function Show({ customer, recentReceivables, recentSales }: Props) {
    const { can } = usePermissions();

    return (
        <AuthenticatedLayout>
            <Head title={`Pelanggan ${customer.code ?? customer.name}`} />

            <div className="mx-auto max-w-6xl">
                <Breadcrumb items={[
                    { label: 'Master Data' },
                    { label: 'Pelanggan', href: '/master/pelanggan' },
                    { label: 'Detail' },
                ]} />

                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-blue-100 p-3">
                            <UserRound className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(customer.is_active ? 'active' : 'inactive')}`}>
                                    {customer.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </div>
                            <p className="mt-1 font-mono text-sm text-muted-foreground">
                                {customer.code || 'Tanpa kode pelanggan'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Link href="/master/pelanggan">
                            <Button variant="outline">Kembali</Button>
                        </Link>
                        {can('customers.edit') && (
                            <Link href={`/master/pelanggan/${customer.id}/edit`}>
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
                                    <h2 className="text-lg font-semibold text-gray-900">Informasi Pelanggan</h2>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <DetailItem label="Email" value={customer.email || '-'} />
                                    <DetailItem label="Telepon" value={customer.phone || '-'} />
                                    <DetailItem label="NPWP / ID Pajak" value={customer.tax_id || '-'} />
                                    <DetailItem label="Limit Kredit" value={formatCurrency(customer.credit_limit)} />
                                    <DetailItem
                                        label="Alamat"
                                        value={<span className="whitespace-pre-line">{customer.address || '-'}</span>}
                                    />
                                    <DetailItem
                                        label="Catatan"
                                        value={<span className="whitespace-pre-line">{customer.notes || '-'}</span>}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <BadgeDollarSign size={18} className="text-muted-foreground" />
                                    <h2 className="text-lg font-semibold text-gray-900">Piutang Terbaru</h2>
                                </div>

                                {recentReceivables.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Belum ada transaksi piutang untuk pelanggan ini.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-left text-muted-foreground">
                                                    <th className="pb-3 font-medium">Nomor</th>
                                                    <th className="pb-3 font-medium">Tanggal</th>
                                                    <th className="pb-3 text-right font-medium">Sisa</th>
                                                    <th className="pb-3 text-center font-medium">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recentReceivables.map((item) => (
                                                    <tr key={item.id} className="border-b last:border-0">
                                                        <td className="py-3">
                                                            <Link href={`/transaksi/piutang/${item.id}`} className="font-medium text-blue-600 hover:underline">
                                                                {item.receivable_number}
                                                            </Link>
                                                            <div className="text-xs text-muted-foreground">
                                                                Jatuh tempo {formatDate(item.due_date)}
                                                            </div>
                                                        </td>
                                                        <td className="py-3">{formatDate(item.date)}</td>
                                                        <td className="py-3 text-right font-medium">{formatCurrency(item.remaining_amount)}</td>
                                                        <td className="py-3">
                                                            <div className="flex justify-center">
                                                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(item.payment_status)}`}>
                                                                    {item.payment_status_label}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <ShoppingBag size={18} className="text-muted-foreground" />
                                    <h2 className="text-lg font-semibold text-gray-900">Penjualan Terbaru</h2>
                                </div>

                                {recentSales.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Belum ada transaksi penjualan untuk pelanggan ini.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {recentSales.map((sale) => (
                                            <div key={sale.id} className="rounded-lg border p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <Link href={`/transaksi/penjualan/${sale.id}`} className="font-medium text-blue-600 hover:underline">
                                                            {sale.sale_number}
                                                        </Link>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {formatDate(sale.date)} | {sale.payment_type_label}
                                                        </p>
                                                    </div>
                                                    <div className="text-left sm:text-right">
                                                        <p className="font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</p>
                                                        <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses(sale.status)}`}>
                                                            {sale.status_label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardContent className="grid gap-4 p-6">
                                <div className="rounded-xl border bg-slate-50 p-4">
                                    <p className="text-sm text-muted-foreground">Piutang Aktif</p>
                                    <p className="mt-1 text-2xl font-bold text-blue-700">
                                        {formatCurrency(customer.outstanding_receivables)}
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                                    <div className="rounded-xl border p-4">
                                        <p className="text-sm text-muted-foreground">Total Piutang</p>
                                        <p className="mt-1 text-xl font-semibold text-gray-900">{customer.total_receivables}</p>
                                    </div>
                                    <div className="rounded-xl border p-4">
                                        <p className="text-sm text-muted-foreground">Piutang Belum Lunas</p>
                                        <p className="mt-1 text-xl font-semibold text-gray-900">{customer.active_receivables}</p>
                                    </div>
                                    <div className="rounded-xl border p-4">
                                        <p className="text-sm text-muted-foreground">Total Penjualan</p>
                                        <p className="mt-1 text-xl font-semibold text-gray-900">{customer.total_sales}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <CreditCard size={18} className="text-muted-foreground" />
                                    <h2 className="text-lg font-semibold text-gray-900">Tindakan Cepat</h2>
                                </div>
                                <div className="grid gap-3">
                                    {can('receivables.create') && (
                                        <Link href={`/transaksi/piutang/buat?customer_id=${customer.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Buat Piutang
                                            </Button>
                                        </Link>
                                    )}
                                    {can('receivables.edit') && (
                                        <Link href={`/transaksi/piutang-bayar/catat?customer_id=${customer.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Catat Pembayaran Piutang
                                            </Button>
                                        </Link>
                                    )}
                                    {can('sales.create') && (
                                        <Link href={`/transaksi/penjualan/buat?customer_id=${customer.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Buat Penjualan
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
