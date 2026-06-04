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
import { formatDateDDMMYYYY } from '@/lib/format';
import { Plus, Banknote } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

interface Payment {
    id: number;
    payment_number: string;
    partner_name: string;
    cash_bank_name: string;
    date: string;
    amount: number;
    description: string;
    status: 'draft' | 'posted' | 'voided';
    status_label: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedPayments {
    data: Payment[];
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
    payments: PaginatedPayments;
    filters: {
        per_page: number;
    };
}

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

export default function Index({ payments, filters }: Props) {
    const { can } = usePermissions();
    const perPage = filters?.per_page ?? 25;

    function navigate(overrides: Record<string, number>) {
        router.get(
            '/transaksi/hutang-bayar',
            { per_page: perPage, ...overrides },
            { preserveScroll: true, replace: true },
        );
    }

    const statusBadge = (status: string, label: string) => {
        const colors: Record<string, string> = {
            draft: 'bg-gray-100 text-gray-600',
            posted: 'bg-green-100 text-green-700',
            voided: 'bg-red-100 text-red-600',
        };
        return (
            <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status]}`}>
                {label}
            </span>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pembayaran Hutang" />

            <Breadcrumb items={[
                { label: 'Transaksi' },
                { label: 'Hutang', href: '/transaksi/hutang' },
                { label: 'Pembayaran' },
            ]} />

            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Banknote className="shrink-0 text-orange-500" size={26} />
                        Pembayaran Hutang
                    </h1>
                    <p className="max-w-full text-sm text-gray-500 mt-0.5">
                        Riwayat pembayaran hutang ke supplier
                    </p>
                </div>
                {can('payables.edit') && (
                    <Link href="/transaksi/hutang-bayar/catat" className="w-full sm:w-auto">
                        <Button className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto">
                            <Plus size={18} className="shrink-0" />
                            <span className="truncate">Catat Pembayaran</span>
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {payments.data.length === 0 ? (
                        <div className="py-12 px-4 text-center text-muted-foreground">
                            <Banknote
                                size={40}
                                className="mx-auto mb-2 text-gray-300"
                            />
                            <p>Belum ada pembayaran hutang</p>
                            <p className="text-sm mt-1">Klik "Catat Pembayaran" untuk mencatat pembayaran pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {payments.data.map((p) => (
                                    <Link
                                        key={p.id}
                                        href={`/transaksi/hutang-bayar/${p.id}`}
                                        className="block p-4 transition-colors hover:bg-gray-50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-sm text-primary">
                                                    {p.payment_number}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatDate(p.date)}
                                                </p>
                                            </div>
                                            <p className="min-w-0 text-right text-sm font-semibold text-orange-600 [overflow-wrap:anywhere]">
                                                {formatCurrency(p.amount)}
                                            </p>
                                        </div>

                                        <p className="mt-3 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                            {p.partner_name}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {statusBadge(p.status, p.status_label)}
                                        </div>

                                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                            <p className="[overflow-wrap:anywhere]">
                                                Dibayar dari: {p.cash_bank_name}
                                            </p>
                                            {p.description && (
                                                <p className="[overflow-wrap:anywhere]">
                                                    Keterangan: {p.description}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>No. Pembayaran</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Dibayar dari</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Jumlah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.data.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono text-sm">
                                                    <Link href={`/transaksi/hutang-bayar/${p.id}`} className="text-blue-600 hover:underline">
                                                        {p.payment_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="font-medium">{p.partner_name}</TableCell>
                                                <TableCell>{formatDate(p.date)}</TableCell>
                                                <TableCell>{p.cash_bank_name}</TableCell>
                                                <TableCell>{statusBadge(p.status, p.status_label)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(p.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={payments} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
