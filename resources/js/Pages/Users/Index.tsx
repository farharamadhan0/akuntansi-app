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

    const formatLastLogin = (lastLogin: number | null) => {
        return lastLogin
            ? new Date(lastLogin * 1000).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })
            : null;
    };

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

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <UsersIcon className="shrink-0 text-blue-500" size={26} />
                        Pengguna
                    </h1>
                    <p className="mt-0.5 max-w-full text-sm text-gray-500">
                        Kelola pengguna yang memiliki akses ke perusahaan ini
                    </p>
                </div>
                <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
                    <Link href={can_add_member ? '/pengaturan/pengguna/tambah' : '#'}
                        className="w-full sm:w-auto"
                        onClick={(e) => !can_add_member && e.preventDefault()}
                    >
                        <Button className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto" disabled={!can_add_member}>
                            <Plus size={18} className="shrink-0" />
                            <span className="truncate">Tambah Pengguna</span>
                        </Button>
                    </Link>
                    {!can_add_member && (
                        <p className="text-xs text-gray-400">Batas maksimal 3 pengguna tercapai</p>
                    )}
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {members.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <UsersIcon size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada pengguna</p>
                            <p className="mt-1 text-sm">Klik "Tambah Pengguna" untuk menambahkan pengguna pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {members.data.map((m) => (
                                    <div key={m.id} className={`p-4 ${!m.is_active ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                                        {m.name}
                                                    </p>
                                                    {m.is_self && (
                                                        <span className="text-xs text-gray-400">(Anda)</span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                                    {m.email}
                                                </p>
                                            </div>
                                            {m.is_owner ? (
                                                <span className="shrink-0 text-xs text-gray-400"></span>
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="shrink-0">
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
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                                m.is_owner
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                {m.is_owner && <Crown size={12} />}
                                                {m.role_name}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {m.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${m.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-600'}`}>
                                                {m.is_verified ? 'Terverifikasi' : 'Belum'}
                                            </span>
                                        </div>

                                        <div className="mt-3 text-xs text-muted-foreground">
                                            <p>
                                                Terakhir login:{' '}
                                                {formatLastLogin(m.last_login) ?? <span className="text-gray-300">-</span>}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
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
                                        {members.data.map((m) => (
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
                                                    {formatLastLogin(m.last_login) ?? <span className="text-gray-300">-</span>}
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={members} perPage={perPage} onPerPageChange={(val) => router.get('/pengaturan/pengguna', { per_page: val }, { preserveState: true, replace: true })} />
                </CardContent>
            </Card>

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-2 text-lg font-semibold">Hapus Pengguna</h3>
                        <p className="mb-4 text-sm text-gray-600">
                            Hapus pengguna <strong>{deleteTarget.name}</strong> dari perusahaan ini? Akun pengguna tidak dihapus, hanya keanggotaannya.
                        </p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteTarget(null)}>
                                Batal
                            </Button>
                            <Button variant="destructive" className="w-full sm:w-auto" onClick={() => handleDelete(deleteTarget)}>
                                Hapus
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
