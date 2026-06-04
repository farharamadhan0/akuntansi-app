import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateDDMMYYYY } from '@/lib/format';
import { usePermissions } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, BookOpen, CheckCircle2, FileText, Zap } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface Entry {
    id: number;
    entry_number: string;
    date: string;
    description: string;
    status: 'draft' | 'posted' | 'voided';
    status_label: string;
    status_color: string;
    is_manual: boolean;
    is_adjusting: boolean;
    source_type: string | null;
    total_debit: number;
    total_credit: number;
    line_count: number;
}

interface Summary {
    count_draft: number;
    count_posted: number;
    count_manual: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedEntries {
    data: Entry[];
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
    entries: PaginatedEntries;
    summary: Summary;
    filters: {
        status: string;
        source: string;
        per_page: number;
    };
}

type StatusFilterType = 'all' | 'draft' | 'posted' | 'voided';
type SourceFilterType = 'all' | 'manual' | 'auto';

const STATUS_FILTER: Array<{ value: StatusFilterType; label: string }> = [
    { value: 'all', label: 'Semua' },
    { value: 'draft', label: 'Draft' },
    { value: 'posted', label: 'Diposting' },
    { value: 'voided', label: 'Dibatalkan' },
];

const SOURCE_FILTER: Array<{ value: SourceFilterType; label: string }> = [
    { value: 'all', label: 'Semua Jurnal' },
    { value: 'manual', label: 'Manual' },
    { value: 'auto', label: 'Otomatis' },
];

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

export default function Index({ entries, summary, filters }: Props) {
    const { can } = usePermissions();
    const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
    const flashSuccess = props.flash?.success;
    const flashError = props.flash?.error;
    const status = (filters?.status as StatusFilterType) || 'all';
    const source = (filters?.source as SourceFilterType) || 'all';
    const perPage = filters?.per_page ?? 25;

    function navigate(overrides: Record<string, string | number>) {
        router.get(
            '/jurnal',
            { status, source, per_page: perPage, ...overrides },
            { preserveScroll: true, replace: true },
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title="Jurnal Umum" />

            <Breadcrumb items={[
                { label: 'Transaksi' },
                { label: 'Jurnal Umum' },
            ]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <BookOpen className="shrink-0 text-indigo-600" size={26} />
                        Jurnal Umum
                    </h1>
                    <p className="mt-0.5 max-w-full text-sm text-gray-500">
                        Catat jurnal manual, penyesuaian, dan lihat semua jurnal akuntansi
                    </p>
                </div>
                {can('journals.create') && (
                    <Link href="/jurnal/buat" className="w-full sm:w-auto">
                        <Button className="w-full min-w-0 justify-center gap-2 overflow-hidden sm:w-auto">
                            <Plus size={16} className="shrink-0" />
                            <span className="truncate">Buat Jurnal Baru</span>
                        </Button>
                    </Link>
                )}
            </div>

            {flashSuccess && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {flashSuccess}
                </div>
            )}
            {flashError && (
                <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {flashError}
                </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="flex items-start gap-3 p-4 sm:items-center sm:gap-4">
                        <div className="shrink-0 rounded-lg bg-gray-100 p-2">
                            <FileText className="text-gray-600" size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Jurnal Draft</p>
                            <p className="text-base font-bold text-gray-700 [overflow-wrap:anywhere] sm:text-lg">{summary.count_draft}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-start gap-3 p-4 sm:items-center sm:gap-4">
                        <div className="shrink-0 rounded-lg bg-green-50 p-2">
                            <CheckCircle2 className="text-green-600" size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Sudah Diposting</p>
                            <p className="text-base font-bold text-green-700 [overflow-wrap:anywhere] sm:text-lg">{summary.count_posted}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-start gap-3 p-4 sm:items-center sm:gap-4">
                        <div className="shrink-0 rounded-lg bg-indigo-50 p-2">
                            <BookOpen className="text-indigo-600" size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Jurnal Manual</p>
                            <p className="text-base font-bold text-indigo-700 [overflow-wrap:anywhere] sm:text-lg">{summary.count_manual}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto">Status:</span>
                        {STATUS_FILTER.map((f) => (
                            <Button
                                key={f.value}
                                variant={status === f.value ? 'default' : 'outline'}
                                size="sm"
                                className="min-w-0"
                                onClick={() => navigate({ status: f.value })}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto">Sumber:</span>
                        {SOURCE_FILTER.map((f) => (
                            <Button
                                key={f.value}
                                variant={source === f.value ? 'default' : 'outline'}
                                size="sm"
                                className="min-w-0"
                                onClick={() => navigate({ source: f.value })}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <CardContent className="p-0">
                    {entries.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <BookOpen size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada jurnal</p>
                            <p className="mt-1 text-sm">
                                Klik "Buat Jurnal Baru" untuk mulai mencatat jurnal manual.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {entries.data.map((e) => (
                                    <Link
                                        key={e.id}
                                        href={`/jurnal/${e.id}`}
                                        className="block p-4 transition-colors hover:bg-gray-50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-sm text-primary">
                                                    {e.entry_number}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatDate(e.date)}
                                                </p>
                                            </div>
                                            <p className="min-w-0 text-right text-sm font-semibold text-indigo-700 [overflow-wrap:anywhere]">
                                                {formatCurrency(e.total_debit)}
                                            </p>
                                        </div>

                                        <p className="mt-3 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                            {e.description}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {e.is_manual ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                                                    <BookOpen size={11} />
                                                    Manual
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                                    <Zap size={11} />
                                                    Otomatis
                                                </span>
                                            )}
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadge[e.status] ?? 'bg-gray-100 text-gray-700'}`}
                                            >
                                                {e.status_label}
                                            </span>
                                            {e.is_adjusting && (
                                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                                    Penyesuaian
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-3 text-xs text-muted-foreground">
                                            {e.line_count} baris
                                        </p>
                                    </Link>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>No. Jurnal</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                            <TableHead className="text-center">Sumber</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {entries.data.map((e) => (
                                            <TableRow key={e.id}>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    <Link href={`/jurnal/${e.id}`} className="font-mono text-sm text-primary hover:underline">
                                                        {e.entry_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                    {formatDate(e.date)}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm font-medium">{e.description}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {e.line_count} baris
                                                        {e.is_adjusting && ' - Penyesuaian'}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {e.is_manual ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                                            <BookOpen size={11} />
                                                            Manual
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                            <Zap size={11} />
                                                            Otomatis
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadge[e.status] ?? 'bg-gray-100 text-gray-700'}`}
                                                    >
                                                        {e.status_label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right font-semibold">
                                                    {formatCurrency(e.total_debit)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={entries} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
