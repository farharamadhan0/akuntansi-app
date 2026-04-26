import { Head, Link } from '@inertiajs/react';
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
import { Plus, Eye, Banknote } from 'lucide-react';

interface Payment {
    id: number;
    payment_number: string;
    supplier_name: string;
    cash_bank_name: string;
    date: string;
    amount: number;
    description: string;
    status: 'draft' | 'posted' | 'voided';
    status_label: string;
}

interface Props {
    payments: Payment[];
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
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function Index({ payments }: Props) {
    const { can } = usePermissions();
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
                        Riwayat pembayaran hutang ke pemasok
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
                                <TableHead>Pemasok</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Dibayar dari</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                                        Belum ada pembayaran hutang. Klik "Catat Pembayaran" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payments.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-mono text-sm">
                                            {p.payment_number}
                                        </TableCell>
                                        <TableCell className="font-medium">{p.supplier_name}</TableCell>
                                        <TableCell>{formatDate(p.date)}</TableCell>
                                        <TableCell>{p.cash_bank_name}</TableCell>
                                        <TableCell className="text-right font-medium text-orange-600">
                                            {formatCurrency(p.amount)}
                                        </TableCell>
                                        <TableCell>{statusBadge(p.status, p.status_label)}</TableCell>
                                        <TableCell>
                                            <Link href={`/transaksi/hutang-bayar/${p.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <Eye size={16} />
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
