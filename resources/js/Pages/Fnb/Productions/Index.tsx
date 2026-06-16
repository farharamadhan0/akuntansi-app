import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { ClipboardList, Plus } from 'lucide-react';

interface ProductRef {
    id: number;
    product_code: string;
    name: string;
    unit: string;
}

interface Production {
    id: number;
    production_number: string;
    date: string;
    product: ProductRef;
    actual_yield_quantity: number;
    unit: string;
    total_input_cost: number;
    unit_cost: number;
    status: string;
    status_label: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedProductions {
    data: Production[];
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
    productions: PaginatedProductions;
    filters: {
        per_page: number;
    };
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function statusClass(status: string) {
    const classes: Record<string, string> = {
        posted: 'bg-green-100 text-green-700',
        draft: 'bg-amber-100 text-amber-700',
        voided: 'bg-red-100 text-red-700',
    };

    return classes[status] ?? 'bg-gray-100 text-gray-600';
}

export default function Index({ productions, filters }: Props) {
    const { can } = usePermissions();
    const perPage = filters?.per_page ?? 25;

    return (
        <AuthenticatedLayout>
            <Head title="Produksi / Prep" />
            <Breadcrumb items={[{ label: 'F&B' }, { label: 'Produksi / Prep' }]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <ClipboardList className="shrink-0 text-emerald-600" size={24} />
                        Produksi / Prep
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Ubah bahan mentah menjadi stok hasil olahan.</p>
                </div>
                {can('productions.create') && (
                    <Link href="/fnb/produksi/buat" className="w-full sm:w-auto">
                        <Button className="w-full gap-2 sm:w-auto">
                            <Plus size={16} />
                            Buat Produksi
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {productions.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <ClipboardList size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada produksi/prep</p>
                            <p className="mt-1 text-sm">Buat produksi pertama dari resep aktif yang outputnya menggunakan stok.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No. Produksi</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Produk Hasil</TableHead>
                                        <TableHead className="text-right">Hasil</TableHead>
                                        <TableHead className="text-right">Total Cost</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productions.data.map((production) => (
                                        <TableRow key={production.id}>
                                            <TableCell>
                                                <Link href={`/fnb/produksi/${production.id}`} className="font-mono text-blue-600 hover:underline">
                                                    {production.production_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{production.date}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-gray-900">{production.product.name}</div>
                                                <div className="font-mono text-xs text-muted-foreground">{production.product.product_code}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {Number(production.actual_yield_quantity).toFixed(2)} {production.unit}
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(production.total_input_cost)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(production.unit_cost)}</TableCell>
                                            <TableCell>
                                                <span className={`rounded-full px-2 py-1 text-xs ${statusClass(production.status)}`}>
                                                    {production.status_label}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <Pagination transactions={productions} perPage={perPage} onPerPageChange={(val) => router.get('/fnb/produksi', { per_page: val }, { preserveState: true, replace: true })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
