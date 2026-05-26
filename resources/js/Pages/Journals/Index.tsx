import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateDDMMYYYY } from '@/lib/format';
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
import { Plus, Eye, BookOpen, CheckCircle2, FileText, Zap } from 'lucide-react';
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

interface Props {
    entries: Entry[];
}

const STATUS_FILTER = [
    { value: 'all', label: 'Semua' },
    { value: 'draft', label: 'Draft' },
    { value: 'posted', label: 'Diposting' },
    { value: 'voided', label: 'Dibatalkan' },
];

const SOURCE_FILTER = [
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

export default function Index({ entries }: Props) {
    const { can } = usePermissions();
    const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
    const flashSuccess = props.flash?.success;
    const flashError = props.flash?.error;

    const [status, setStatus] = useState<'all' | 'draft' | 'posted' | 'voided'>('all');
    const [source, setSource] = useState<'all' | 'manual' | 'auto'>('all');

    const filtered = useMemo(() => {
        return entries.filter((e) => {
            if (status !== 'all' && e.status !== status) return false;
            if (source === 'manual' && !e.is_manual) return false;
            if (source === 'auto' && e.is_manual) return false;
            return true;
        });
    }, [entries, status, source]);

    const draftCount = entries.filter((e) => e.status === 'draft').length;
    const postedCount = entries.filter((e) => e.status === 'posted').length;
    const manualCount = entries.filter((e) => e.is_manual).length;

    return (
        <AuthenticatedLayout>
            <Head title="Jurnal Umum" />

            <Breadcrumb items={[
                { label: 'Transaksi' },
                { label: 'Jurnal Umum' },
            ]} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="text-indigo-600" size={26} />
                        Jurnal Umum
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Catat jurnal manual, penyesuaian, dan lihat semua jurnal akuntansi
                    </p>
                </div>
                {can('journals.create') && (
                    <Link href="/jurnal/buat">
                        <Button className="gap-2">
                            <Plus size={16} />
                            Buat Jurnal Baru
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

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="text-gray-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Jurnal Draft</p>
                            <p className="text-lg font-bold text-gray-700">{draftCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 className="text-green-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Sudah Diposting</p>
                            <p className="text-lg font-bold text-green-700">{postedCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <BookOpen className="text-indigo-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Jurnal Manual</p>
                            <p className="text-lg font-bold text-indigo-700">{manualCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground mr-1">Status:</span>
                        {STATUS_FILTER.map((f) => (
                            <Button
                                key={f.value}
                                variant={status === f.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatus(f.value as typeof status)}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground mr-1">Sumber:</span>
                        {SOURCE_FILTER.map((f) => (
                            <Button
                                key={f.value}
                                variant={source === f.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSource(f.value as typeof source)}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <CardContent className="p-0">
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
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        <BookOpen size={40} className="mx-auto mb-2 text-gray-300" />
                                        <p>Belum ada jurnal</p>
                                        <p className="text-sm mt-1">
                                            Klik "Buat Jurnal Baru" untuk mulai mencatat jurnal manual.
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((e) => (
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
                                            <p className="font-medium text-sm">{e.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {e.line_count} baris
                                                {e.is_adjusting && ' · Penyesuaian'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {e.is_manual ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
                                                    <BookOpen size={11} />
                                                    Manual
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                                                    <Zap size={11} />
                                                    Otomatis
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge[e.status]}`}
                                            >
                                                {e.status_label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold whitespace-nowrap">
                                            {formatCurrency(e.total_debit)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
