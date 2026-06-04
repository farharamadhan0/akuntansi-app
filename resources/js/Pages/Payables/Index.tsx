import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { usePermissions } from '@/lib/permissions';
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
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { formatDateDDMMYYYY } from '@/lib/format';
import { Plus, Wallet, AlertTriangle, Banknote } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

interface Payable {
    id: number;
    payable_number: string;
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

interface PaginatedPayables {
    data: Payable[];
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
    payables: PaginatedPayables;
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

export default function Index({ payables, summary, filters }: Props) {
    const { can } = usePermissions();
    const filter = (filters?.status as FilterType) || 'outstanding';
    const perPage = filters?.per_page ?? 25;

    function navigate(overrides: Record<string, string | number>) {
        router.get(
            '/transaksi/hutang',
            { status: filter, per_page: perPage, ...overrides },
            { preserveScroll: true, replace: true },
        );
    }

    function handleFilterChange(value: FilterType) {
        navigate({ status: value, per_page: perPage });
    }

    const filtered = payables.data;

    const statusBadge = (p: Payable) => {
        if (p.status === 'voided') {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Dibatalkan</span>;
        }

        if (p.status === 'corrected') {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">Dikoreksi</span>;
        }

        const colors: Record<string, string> = {
            unpaid: 'bg-red-100 text-red-700',
            partial: 'bg-yellow-100 text-yellow-700',
            paid: 'bg-green-100 text-green-700',
        };

        return (
            <span className={`px-2 py-0.5 text-xs rounded-full ${colors[p.payment_status]}`}>
                {p.payment_status_label}
            </span>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Hutang" />

            <Breadcrumb items={[
                { label: 'Transaksi' },
                { label: 'Hutang' },
            ]} />

            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="shrink-0 text-orange-500" size={26} />
                        Hutang
                    </h1>
                    <p className="max-w-full text-sm text-gray-500 mt-0.5">
                        Kelola tagihan yang harus dibayar ke supplier
                    </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    {can('payables.edit') && (
                        <Link href="/transaksi/hutang-bayar/catat" className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto">
                                <Banknote size={18} className="shrink-0" />
                                <span className="truncate">Bayar Hutang</span>
                            </Button>
                        </Link>
                    )}
                    <Link href="/transaksi/hutang-bayar" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto">
                            <span className="truncate">Riwayat Pembayaran</span>
                        </Button>
                    </Link>
                    {can('payables.create') && (
                        <Link href="/transaksi/hutang/buat" className="w-full sm:w-auto">
                            <Button className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto">
                                <Plus size={18} className="shrink-0" />
                                <span className="truncate">Catat Hutang</span>
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 flex items-start gap-3 sm:items-center sm:gap-4">
                        <div className="shrink-0 p-2 bg-orange-100 rounded-lg">
                            <Wallet className="text-orange-600" size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Total Sisa Hutang</p>
                            <p className="text-base font-bold text-orange-600 [overflow-wrap:anywhere] sm:text-lg">
                                {formatCurrency(summary.totalOutstanding)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-start gap-3 sm:items-center sm:gap-4">
                        <div className="shrink-0 p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="text-red-600" size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Lewat Jatuh Tempo</p>
                            <p className="text-base font-bold text-red-600 [overflow-wrap:anywhere] sm:text-lg">
                                {formatCurrency(summary.totalOverdue)}
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
                    { value: 'outstanding', label: 'Belum Lunas', count: summary.count_outstanding },
                    { value: 'overdue', label: 'Jatuh Tempo', count: summary.count_overdue },
                    { value: 'paid', label: 'Lunas', count: summary.count_paid },
                ]}
            />

            <Card>
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="py-12 px-4 text-center text-muted-foreground">
                            <Wallet
                                size={40}
                                className="mx-auto mb-2 text-gray-300"
                            />
                            <p>Belum ada data hutang</p>
                            <p className="text-sm mt-1">Klik "Catat Hutang" untuk mencatat hutang pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {filtered.map((p) => (
                                    <Link
                                        key={p.id}
                                        href={`/transaksi/hutang/${p.id}`}
                                        className={`block p-4 transition-colors hover:bg-gray-50 ${p.is_overdue ? 'bg-red-50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-sm text-primary">
                                                    {p.payable_number}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                                    {p.partner_name}
                                                </p>
                                            </div>
                                            <div className="min-w-0 text-right">
                                                <p className="text-sm font-semibold text-orange-600 [overflow-wrap:anywhere]">
                                                    {p.remaining_amount > 0
                                                        ? formatCurrency(p.remaining_amount)
                                                        : <span className="text-green-600">Lunas</span>
                                                    }
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                                    Total {formatCurrency(p.amount)}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="mt-3 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                            {p.description}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {statusBadge(p)}
                                            {p.is_overdue && (
                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                                    Lewat Jatuh Tempo
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                                            <div className="min-w-0">
                                                <p>Tanggal</p>
                                                <p className="mt-1 font-medium text-gray-700">
                                                    {formatDate(p.date)}
                                                </p>
                                            </div>
                                            <div className="min-w-0 text-right">
                                                <p>Jatuh Tempo</p>
                                                <p className={`mt-1 font-medium ${p.is_overdue ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {formatDate(p.due_date)}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>No. Hutang</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Jatuh Tempo</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Sisa Hutang</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((p) => (
                                            <TableRow
                                                key={p.id}
                                                className={p.is_overdue ? 'bg-red-50' : ''}
                                            >
                                                <TableCell className="font-mono text-sm text-gray-500">
                                                    <Link
                                                        href={`/transaksi/hutang/${p.id}`}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {p.payable_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium">{p.partner_name}</p>
                                                    <p className="text-xs text-muted-foreground truncate max-w-40">
                                                        {p.description}
                                                    </p>
                                                </TableCell>
                                                <TableCell>{formatDate(p.date)}</TableCell>
                                                <TableCell>
                                                    <span className={p.is_overdue ? 'text-red-600 font-medium' : ''}>
                                                        {formatDate(p.due_date)}
                                                    </span>
                                                    {p.is_overdue && (
                                                        <span className="ml-1 text-xs text-red-500">
                                                            Lewat
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{statusBadge(p)}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(p.amount)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-orange-600">
                                                    {p.remaining_amount > 0
                                                        ? formatCurrency(p.remaining_amount)
                                                        : <span className="text-green-600">Lunas</span>
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={payables} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
