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

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Boxes className="shrink-0 text-rose-600" size={24} />
                        Penyesuaian Stok
                    </h1>
                    <p className="mt-1 max-w-full text-sm text-muted-foreground">Koreksi stok fisik terhadap saldo sistem.</p>
                </div>
                {can('inventory_adjustments.create') && (
                    <Link href="/transaksi/stok-penyesuaian/buat" className="w-full sm:w-auto">
                        <Button className="w-full min-w-0 justify-center gap-2 overflow-hidden sm:w-auto">
                            <Plus size={16} className="shrink-0" />
                            <span className="truncate">Buat Penyesuaian</span>
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {adjustments.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <Boxes size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada penyesuaian stok</p>
                            <p className="mt-1 text-sm">Klik "Buat Penyesuaian" untuk mencatat koreksi stok pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {adjustments.data.map((adjustment) => (
                                    <Link
                                        key={adjustment.id}
                                        href={`/transaksi/stok-penyesuaian/${adjustment.id}`}
                                        className="block p-4 transition-colors hover:bg-gray-50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-sm text-primary">
                                                    {adjustment.adjustment_number}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatDate(adjustment.date)}
                                                </p>
                                            </div>
                                            <span className={`inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusBadge[adjustment.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {adjustment.status_label}
                                            </span>
                                        </div>

                                        <p className="mt-3 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                            {adjustment.notes || '-'}
                                        </p>
                                    </Link>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
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
                                        {adjustments.data.map((adjustment) => (
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={adjustments} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
