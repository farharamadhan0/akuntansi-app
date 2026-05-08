import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { Plus, ShoppingCart } from 'lucide-react';

interface Purchase {
    id: number;
    purchase_number: string;
    date: string;
    due_date?: string | null;
    payment_type: string;
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchases.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada pembelian.</TableCell></TableRow>
                            ) : purchases.map((purchase) => (
                                <TableRow key={purchase.id}>
                                    <TableCell><Link href={`/transaksi/pembelian/${purchase.id}`} className="font-mono text-sm text-primary hover:underline">{purchase.purchase_number}</Link></TableCell>
                                    <TableCell>{purchase.date}</TableCell>
                                    <TableCell>{purchase.supplier_name ?? purchase.cash_bank_name ?? '-'}</TableCell>
                                    <TableCell>{purchase.payment_type === 'cash' ? 'Tunai' : 'Kredit'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(purchase.total_amount)}</TableCell>
                                    <TableCell>{purchase.status_label}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
