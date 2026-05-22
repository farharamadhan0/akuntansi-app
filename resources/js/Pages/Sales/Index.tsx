import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { Plus, ScanLine, TrendingUp } from 'lucide-react';
import { FilterTabs } from '@/components/ui/filter-tabs';

interface Sale {
    id: number;
    sale_number: string;
    date: string;
    due_date?: string | null;
    payment_type: string;
    receivable_payment_status?: 'unpaid' | 'partial' | 'paid' | null;
    partner_name?: string | null;
    cash_bank_name?: string | null;
    total_amount: number;
    status: string;
    status_label: string;
}

interface Props {
    sales: Sale[];
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function formatPaymentType(sale: Sale) {
    if (sale.payment_type === 'cash') {
        return 'Tunai';
    }

    const statusLabel: Record<'unpaid' | 'partial' | 'paid', string> = {
        unpaid: 'belum lunas',
        partial: 'lunas sebagian',
        paid: 'lunas',
    };

    const statusColor: Record<'unpaid' | 'partial' | 'paid', string> = {
        'unpaid': 'bg-red-100 text-red-700',
        'partial': 'bg-yellow-100 text-yellow-700',
        'paid': 'bg-green-100 text-green-700',
    };

    const status = sale.receivable_payment_status ? statusLabel[sale.receivable_payment_status] : 'belum lunas';
    const statusColorClass = sale.receivable_payment_status ? statusColor[sale.receivable_payment_status] : 'bg-gray-100 text-gray-700';

     return (
        <div className='flex gap-2 items-center'>
            <span>Kredit</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${statusColorClass}`}>
                {status}
            </span>
        </div>
    );  
}

export default function Index({ sales }: Props) {
    const { can } = usePermissions();
    const [filter, setFilter] = useState<'all' | 'posted' | 'voided'>('posted');

    const filtered =
        filter === 'all' ? sales : sales.filter((s) => s.status === filter);

    const totalPosted = sales
        .filter((s) => s.status === 'posted')
        .reduce((sum, s) => sum + s.total_amount, 0);

    return (
        <AuthenticatedLayout>
            <Head title="Penjualan" />
            <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Penjualan' }]} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ScanLine className="text-blue-600" size={26} />
                        Penjualan
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Catatan penjualan barang dan jasa.
                    </p>
                </div>
                {can('sales.create') && (
                    <Link href="/transaksi/penjualan/buat">
                        <Button className="gap-2">
                            <Plus size={16} />
                            Buat Penjualan
                        </Button>
                    </Link>
                )}
            </div>

            {/* Summary card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <TrendingUp className="text-blue-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Penjualan</p>
                            <p className="text-lg font-bold text-blue-700">
                                {formatCurrency(totalPosted)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <ScanLine className="text-indigo-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Jumlah Transaksi</p>
                            <p className="text-lg font-bold text-indigo-700">
                                {sales.filter((s) => s.status === 'posted').length} transaksi
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <FilterTabs<'all' | 'posted' | 'voided'>
                className="mb-4"
                value={filter}
                onChange={setFilter}
                items={[
                    { value: 'all', label: 'Semua', count: sales.length },
                    { value: 'posted', label: 'Diposting', count: sales.filter(s => s.status === 'posted').length },
                    { value: 'voided', label: 'Dibatalkan', count: sales.filter(s => s.status === 'voided').length },
                ]}
            />

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nomor</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Mitra</TableHead>
                                <TableHead>Pembayaran</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                        <ScanLine size={40} className="mx-auto mb-2 text-gray-300" />
                                        <p>Belum ada penjualan</p>
                                        <p className="text-sm mt-1">Klik "Buat Penjualan" untuk mencatat penjualan pertama.</p>
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((sale) => (
                                <TableRow key={sale.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        <Link href={`/transaksi/penjualan/${sale.id}`} className="font-mono text-sm text-primary hover:underline">
                                            {sale.sale_number}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                        {formatDate(sale.date)}
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs text-muted-foreground">
                                            {sale.partner_name ?? sale.cash_bank_name ?? '-'}
                                        </p>
                                    </TableCell>
                                    <TableCell>{formatPaymentType(sale)}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge[sale.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {sale.status_label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold whitespace-nowrap">
                                        {formatCurrency(sale.total_amount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
