import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { usePermissions } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Truck, Search, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface Supplier {
    id: number;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    is_active: boolean;
}

interface Props {
    suppliers: Supplier[];
    filters: { search?: string; status?: string };
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function Index({ suppliers, filters }: Props) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search ?? '');
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
    const activeFilter = filters.status ?? 'active';

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/master/supplier', { search, status: activeFilter }, { preserveState: true, replace: true });
    };

    const handleStatusFilter = (status: string) => {
        router.get('/master/supplier', { search, status }, { preserveState: true, replace: true });
    };

    const handleToggle = (supplier: Supplier) => {
        router.post(`/master/supplier/${supplier.id}/toggle`, {}, { preserveScroll: true });
    };

    const handleDelete = (supplier: Supplier) => {
        router.delete(`/master/supplier/${supplier.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Data Supplier" />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Supplier' },
            ]} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="text-orange-500" size={26} />
                        Data Supplier
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Kelola daftar supplier usaha Anda
                    </p>
                </div>
                {can('suppliers.create') && (
                    <Link href="/master/supplier/tambah">
                        <Button className="gap-1.5">
                            <Plus size={18} />
                            Tambah Supplier
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Cari nama, kode, telepon..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="outline">Cari</Button>
                </form>
                <div className="flex gap-2">
                    {(['all', 'active', 'inactive'] as const).map((s) => (
                        <Button
                            key={s}
                            variant={activeFilter === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusFilter(s)}
                        >
                            {s === 'all' && 'Semua'}
                            {s === 'active' && 'Aktif'}
                            {s === 'inactive' && 'Nonaktif'}
                        </Button>
                    ))}
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kode</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Telepon</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                                        Belum ada data supplier. Klik "Tambah Supplier" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                suppliers.map((s) => (
                                    <TableRow key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
                                        <TableCell className="font-mono text-sm">
                                            <Link
                                                href={`/master/supplier/${s.id}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {s.code || 'Tanpa kode'}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell className="text-gray-500">{s.email || '-'}</TableCell>
                                        <TableCell className="text-gray-500">{s.phone || '-'}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {can('suppliers.edit') && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/master/supplier/${s.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil size={15} />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('suppliers.edit') && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleToggle(s)}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {s.is_active
                                                                ? <><ToggleRight size={15} className="text-green-600" />Nonaktifkan</>
                                                                : <><ToggleLeft size={15} className="text-gray-400" />Aktifkan</>
                                                            }
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('suppliers.delete') && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteTarget(s)}
                                                                className="flex items-center gap-2 text-red-500 focus:text-red-500 focus:bg-red-50"
                                                            >
                                                                <Trash2 size={15} />
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold mb-2">Hapus Supplier</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Hapus supplier <strong>{deleteTarget.name}</strong>? Supplier yang masih memiliki hutang aktif tidak dapat dihapus.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                Batal
                            </Button>
                            <Button variant="destructive" onClick={() => handleDelete(deleteTarget)}>
                                Hapus
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
