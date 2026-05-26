import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateDDMMYYYY } from '@/lib/format';
import { usePermissions } from '@/lib/permissions';
import { BadgeDollarSign, CreditCard, FileText, Pencil, ShoppingBag, Truck, UserRound } from 'lucide-react';

interface PartnerDetail {
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
    types: string[];
    is_customer: boolean;
    is_supplier: boolean;
    outstanding_receivables: number;
    outstanding_payables: number;
    total_receivables: number;
    active_receivables: number;
    total_payables: number;
    active_payables: number;
    total_sales: number;
    total_purchases: number;
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

interface PayableItem {
    id: number;
    payable_number: string;
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

interface PurchaseItem {
    id: number;
    purchase_number: string;
    date?: string | null;
    due_date?: string | null;
    payment_type: string;
    payment_type_label: string;
    total_amount: number;
    status: string;
    status_label: string;
}

interface Props {
    partner: PartnerDetail;
    recentReceivables: ReceivableItem[];
    recentPayables: PayableItem[];
    recentSales: SaleItem[];
    recentPurchases: PurchaseItem[];
}

const typeLabel: Record<string, string> = {
    customer: 'Pelanggan',
    supplier: 'Supplier',
};

const typeBadgeClass: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-700',
    supplier: 'bg-amber-100 text-amber-700',
};

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

export default function Show({ partner, recentReceivables, recentPayables, recentSales, recentPurchases }: Props) {
    const { can } = usePermissions();
    const Icon = partner.is_customer && !partner.is_supplier ? UserRound : partner.is_supplier && !partner.is_customer ? Truck : UserRound;

    return (
        <AuthenticatedLayout>
            <Head title={`Mitra ${partner.code ?? partner.name}`} />

            <div className="mx-auto max-w-6xl">
                <Breadcrumb items={[
                    { label: 'Master Data' },
                    { label: 'Mitra', href: '/master/mitra' },
                    { label: 'Detail' },
                ]} />

                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-blue-100 p-3">
                            <Icon className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(partner.is_active ? 'active' : 'inactive')}`}>
                                    {partner.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                                {partner.types.map((t) => (
                                    <span
                                        key={t}
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeBadgeClass[t] ?? 'bg-slate-100 text-slate-700'}`}
                                    >
                                        {typeLabel[t] ?? t}
                                    </span>
                                ))}
                            </div>
                            <p className="mt-1 font-mono text-sm text-muted-foreground">
                                {partner.code || 'Tanpa kode mitra'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Link href="/master/mitra">
                            <Button variant="outline">Kembali</Button>
                        </Link>
                        {can('partners.edit') && (
                            <Link href={`/master/mitra/${partner.id}/edit`}>
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
                                    <h2 className="text-lg font-semibold text-gray-900">Informasi Mitra</h2>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <DetailItem label="Email" value={partner.email || '-'} />
                                    <DetailItem label="Telepon" value={partner.phone || '-'} />
                                    <DetailItem label="NPWP / ID Pajak" value={partner.tax_id || '-'} />
                                    {partner.is_customer && (
                                        <DetailItem label="Limit Kredit" value={formatCurrency(partner.credit_limit)} />
                                    )}
                                    <DetailItem
                                        label="Alamat"
                                        value={<span className="whitespace-pre-line">{partner.address || '-'}</span>}
                                    />
                                    <DetailItem
                                        label="Catatan"
                                        value={<span className="whitespace-pre-line">{partner.notes || '-'}</span>}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {partner.is_customer && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <BadgeDollarSign size={18} className="text-muted-foreground" />
                                        <h2 className="text-lg font-semibold text-gray-900">Piutang Terbaru</h2>
                                    </div>

                                    {recentReceivables.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Belum ada transaksi piutang untuk mitra ini.</p>
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
                        )}

                        {partner.is_supplier && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <BadgeDollarSign size={18} className="text-muted-foreground" />
                                        <h2 className="text-lg font-semibold text-gray-900">Hutang Terbaru</h2>
                                    </div>

                                    {recentPayables.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Belum ada transaksi hutang untuk mitra ini.</p>
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
                                                    {recentPayables.map((item) => (
                                                        <tr key={item.id} className="border-b last:border-0">
                                                            <td className="py-3">
                                                                <Link href={`/transaksi/hutang/${item.id}`} className="font-medium text-blue-600 hover:underline">
                                                                    {item.payable_number}
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
                        )}

                        {partner.is_customer && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <ShoppingBag size={18} className="text-muted-foreground" />
                                        <h2 className="text-lg font-semibold text-gray-900">Penjualan Terbaru</h2>
                                    </div>

                                    {recentSales.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Belum ada transaksi penjualan untuk mitra ini.</p>
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
                        )}

                        {partner.is_supplier && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-4 flex items-center gap-2">
                                        <ShoppingBag size={18} className="text-muted-foreground" />
                                        <h2 className="text-lg font-semibold text-gray-900">Pembelian Terbaru</h2>
                                    </div>

                                    {recentPurchases.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Belum ada transaksi pembelian untuk mitra ini.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {recentPurchases.map((purchase) => (
                                                <div key={purchase.id} className="rounded-lg border p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <Link href={`/transaksi/pembelian/${purchase.id}`} className="font-medium text-blue-600 hover:underline">
                                                                {purchase.purchase_number}
                                                            </Link>
                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                {formatDate(purchase.date)} | {purchase.payment_type_label}
                                                            </p>
                                                        </div>
                                                        <div className="text-left sm:text-right">
                                                            <p className="font-semibold text-gray-900">{formatCurrency(purchase.total_amount)}</p>
                                                            <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses(purchase.status)}`}>
                                                                {purchase.status_label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardContent className="grid gap-4 p-6">
                                {partner.is_customer && (
                                    <div className="rounded-xl border bg-slate-50 p-4">
                                        <p className="text-sm text-muted-foreground">Piutang Aktif</p>
                                        <p className="mt-1 text-2xl font-bold text-blue-700">
                                            {formatCurrency(partner.outstanding_receivables)}
                                        </p>
                                    </div>
                                )}
                                {partner.is_supplier && (
                                    <div className="rounded-xl border bg-slate-50 p-4">
                                        <p className="text-sm text-muted-foreground">Hutang Aktif</p>
                                        <p className="mt-1 text-2xl font-bold text-amber-700">
                                            {formatCurrency(partner.outstanding_payables)}
                                        </p>
                                    </div>
                                )}
                                <div className="grid gap-3">
                                    {partner.is_customer && (
                                        <>
                                            <div className="rounded-xl border p-4">
                                                <p className="text-sm text-muted-foreground">Total Piutang</p>
                                                <p className="mt-1 text-xl font-semibold text-gray-900">{partner.total_receivables}</p>
                                            </div>
                                            <div className="rounded-xl border p-4">
                                                <p className="text-sm text-muted-foreground">Piutang Belum Lunas</p>
                                                <p className="mt-1 text-xl font-semibold text-gray-900">{partner.active_receivables}</p>
                                            </div>
                                            <div className="rounded-xl border p-4">
                                                <p className="text-sm text-muted-foreground">Total Penjualan</p>
                                                <p className="mt-1 text-xl font-semibold text-gray-900">{partner.total_sales}</p>
                                            </div>
                                        </>
                                    )}
                                    {partner.is_supplier && (
                                        <>
                                            <div className="rounded-xl border p-4">
                                                <p className="text-sm text-muted-foreground">Total Hutang</p>
                                                <p className="mt-1 text-xl font-semibold text-gray-900">{partner.total_payables}</p>
                                            </div>
                                            <div className="rounded-xl border p-4">
                                                <p className="text-sm text-muted-foreground">Hutang Belum Lunas</p>
                                                <p className="mt-1 text-xl font-semibold text-gray-900">{partner.active_payables}</p>
                                            </div>
                                            <div className="rounded-xl border p-4">
                                                <p className="text-sm text-muted-foreground">Total Pembelian</p>
                                                <p className="mt-1 text-xl font-semibold text-gray-900">{partner.total_purchases}</p>
                                            </div>
                                        </>
                                    )}
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
                                    {partner.is_customer && can('receivables.create') && (
                                        <Link href={`/transaksi/piutang/buat?partner_id=${partner.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Buat Piutang
                                            </Button>
                                        </Link>
                                    )}
                                    {partner.is_customer && can('receivables.edit') && (
                                        <Link href={`/transaksi/piutang-bayar/catat?partner_id=${partner.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Catat Pembayaran Piutang
                                            </Button>
                                        </Link>
                                    )}
                                    {partner.is_customer && can('sales.create') && (
                                        <Link href={`/transaksi/penjualan/buat?partner_id=${partner.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Buat Penjualan
                                            </Button>
                                        </Link>
                                    )}
                                    {partner.is_supplier && can('payables.create') && (
                                        <Link href={`/transaksi/hutang/buat?partner_id=${partner.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Buat Hutang
                                            </Button>
                                        </Link>
                                    )}
                                    {partner.is_supplier && can('payables.edit') && (
                                        <Link href={`/transaksi/hutang-bayar/catat?partner_id=${partner.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Catat Pembayaran Hutang
                                            </Button>
                                        </Link>
                                    )}
                                    {partner.is_supplier && can('purchases.create') && (
                                        <Link href={`/transaksi/pembelian/buat?partner_id=${partner.id}`}>
                                            <Button variant="outline" className="w-full justify-start">
                                                Buat Pembelian
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
