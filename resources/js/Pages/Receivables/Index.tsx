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

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-500" size={26} />
                        Piutang
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Kelola piutang kepada pelanggan
                    </p>
                </div>
                <div className="flex gap-2">
                    {can('receivables.edit') && (
                        <Link href="/transaksi/piutang-bayar/catat">
                            <Button variant="outline" className="gap-1.5">
                                <Banknote size={18} />
                                Terima Pembayaran
                            </Button>
                        </Link>
                    )}
                    <Link href="/transaksi/piutang-bayar">
                        <Button variant="outline" className="gap-1.5">
                            Riwayat Pembayaran
                        </Button>
                    </Link>
                    {can('receivables.create') && (
                        <Link href="/transaksi/piutang/buat">
                            <Button className="gap-1.5">
                                <Plus size={18} />
                                Buat Piutang
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="text-blue-600" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Belum Lunas</p>
                                <p className="text-xl font-bold text-blue-700">
                                    {formatCurrency(summary.totalOutstanding)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertTriangle className="text-red-600" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Jatuh Tempo</p>
                                <p className="text-xl font-bold text-red-700">
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
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                                        Belum ada data piutang. Klik "Buat Piutang" untuk mencatat tagihan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((r) => (
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination transactions={receivables} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
