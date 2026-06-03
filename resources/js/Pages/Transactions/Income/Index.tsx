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
import { formatDateDDMMYYYY } from '@/lib/format';
import { Plus, TrendingUp, ArrowUpCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { Pagination } from '@/components/ui/pagination';

interface Transaction {
    id: number;
    transaction_number: string;
    date: string;
    amount: number;
    description: string;
    reference?: string;
    status: 'draft' | 'posted' | 'voided' | 'corrected';
    status_label: string;
    status_color: string;
    cash_bank_name: string;
    cash_bank_type: string;
    category_name?: string;
    partner_name?: string;
    source_type?: string;
    source_id?: number;
    source_label?: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedTransactions {
    data: Transaction[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
    links: PaginationLink[];
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Summary {
    total_posted: number;
    count_posted: number;
    count_all: number;
    count_corrected: number;
    count_voided: number;
}

interface Props {
    transactions: PaginatedTransactions;
    summary: Summary;
    filters: {
        status: string;
        per_page: number;
    };
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
    corrected: 'bg-amber-100 text-amber-700',
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

export default function Index({ transactions, summary, filters }: Props) {
    const { can } = usePermissions();
    const filter = (filters?.status as 'all' | 'posted' | 'voided' | 'corrected') || 'posted';
    const perPage = filters?.per_page ?? 25;

    function navigate(overrides: Record<string, string | number>) {
        router.get(
            '/transaksi/uang-masuk',
            { status: filter, per_page: perPage, ...overrides },
            { preserveScroll: true, replace: true },
        );
    }

    function handleFilterChange(value: 'all' | 'posted' | 'voided' | 'corrected') {
        navigate({ status: value, per_page: perPage });
    }

    const filtered = transactions.data;

    return (
        <AuthenticatedLayout>
            <Head title="Uang Masuk" />

            <Breadcrumb items={[
                { label: 'Transaksi' },
                { label: 'Uang Masuk' },
            ]} />

            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="shrink-0 text-green-600" size={26} />
                        Uang Masuk
                    </h1>
                    <p className="max-w-full text-sm text-gray-500 mt-0.5">
                        Catat semua pemasukan ke kas atau rekening bank
                    </p>
                </div>
                {can('income.create') && (
                    <Link href="/transaksi/uang-masuk/catat" className="w-full sm:w-auto">
                        <Button className="w-full min-w-0 shrink justify-center gap-2 overflow-hidden sm:w-auto">
                            <Plus size={16} className="shrink-0" />
                            <span className="truncate">Catat Uang Masuk</span>
                        </Button>
                    </Link>
                )}
            </div>

            {/* Summary card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 flex items-start gap-3 sm:items-center sm:gap-4">
                        <div className="shrink-0 p-2 bg-green-50 rounded-lg">
                            <ArrowUpCircle className="text-green-600" size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Total Uang Masuk</p>
                            <p className="text-base font-bold text-green-700 [overflow-wrap:anywhere] sm:text-lg">
                                {formatCurrency(summary.total_posted)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-start gap-3 sm:items-center sm:gap-4">
                        <div className="shrink-0 p-2 bg-blue-50 rounded-lg">
                            <TrendingUp className="text-blue-600" size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Jumlah Transaksi</p>
                            <p className="text-base font-bold text-blue-700 [overflow-wrap:anywhere] sm:text-lg">
                                {summary.count_posted} transaksi
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <FilterTabs<'all' | 'posted' | 'voided' | 'corrected'>
                className="mb-4"
                value={filter}
                onChange={handleFilterChange}
                items={[
                    { value: 'all', label: 'Semua', count: summary.count_all },
                    { value: 'posted', label: 'Diposting', count: summary.count_posted },
                    { value: 'corrected', label: 'Dikoreksi', count: summary.count_corrected },
                    { value: 'voided', label: 'Dibatalkan', count: summary.count_voided },
                ]}
            />

            <Card>
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="py-12 px-4 text-center text-muted-foreground">
                            <TrendingUp
                                size={40}
                                className="mx-auto mb-2 text-gray-300"
                            />
                            <p>Belum ada transaksi uang masuk</p>
                            <p className="text-sm mt-1">Klik "Catat Uang Masuk" untuk mencatat pemasukan pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {filtered.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={`/transaksi/uang-masuk/${t.id}`}
                                        className="block p-4 transition-colors hover:bg-gray-50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-sm text-primary">
                                                    {t.transaction_number}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatDate(t.date)}
                                                </p>
                                            </div>
                                            <p className="min-w-0 text-right text-sm font-semibold text-green-700 [overflow-wrap:anywhere]">
                                                {formatCurrency(t.amount)}
                                            </p>
                                        </div>

                                        <p className="mt-3 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                            {t.description}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge[t.status]}`}
                                            >
                                                {t.status_label}
                                            </span>
                                            {t.source_label && (
                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                                    {t.source_label}
                                                </span>
                                            )}
                                        </div>

                                        {(t.partner_name || t.reference) && (
                                            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                                {t.partner_name && (
                                                    <p>Mitra: {t.partner_name}</p>
                                                )}
                                                {t.reference && (
                                                    <p>Ref: {t.reference}</p>
                                                )}
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>No. Transaksi</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                            <TableHead>Mitra</TableHead>
                                            <TableHead>Sumber</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Jumlah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    <Link href={`/transaksi/uang-masuk/${t.id}`} className="font-mono text-sm text-primary hover:underline">
                                                        {t.transaction_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                    {formatDate(t.date)}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-sm">{t.description}</p>
                                                    {t.reference && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Ref: {t.reference}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t.partner_name}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    {t.source_label && (
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                                            {t.source_label}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge[t.status]}`}
                                                    >
                                                        {t.status_label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold whitespace-nowrap">
                                                    {formatCurrency(t.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={transactions} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
