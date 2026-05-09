import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { Eye, Plus, ScanLine } from 'lucide-react';

interface Sale {
    id: number;
    sale_number: string;
    date: string;
    due_date?: string | null;
    payment_type: string;
    receivable_payment_status?: 'unpaid' | 'partial' | 'paid' | null;
    customer_name?: string | null;
    cash_bank_name?: string | null;
    total_amount: number;
}

interface Props {
    sales: Sale[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
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

    return (
        <AuthenticatedLayout>
            <Head title="Penjualan" />
            <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Penjualan' }]} />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <ScanLine className="text-blue-600" size={24} />
                        Penjualan
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Catatan penjualan barang dan jasa.</p>
                </div>
                {can('sales.create') && (
                    <Link href="/transaksi/penjualan/buat">
                        <Button className="gap-2"><Plus size={16} />Buat Penjualan</Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nomor</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Partner</TableHead>
                                <TableHead>Pembayaran</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada penjualan.</TableCell></TableRow>
                            ) : sales.map((sale) => (
                                <TableRow key={sale.id}>
                                    <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                                    <TableCell>{sale.date}</TableCell>
                                    <TableCell>{sale.customer_name ?? sale.cash_bank_name ?? '-'}</TableCell>
                                    <TableCell>{formatPaymentType(sale)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(sale.total_amount)}</TableCell>
                                    <TableCell className="flex justify-center">
                                        <Link href={`/transaksi/penjualan/${sale.id}`}>
                                            <Button variant="ghost" size="sm">
                                                <Eye size={16} />
                                            </Button>
                                        </Link>
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
