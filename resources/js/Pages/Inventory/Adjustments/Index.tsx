import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateDDMMYYYY } from '@/lib/format';
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

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedAdjustments {
    data: Adjustment[];
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
    adjustments: PaginatedAdjustments;
    filters: {
        per_page: number;
    };
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string) {
    return formatDateDDMMYYYY(dateStr);
}

export default function Index({ adjustments, filters }: Props) {
    const { can } = usePermissions();
    const perPage = filters?.per_page ?? 25;

    function navigate(overrides: Record<string, number>) {
        router.get(
            '/transaksi/stok-penyesuaian',
            { per_page: perPage, ...overrides },
            { preserveScroll: true, replace: true },
        );
    }

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
                            {adjustments.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        Belum ada penyesuaian stok.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                adjustments.data.map((adjustment) => (
                                    <TableRow key={adjustment.id}>
                                        <TableCell>
                                            <Link href={`/transaksi/stok-penyesuaian/${adjustment.id}`} className="font-mono text-sm text-primary hover:underline">
                                                {adjustment.adjustment_number}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{formatDate(adjustment.date)}</TableCell>
                                        <TableCell>{adjustment.notes || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadge[adjustment.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {adjustment.status_label}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination transactions={adjustments} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
