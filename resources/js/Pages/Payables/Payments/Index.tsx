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

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Banknote className="text-orange-500" size={26} />
                        Pembayaran Hutang
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Riwayat pembayaran hutang ke supplier
                    </p>
                </div>
                {can('payables.edit') && (
                    <Link href="/transaksi/hutang-bayar/catat">
                        <Button className="gap-1.5">
                            <Plus size={18} />
                            Catat Pembayaran
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
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
                            {payments.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                                        Belum ada pembayaran hutang. Klik "Catat Pembayaran" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payments.data.map((p) => (
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination transactions={payments} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
