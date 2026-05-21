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
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users, Search, MoreVertical } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Partner {
    id: number;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    is_active: boolean;
    types: string[];
}

interface Props {
    partners: Partner[];
    filters: { search?: string; status?: string; type?: string };
}

const typeLabel: Record<string, string> = {
    customer: 'Pelanggan',
    supplier: 'Supplier',
};

const typeBadgeClass: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-700',
    supplier: 'bg-amber-100 text-amber-700',
};

export default function Index({ partners, filters }: Props) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search ?? '');
    const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);

    const buildQuery = (overrides: Partial<Props['filters']>) => ({
        search,
        status: filters.status,
        type: filters.type,
        ...overrides,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/master/mitra', buildQuery({ search }), { preserveState: true, replace: true });
    };

    const handleStatusFilter = (status: string) => {
        router.get('/master/mitra', buildQuery({ status }), { preserveState: true, replace: true });
    };

    const handleTypeFilter = (type: string) => {
        router.get('/master/mitra', buildQuery({ type }), { preserveState: true, replace: true });
    };

    const handleToggle = (partner: Partner) => {
        router.post(`/master/mitra/${partner.id}/toggle`, {}, { preserveScroll: true });
    };

    const handleDelete = (partner: Partner) => {
        router.delete(`/master/mitra/${partner.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    const activeStatus = filters.status ?? 'active';
    const activeType = filters.type ?? 'all';

    return (
        <AuthenticatedLayout>
            <Head title="Data Mitra" />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Mitra' },
            ]} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-500" size={26} />
                        Data Mitra
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Kelola daftar mitra (pelanggan & supplier) perusahaan
                    </p>
                </div>
                {can('partners.create') && (
                    <Link href="/master/mitra/tambah">
                        <Button className="gap-1.5">
                            <Plus size={18} />
                            Tambah Mitra
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 mb-4">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Cari nama, kode, telepon, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="outline">Cari</Button>
                </form>

                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Tipe:</span>
                        {(['all', 'customer', 'supplier'] as const).map((t) => (
                            <Button
                                key={t}
                                variant={activeType === t ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleTypeFilter(t)}
                            >
                                {t === 'all' ? 'Semua' : typeLabel[t]}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Status:</span>
                        {(['all', 'active', 'inactive'] as const).map((s) => (
                            <Button
                                key={s}
                                variant={activeStatus === s ? 'default' : 'outline'}
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
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kode</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Telepon</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {partners.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                                        Belum ada data mitra. Klik "Tambah Mitra" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                partners.map((p) => (
                                    <TableRow key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                                        <TableCell className="font-mono text-sm">
                                            <Link
                                                href={`/master/mitra/${p.id}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {p.code || 'Tanpa kode'}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {p.types.length === 0 ? (
                                                    <span className="text-xs text-gray-400">-</span>
                                                ) : (
                                                    p.types.map((t) => (
                                                        <span
                                                            key={t}
                                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass[t] ?? 'bg-slate-100 text-slate-700'}`}
                                                        >
                                                            {typeLabel[t] ?? t}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{p.email || '-'}</TableCell>
                                        <TableCell className="text-gray-500">{p.phone || '-'}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {can('partners.edit') && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/master/mitra/${p.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil size={14} />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('partners.edit') && (
                                                        <DropdownMenuItem onClick={() => handleToggle(p)} className="flex items-center gap-2">
                                                            {p.is_active
                                                                ? <><ToggleRight size={14} className="text-green-600" /> Nonaktifkan</>
                                                                : <><ToggleLeft size={14} className="text-gray-400" /> Aktifkan</>
                                                            }
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('partners.delete') && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteTarget(p)}
                                                                className="flex items-center gap-2 text-red-500 focus:text-red-500 focus:bg-red-50"
                                                            >
                                                                <Trash2 size={14} />
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
                        <h3 className="text-lg font-semibold mb-2">Hapus Mitra</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Hapus mitra <strong>{deleteTarget.name}</strong>? Mitra yang masih memiliki piutang atau hutang aktif tidak dapat dihapus.
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
