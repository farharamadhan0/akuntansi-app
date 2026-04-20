import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
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
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users, Search } from 'lucide-react';

interface Customer {
    id: number;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    is_active: boolean;
    outstanding_receivables: number;
}

interface Props {
    customers: Customer[];
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

export default function Index({ customers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/master/pelanggan', { search, status: filters.status }, { preserveState: true, replace: true });
    };

    const handleStatusFilter = (status: string) => {
        router.get('/master/pelanggan', { search, status }, { preserveState: true, replace: true });
    };

    const handleToggle = (customer: Customer) => {
        router.post(`/master/pelanggan/${customer.id}/toggle`, {}, { preserveScroll: true });
    };

    const handleDelete = (customer: Customer) => {
        router.delete(`/master/pelanggan/${customer.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    const activeFilter = filters.status ?? '';

    return (
        <AuthenticatedLayout>
            <Head title="Data Pelanggan" />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Pelanggan' },
            ]} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-500" size={26} />
                        Data Pelanggan
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Kelola daftar pelanggan perusahaan
                    </p>
                </div>
                <Link href="/master/pelanggan/tambah">
                    <Button className="gap-1.5">
                        <Plus size={18} />
                        Tambah Pelanggan
                    </Button>
                </Link>
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
                    {(['', 'active', 'inactive'] as const).map((s) => (
                        <Button
                            key={s}
                            variant={activeFilter === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusFilter(s)}
                        >
                            {s === '' && 'Semua'}
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
                                <TableHead className="text-right">Piutang Aktif</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-24">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                                        Belum ada data pelanggan. Klik "Tambah Pelanggan" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map((c) => (
                                    <TableRow key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
                                        <TableCell className="font-mono text-sm text-gray-500">
                                            {c.code || '-'}
                                        </TableCell>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell className="text-gray-500">{c.email || '-'}</TableCell>
                                        <TableCell className="text-gray-500">{c.phone || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            {c.outstanding_receivables > 0 ? (
                                                <span className="text-blue-600 font-medium">
                                                    {formatCurrency(c.outstanding_receivables)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {c.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Link href={`/master/pelanggan/${c.id}/edit`}>
                                                    <Button variant="ghost" size="sm" title="Edit">
                                                        <Pencil size={15} />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggle(c)}
                                                    title={c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {c.is_active
                                                        ? <ToggleRight size={15} className="text-green-600" />
                                                        : <ToggleLeft size={15} className="text-gray-400" />
                                                    }
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteTarget(c)}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={15} className="text-red-500" />
                                                </Button>
                                            </div>
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
                        <h3 className="text-lg font-semibold mb-2">Hapus Pelanggan</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Hapus pelanggan <strong>{deleteTarget.name}</strong>? Pelanggan yang masih memiliki piutang aktif tidak dapat dihapus.
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
