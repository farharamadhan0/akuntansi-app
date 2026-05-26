import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
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
}

interface Props {
    payables: Payable[];
    summary: Summary;
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

export default function Index({ payables, summary }: Props) {
    const { can } = usePermissions();
    const [filter, setFilter] = useState<'all' | 'outstanding' | 'overdue' | 'paid'>('outstanding');

    const visiblePayables = payables.filter((payable) => payable.status !== 'corrected');

    const filtered = visiblePayables.filter((payable) => {
        if (filter === 'outstanding') {
            return payable.status === 'posted' && payable.payment_status !== 'paid';
        }

        if (filter === 'overdue') {
            return payable.is_overdue;
        }

        if (filter === 'paid') {
            return payable.payment_status === 'paid';
        }

        return true;
    });

    const statusBadge = (p: Payable) => {
        if (p.status === 'voided') {
            return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Dibatalkan</span>;
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

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="text-orange-500" size={26} />
                        Hutang
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Kelola tagihan yang harus dibayar ke supplier
                    </p>
                </div>
                <div className="flex gap-2">
                    {can('payables.edit') && (
                        <Link href="/transaksi/hutang-bayar/catat">
                            <Button variant="outline" className="gap-1.5">
                                <Banknote size={18} />
                                Bayar Hutang
                            </Button>
                        </Link>
                    )}
                    <Link href="/transaksi/hutang-bayar">
                        <Button variant="outline" className="gap-1.5">
                            Riwayat Pembayaran
                        </Button>
                    </Link>
                    {can('payables.create') && (
                        <Link href="/transaksi/hutang/buat">
                            <Button className="gap-1.5">
                                <Plus size={18} />
                                Catat Hutang
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Wallet className="text-orange-600" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Sisa Hutang</p>
                                <p className="text-xl font-bold text-orange-600">
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
                                <p className="text-sm text-gray-500">Lewat Jatuh Tempo</p>
                                <p className="text-xl font-bold text-red-600">
                                    {formatCurrency(summary.totalOverdue)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <FilterTabs<'all' | 'outstanding' | 'overdue' | 'paid'>
                className="mb-4"
                value={filter}
                onChange={setFilter}
                items={[
                    { value: 'all', label: 'Semua', count: visiblePayables.length },
                    {
                        value: 'outstanding',
                        label: 'Belum Lunas',
                        count: visiblePayables.filter((payable) => payable.status === 'posted' && payable.payment_status !== 'paid').length,
                    },
                    {
                        value: 'overdue',
                        label: 'Jatuh Tempo',
                        count: visiblePayables.filter((payable) => payable.is_overdue).length,
                    },
                    {
                        value: 'paid',
                        label: 'Lunas',
                        count: visiblePayables.filter((payable) => payable.payment_status === 'paid').length,
                    },
                ]}
            />

            <Card>
                <CardContent className="p-0">
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
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                                        Belum ada data hutang. Klik "Catat Hutang" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((p) => (
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
                                                    ⚠ Lewat
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
