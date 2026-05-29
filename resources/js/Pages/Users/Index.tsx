import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Plus, Pencil, Trash2, Users as UsersIcon, Crown, MoreVertical } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Member {
    id: number;
    user_id: number;
    name: string;
    email: string;
    role_id: number;
    role_name: string;
    is_active: boolean;
    is_owner: boolean;
    is_self: boolean;
    is_verified: boolean;
    last_login: number | null;
}

interface Role {
    id: number;
    name: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedMembers {
    data: Member[];
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
    members: PaginatedMembers;
    roles: Role[];
    can_add_member: boolean;
    filters: {
        per_page: number;
    };
}

export default function Index({ members, can_add_member, filters }: Props) {
    const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
    const perPage = filters?.per_page ?? 25;

    const handleDelete = (member: Member) => {
        router.delete(`/pengaturan/pengguna/${member.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pengguna" />

            <Breadcrumb items={[
                { label: 'Pengaturan' },
                { label: 'Pengguna' },
            ]} />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <UsersIcon className="text-blue-500" size={26} />
                        Pengguna
                    </h1>
                    <p className="mt-0.5 text-sm text-gray-500">
                        Kelola pengguna yang memiliki akses ke perusahaan ini
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Link href={can_add_member ? '/pengaturan/pengguna/tambah' : '#'}
                        onClick={(e) => !can_add_member && e.preventDefault()}
                    >
                        <Button className="gap-1.5" disabled={!can_add_member}>
                            <Plus size={18} />
                            Tambah Pengguna
                        </Button>
                    </Link>
                    {!can_add_member && (
                        <p className="text-xs text-gray-400">Batas maksimal 3 pengguna tercapai</p>
                    )}
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Verified</TableHead>
                                <TableHead>Terakhir Login</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-gray-400">
                                        Belum ada pengguna.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.data.map((m) => (
                                    <TableRow key={m.id} className={!m.is_active ? 'opacity-60' : ''}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {m.name}
                                                {m.is_self && (
                                                    <span className="text-xs text-gray-400">(Anda)</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{m.email}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                                                m.is_owner
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                {m.is_owner && <Crown size={12} />}
                                                {m.role_name}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-0.5 text-xs ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {m.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-0.5 text-xs ${m.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-600'}`}>
                                                {m.is_verified ? 'Terverifikasi' : 'Belum'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-xs text-gray-500">
                                            {m.last_login
                                                ? new Date(m.last_login * 1000).toLocaleString('id-ID', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })
                                                : <span className="text-gray-300">-</span>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {m.is_owner ? (
                                                <span className="text-xs text-gray-400"></span>
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical size={16} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/pengaturan/pengguna/${m.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil size={14} />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {!m.is_self && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => setDeleteTarget(m)}
                                                                    className="flex items-center gap-2 text-red-500 focus:bg-red-50 focus:text-red-500"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Hapus
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination transactions={members} perPage={perPage} onPerPageChange={(val) => router.get('/pengaturan/pengguna', { per_page: val }, { preserveState: true, replace: true })} />
                </CardContent>
            </Card>

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="mb-2 text-lg font-semibold">Hapus Pengguna</h3>
                        <p className="mb-4 text-sm text-gray-600">
                            Hapus pengguna <strong>{deleteTarget.name}</strong> dari perusahaan ini? Akun pengguna tidak dihapus, hanya keanggotaannya.
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
