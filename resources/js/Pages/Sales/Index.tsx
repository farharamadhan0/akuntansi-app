import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateDDMMYYYY } from '@/lib/format';
import { usePermissions } from '@/lib/permissions';
import { Plus, ScanLine, TrendingUp } from 'lucide-react';

interface Sale {
    id: number;
    sale_number: string;
    date: string;
    due_date?: string | null;
    payment_type: string;
    receivable_payment_status?: 'unpaid' | 'partial' | 'paid' | null;
    partner_name?: string | null;
    cash_bank_name?: string | null;
    total_amount: number;
    status: string;
    status_label: string;
}

interface Summary {
    total_posted: number;
    count_all: number;
    count_posted: number;
    count_voided: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedSales {
    data: Sale[];
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
    sales: PaginatedSales;
    summary: Summary;
    filters: {
        status: string;
        per_page: number;
    };
}

type FilterType = 'all' | 'posted' | 'voided';

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr: string) {
    return formatDateDDMMYYYY(dateStr);
}

function formatPaymentType(sale: Sale) {
    if (sale.payment_type === 'cash') {
        return 'Tunai';
    }

    const statusLabel: Record<'unpaid' | 'partial' | 'paid', string> = {
        unpaid: 'belum lunas',
        partial: 'lunas sebagian',
        paid: 'lunas',
    };

    const statusColor: Record<'unpaid' | 'partial' | 'paid', string> = {
        unpaid: 'bg-red-100 text-red-700',
        partial: 'bg-yellow-100 text-yellow-700',
        paid: 'bg-green-100 text-green-700',
    };

    const status = sale.receivable_payment_status ? statusLabel[sale.receivable_payment_status] : 'belum lunas';
    const statusColorClass = sale.receivable_payment_status ? statusColor[sale.receivable_payment_status] : 'bg-gray-100 text-gray-700';

    return (
        <div className="flex items-center gap-2">
            <span>Kredit</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusColorClass}`}>
                {status}
            </span>
        </div>
    );
}

export default function Index({ sales, summary, filters }: Props) {
    const { can } = usePermissions();
    const filter = (filters?.status as FilterType) || 'posted';
    const perPage = filters?.per_page ?? 25;
    const filtered = sales.data;

    function navigate(overrides: Record<string, string | number>) {
        router.get(
            '/transaksi/penjualan',
            { status: filter, per_page: perPage, ...overrides },
            { preserveScroll: true, replace: true },
        );
    }

    function handleFilterChange(value: FilterType) {
        navigate({ status: value, per_page: perPage });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Penjualan" />
            <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Penjualan' }]} />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <ScanLine className="text-blue-600" size={26} />
                        Penjualan
                    </h1>
                    <p className="mt-0.5 text-sm text-gray-500">
                        Catatan penjualan barang dan jasa.
                    </p>
                </div>
                {can('sales.create') && (
                    <Link href="/transaksi/penjualan/buat">
                        <Button className="gap-2">
                            <Plus size={16} />
                            Buat Penjualan
                        </Button>
                    </Link>
                )}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="rounded-lg bg-blue-50 p-2">
                            <TrendingUp className="text-blue-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Penjualan</p>
                            <p className="text-lg font-bold text-blue-700">
                                {formatCurrency(summary.total_posted)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="rounded-lg bg-indigo-50 p-2">
                            <ScanLine className="text-indigo-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Jumlah Transaksi</p>
                            <p className="text-lg font-bold text-indigo-700">
                                {summary.count_posted} transaksi
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <FilterTabs<FilterType>
                className="mb-4"
                value={filter}
                onChange={handleFilterChange}
                items={[
                    { value: 'all', label: 'Semua', count: summary.count_all },
                    { value: 'posted', label: 'Diposting', count: summary.count_posted },
                    { value: 'voided', label: 'Dibatalkan', count: summary.count_voided },
                ]}
            />

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nomor</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Mitra</TableHead>
                                <TableHead>Pembayaran</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                        <ScanLine size={40} className="mx-auto mb-2 text-gray-300" />
                                        <p>Belum ada penjualan</p>
                                        <p className="mt-1 text-sm">Klik "Buat Penjualan" untuk mencatat penjualan pertama.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            <Link href={`/transaksi/penjualan/${sale.id}`} className="font-mono text-sm text-primary hover:underline">
                                                {sale.sale_number}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            {formatDate(sale.date)}
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-xs text-muted-foreground">
                                                {sale.partner_name ?? sale.cash_bank_name ?? '-'}
                                            </p>
                                        </TableCell>
                                        <TableCell>{formatPaymentType(sale)}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadge[sale.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {sale.status_label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right font-semibold">
                                            {formatCurrency(sale.total_amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination transactions={sales} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
