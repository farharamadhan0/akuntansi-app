import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
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
import { Plus, Eye, TrendingUp, ArrowUpCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface Transaction {
    id: number;
    transaction_number: string;
    date: string;
    amount: number;
    description: string;
    reference?: string;
    status: 'draft' | 'posted' | 'voided';
    status_label: string;
    status_color: string;
    cash_bank_name: string;
    cash_bank_type: string;
    category_name?: string;
    customer_name?: string;
}

interface Props {
    transactions: Transaction[];
}

const STATUS_FILTER = [
    { value: 'all', label: 'Semua' },
    { value: 'posted', label: 'Diposting' },
    { value: 'voided', label: 'Dibatalkan' },
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
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function Index({ transactions }: Props) {
    const [filter, setFilter] = useState<'all' | 'posted' | 'voided'>('all');

    const filtered =
        filter === 'all' ? transactions : transactions.filter((t) => t.status === filter);

    const totalPosted = transactions
        .filter((t) => t.status === 'posted')
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <AuthenticatedLayout>
            <Head title="Uang Masuk" />

            <Breadcrumb items={[
                { label: 'Transaksi' },
                { label: 'Uang Masuk' },
            ]} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="text-green-600" size={26} />
                        Uang Masuk
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Catat semua pemasukan ke kas atau rekening bank
                    </p>
                </div>
                <Link href="/transaksi/uang-masuk/catat">
                    <Button className="gap-2">
                        <Plus size={16} />
                        Catat Uang Masuk
                    </Button>
                </Link>
            </div>

            {/* Summary card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <ArrowUpCircle className="text-green-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Diposting</p>
                            <p className="text-lg font-bold text-green-700">
                                {formatCurrency(totalPosted)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <TrendingUp className="text-blue-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Jumlah Transaksi</p>
                            <p className="text-lg font-bold text-blue-700">
                                {transactions.filter((t) => t.status === 'posted').length} transaksi
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                {/* Filter tabs */}
                <div className="px-6 py-4 border-b flex items-center gap-2">
                    {STATUS_FILTER.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value as typeof filter)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                filter === f.value
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {f.label}
                            <span
                                className={`ml-1.5 text-xs ${filter === f.value ? 'text-gray-300' : 'text-gray-400'}`}
                            >
                                {f.value === 'all'
                                    ? transactions.length
                                    : transactions.filter((t) => t.status === f.value).length}
                            </span>
                        </button>
                    ))}
                </div>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>No. Transaksi</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead>Kas/Bank</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="py-12 text-center text-muted-foreground"
                                    >
                                        <TrendingUp
                                            size={40}
                                            className="mx-auto mb-2 text-gray-300"
                                        />
                                        <p>Belum ada transaksi uang masuk</p>
                                        <p className="text-sm mt-1">Klik "Catat Uang Masuk" untuk mencatat pemasukan pertama.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            {formatDate(t.date)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {t.transaction_number}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-sm">{t.description}</p>
                                            {t.reference && (
                                                <p className="text-xs text-muted-foreground">
                                                    Ref: {t.reference}
                                                </p>
                                            )}
                                            {t.customer_name && (
                                                <p className="text-xs text-muted-foreground">
                                                    {t.customer_name}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {t.cash_bank_name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {t.category_name ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-green-700 whitespace-nowrap">
                                            {formatCurrency(t.amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge[t.status]}`}
                                            >
                                                {t.status_label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Link href={`/transaksi/uang-masuk/${t.id}`}>
                                                <Button variant="ghost" size="sm" className="gap-1">
                                                    <Eye size={14} />
                                                    Detail
                                                </Button>
                                            </Link>
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
