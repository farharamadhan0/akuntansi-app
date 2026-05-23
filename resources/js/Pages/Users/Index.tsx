import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
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

interface Props {
    members: Member[];
    roles: Role[];
    can_add_member: boolean;
}

export default function Index({ members, can_add_member }: Props) {
    const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

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

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UsersIcon className="text-blue-500" size={26} />
                        Pengguna
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
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
                            {members.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                                        Belum ada pengguna.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.map((m) => (
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
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                                                m.is_owner
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                {m.is_owner && <Crown size={12} />}
                                                {m.role_name}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {m.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${m.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-600'}`}>
                                                {m.is_verified ? 'Terverifikasi' : 'Belum'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                            {m.last_login
                                                ? new Date(m.last_login * 1000).toLocaleString('id-ID', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })
                                                : <span className="text-gray-300">—</span>
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
                                                                    className="flex items-center gap-2 text-red-500 focus:text-red-500 focus:bg-red-50"
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
                </CardContent>
            </Card>

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold mb-2">Hapus Pengguna</h3>
                        <p className="text-sm text-gray-600 mb-4">
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
