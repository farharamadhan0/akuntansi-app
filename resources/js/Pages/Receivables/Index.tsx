import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Users, AlertTriangle, Banknote } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { formatDateDDMMYYYY } from '@/lib/format';
import { usePermissions } from '@/lib/permissions';
import { Pagination } from '@/components/ui/pagination';

interface Receivable {
    id: number;
    receivable_number: string;
    partner_name: string;
    date: string;
    due_date: string;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    description: string;
    status: 'draft' | 'posted' | 'voided' | 'corrected';
    status_label: string;
    payment_status: 'unpaid' | 'partial' | 'paid';
    payment_status_label: string;
    is_overdue: boolean;
}

interface Summary {
    totalOutstanding: number;
    totalOverdue: number;
    count_all: number;
    count_outstanding: number;
    count_overdue: number;
    count_paid: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedReceivables {
    data: Receivable[];
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
    receivables: PaginatedReceivables;
    summary: Summary;
    filters: {
        status: string;
        per_page: number;
    };
}

type FilterType = 'all' | 'outstanding' | 'overdue' | 'paid';

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

export default function Index({ receivables, summary, filters }: Props) {
    const { can } = usePermissions();
    const filter = (filters?.status as FilterType) || 'outstanding';
    const perPage = filters?.per_page ?? 25;

    function navigate(overrides: Record<string, string | number>) {
        router.get(
            '/transaksi/piutang',
            { status: filter, per_page: perPage, ...overrides },
            { preserveScroll: true, replace: true },
        );
    }

    function handleFilterChange(value: FilterType) {
        navigate({ status: value, per_page: perPage });
    }

    const filtered = receivables.data;

    const statusBadge = (r: Receivable) => {
        if (r.status === 'voided') {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Dibatalkan</span>;
        }
        if (r.status === 'corrected') {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">Dikoreksi</span>;
        }
        const colors: Record<string, string> = {
            unpaid: 'bg-red-100 text-red-700',
            partial: 'bg-yellow-100 text-yellow-700',
            paid: 'bg-green-100 text-green-700',
        };
        return (
            <span className={`px-2 py-0.5 text-xs rounded-full ${colors[r.payment_status]}`}>
                {r.payment_status_label}
            </span>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Piutang" />

            <Breadcrumb items={[
                { label: 'Transaksi' },
                { label: 'Piutang' },
            ]} />

            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="shrink-0 text-blue-500" size={26} />
                        Piutang
                    </h1>
                    <p className="max-w-full text-sm text-gray-500 mt-0.5">
                        Kelola piutang kepada pelanggan
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    {can('receivables.edit') && (
                        <Link href="/transaksi/piutang-bayar/catat" className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full min-w-0 shrink justify-center gap-1.5 overflow-hidden sm:w-auto">
                                <Banknote size={18} className="shrink-0" />
                                <span className="truncate">Terima Pembayaran</span>
                            </Button>
                        </Link>
                    )}
                    <Link href="/transaksi/piutang-bayar" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full min-w-0 shrink justify-center gap-1.5 overflow-hidden sm:w-auto">
                            <span className="truncate">Riwayat Pembayaran</span>
                        </Button>
                    </Link>
                    {can('receivables.create') && (
                        <Link href="/transaksi/piutang/buat" className="w-full sm:w-auto">
                            <Button className="w-full min-w-0 shrink justify-center gap-1.5 overflow-hidden sm:w-auto">
                                <Plus size={18} className="shrink-0" />
                                <span className="truncate">Buat Piutang</span>
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3 sm:items-center">
                            <div className="shrink-0 p-2 bg-blue-100 rounded-lg">
                                <Users className="text-blue-600" size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-gray-500">Total Belum Lunas</p>
                                <p className="text-base font-bold text-blue-700 [overflow-wrap:anywhere] sm:text-xl">
                                    {formatCurrency(summary.totalOutstanding)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3 sm:items-center">
                            <div className="shrink-0 p-2 bg-red-100 rounded-lg">
                                <AlertTriangle className="text-red-600" size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-gray-500">Jatuh Tempo</p>
                                <p className="text-base font-bold text-red-700 [overflow-wrap:anywhere] sm:text-xl">
                                    {formatCurrency(summary.totalOverdue)}
                                </p>
                            </div>
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
                    { value: 'outstanding', label: 'Belum Lunas', count: summary.count_outstanding },
                    { value: 'overdue', label: 'Jatuh Tempo', count: summary.count_overdue },
                    { value: 'paid', label: 'Lunas', count: summary.count_paid },
                ]}
            />

            <Card>
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="py-12 px-4 text-center text-muted-foreground">
                            <Users
                                size={40}
                                className="mx-auto mb-2 text-gray-300"
                            />
                            <p>Belum ada data piutang</p>
                            <p className="text-sm mt-1">Klik "Buat Piutang" untuk mencatat tagihan.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {filtered.map((r) => (
                                    <Link
                                        key={r.id}
                                        href={`/transaksi/piutang/${r.id}`}
                                        className={`block p-4 transition-colors hover:bg-gray-50 ${r.is_overdue ? 'bg-red-50/70' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-sm text-primary">
                                                    {r.receivable_number}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatDate(r.date)}
                                                </p>
                                            </div>
                                            <div className="min-w-0 text-right">
                                                <p className="text-xs text-muted-foreground">Sisa</p>
                                                <p className="text-sm font-semibold text-blue-600 [overflow-wrap:anywhere]">
                                                    {formatCurrency(r.remaining_amount)}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="mt-3 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                            {r.partner_name}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {statusBadge(r)}
                                            {r.is_overdue && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                                                    Lewat jatuh tempo
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                            <p>
                                                Jatuh tempo:{' '}
                                                <span className={r.is_overdue ? 'font-medium text-red-600' : ''}>
                                                    {formatDate(r.due_date)}
                                                </span>
                                            </p>
                                            <p>Jumlah: {formatCurrency(r.amount)}</p>
                                            {r.paid_amount > 0 && (
                                                <p>Dibayar: {formatCurrency(r.paid_amount)}</p>
                                            )}
                                            {r.description && (
                                                <p className="[overflow-wrap:anywhere]">Catatan: {r.description}</p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>No. Piutang</TableHead>
                                            <TableHead>Pelanggan</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Jatuh Tempo</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Jumlah</TableHead>
                                            <TableHead className="text-right">Sisa Tagihan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((r) => (
                                            <TableRow key={r.id} className={r.is_overdue ? 'bg-red-50' : ''}>
                                                <TableCell className="font-mono text-sm">
                                                    <Link
                                                        href={`/transaksi/piutang/${r.id}`}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {r.receivable_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="font-medium">{r.partner_name}</TableCell>
                                                <TableCell>{formatDate(r.date)}</TableCell>
                                                <TableCell>
                                                    <span className={r.is_overdue ? 'text-red-600 font-medium' : ''}>
                                                        {formatDate(r.due_date)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{statusBadge(r)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(r.amount)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-blue-600">
                                                    {formatCurrency(r.remaining_amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={receivables} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
