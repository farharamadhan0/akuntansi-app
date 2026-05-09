import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { Eye, Plus, ShoppingCart } from 'lucide-react';

interface Purchase {
    id: number;
    purchase_number: string;
    date: string;
    due_date?: string | null;
    payment_type: string;
    payable_payment_status?: 'unpaid' | 'partial' | 'paid' | null;
    supplier_name?: string | null;
    cash_bank_name?: string | null;
    total_amount: number;
    status: string;
    status_label: string;
}

interface Props {
    purchases: Purchase[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
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

    return (
        <AuthenticatedLayout>
            <Head title="Pembelian" />
            <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Pembelian' }]} />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <ShoppingCart className="text-emerald-600" size={24} />
                        Pembelian
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Catatan pembelian barang dan jasa.</p>
                </div>
                {can('purchases.create') && (
                    <Link href="/transaksi/pembelian/buat">
                        <Button className="gap-2"><Plus size={16} />Buat Pembelian</Button>
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
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchases.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada pembelian.</TableCell></TableRow>
                            ) : purchases.map((purchase) => (
                                <TableRow key={purchase.id}>
                                    <TableCell>{purchase.purchase_number}</TableCell>
                                    <TableCell>{purchase.date}</TableCell>
                                    <TableCell>{purchase.supplier_name ?? purchase.cash_bank_name ?? '-'}</TableCell>
                                    <TableCell>{formatPaymentType(purchase)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(purchase.total_amount)}</TableCell>
                                    <TableCell>{purchase.status_label}</TableCell>
                                    <TableCell className="flex justify-center">
                                        <Link href={`/transaksi/pembelian/${purchase.id}`}>
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
