import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { Boxes, Plus } from 'lucide-react';

interface Adjustment {
    id: number;
    adjustment_number: string;
    date: string;
    notes?: string | null;
    status: string;
    status_label: string;
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
};

interface Props {
    adjustments: Adjustment[];
}

export default function Index({ adjustments }: Props) {
    const { can } = usePermissions();

    return (
        <AuthenticatedLayout>
            <Head title="Penyesuaian Stok" />
            <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Penyesuaian Stok' }]} />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Boxes className="text-rose-600" size={24} />
                        Penyesuaian Stok
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Koreksi stok fisik terhadap saldo sistem.</p>
                </div>
                {can('inventory_adjustments.create') && (
                    <Link href="/transaksi/stok-penyesuaian/buat">
                        <Button className="gap-2"><Plus size={16} />Buat Penyesuaian</Button>
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
                                <TableHead>Catatan</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {adjustments.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Belum ada penyesuaian stok.</TableCell></TableRow>
                            ) : adjustments.map((adjustment) => (
                                <TableRow key={adjustment.id}>
                                    <TableCell><Link href={`/transaksi/stok-penyesuaian/${adjustment.id}`} className="font-mono text-sm text-primary hover:underline">{adjustment.adjustment_number}</Link></TableCell>
                                    <TableCell>{adjustment.date}</TableCell>
                                    <TableCell>{adjustment.notes || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge[adjustment.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {adjustment.status_label}
                                        </span></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
