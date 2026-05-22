import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { Plus, ShoppingCart, ArrowDownCircle } from 'lucide-react';
import { FilterTabs } from '@/components/ui/filter-tabs';

interface Purchase {
    id: number;
    purchase_number: string;
    date: string;
    due_date?: string | null;
    payment_type: string;
    payable_payment_status?: 'unpaid' | 'partial' | 'paid' | null;
    partner_name?: string | null;
    cash_bank_name?: string | null;
    total_amount: number;
    status: string;
    status_label: string;
}

interface Props {
    purchases: Purchase[];
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

function formatPaymentType(purchase: Purchase) {
    if (purchase.payment_type === 'cash') {
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

    const status = purchase.payable_payment_status ? statusLabel[purchase.payable_payment_status] : 'belum lunas';
    const statusColorClass = purchase.payable_payment_status ? statusColor[purchase.payable_payment_status] : 'bg-gray-100 text-gray-700';

     return (
        <div className='flex gap-2 items-center'>
            <span>Kredit</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${statusColorClass}`}>
                {status}
            </span>
        </div>
    );  
}

export default function Index({ purchases }: Props) {
    const { can } = usePermissions();
    const [filter, setFilter] = useState<'all' | 'posted' | 'voided'>('posted');

    const filtered =
        filter === 'all' ? purchases : purchases.filter((p) => p.status === filter);

    const totalPosted = purchases
        .filter((p) => p.status === 'posted')
        .reduce((sum, p) => sum + p.total_amount, 0);

    return (
        <AuthenticatedLayout>
            <Head title="Pembelian" />
            <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Pembelian' }]} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="text-emerald-600" size={26} />
                        Pembelian
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Catatan pembelian barang dan jasa.
                    </p>
                </div>
                {can('purchases.create') && (
                    <Link href="/transaksi/pembelian/buat">
                        <Button className="gap-2">
                            <Plus size={16} />
                            Buat Pembelian
                        </Button>
                    </Link>
                )}
            </div>

            {/* Summary card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <ArrowDownCircle className="text-emerald-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Pembelian</p>
                            <p className="text-lg font-bold text-emerald-700">
                                {formatCurrency(totalPosted)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <ShoppingCart className="text-blue-600" size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Jumlah Transaksi</p>
                            <p className="text-lg font-bold text-blue-700">
                                {purchases.filter((p) => p.status === 'posted').length} transaksi
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
                    { value: 'all', label: 'Semua', count: purchases.length },
                    { value: 'posted', label: 'Diposting', count: purchases.filter(p => p.status === 'posted').length },
                    { value: 'voided', label: 'Dibatalkan', count: purchases.filter(p => p.status === 'voided').length },
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
                                        <ShoppingCart size={40} className="mx-auto mb-2 text-gray-300" />
                                        <p>Belum ada pembelian</p>
                                        <p className="text-sm mt-1">Klik "Buat Pembelian" untuk mencatat pembelian pertama.</p>
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((purchase) => (
                                <TableRow key={purchase.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        <Link href={`/transaksi/pembelian/${purchase.id}`} className="font-mono text-sm text-primary hover:underline">
                                            {purchase.purchase_number}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                        {formatDate(purchase.date)}
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs text-muted-foreground">
                                            {purchase.partner_name ?? purchase.cash_bank_name ?? '-'}
                                        </p>
                                    </TableCell>
                                    <TableCell>{formatPaymentType(purchase)}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge[purchase.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {purchase.status_label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold whitespace-nowrap">
                                        {formatCurrency(purchase.total_amount)}
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
