import { Head, Link, router, usePage } from '@inertiajs/react';
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
import { Plus, Pencil, Trash2, ShieldCheck, Crown, Lock } from 'lucide-react';

interface RoleRow {
    id: number;
    name: string;
    permissions: string[];
    is_system: boolean;
    is_owner: boolean;
    users_count: number;
}

interface PermissionGroup {
    label: string;
    actions: Record<string, string>;
}

interface Props {
    roles: RoleRow[];
    permissionGroups: Record<string, PermissionGroup>;
}

interface PageFlash {
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

function summarizePermissions(
    perms: string[],
    groups: Record<string, PermissionGroup>,
): string {
    if (perms.includes('*')) return 'Semua akses';
    if (perms.length === 0) return '—';

    const byModule: Record<string, number> = {};
    for (const p of perms) {
        const [mod] = p.split('.');
        byModule[mod] = (byModule[mod] ?? 0) + 1;
    }

    return Object.entries(byModule)
        .map(([mod, count]) => {
            const total = groups[mod]
                ? Object.keys(groups[mod].actions).length
                : count;
            const label = groups[mod]?.label ?? mod;
            return `${label} (${count}/${total})`;
        })
        .join(', ');
}

export default function Index({ roles, permissionGroups }: Props) {
    const { flash } = usePage<PageFlash>().props;
    const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);

    const handleDelete = (role: RoleRow) => {
        router.delete(`/pengaturan/role/${role.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Role" />

            <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Role' }]} />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="text-blue-500" size={26} />
                        Role
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Kelola role dan permission yang dapat diberikan kepada pengguna
                    </p>
                </div>
                <Link href="/pengaturan/role/tambah">
                    <Button className="gap-1.5">
                        <Plus size={18} />
                        Tambah Role
                    </Button>
                </Link>
            </div>

            {flash?.error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {flash.error}
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Permission</TableHead>
                                <TableHead className="w-28 text-right">Pengguna</TableHead>
                                <TableHead className="w-24">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                                        Belum ada role.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {r.is_owner && <Crown size={14} className="text-amber-500" />}
                                                {!r.is_owner && r.is_system && <Lock size={13} className="text-gray-400" />}
                                                {r.name}
                                                {r.is_system && (
                                                    <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                                        bawaan
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {summarizePermissions(r.permissions, permissionGroups)}
                                        </TableCell>
                                        <TableCell className="text-right text-gray-600">
                                            {r.users_count}
                                        </TableCell>
                                        <TableCell>
                                            {r.is_system ? (
                                                <span className="text-xs text-gray-400">—</span>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <Link href={`/pengaturan/role/${r.id}/edit`}>
                                                        <Button variant="ghost" size="sm" title="Edit">
                                                            <Pencil size={15} />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteTarget(r)}
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={15} className="text-red-500" />
                                                    </Button>
                                                </div>
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
                        <h3 className="text-lg font-semibold mb-2">Hapus Role</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Hapus role <strong>{deleteTarget.name}</strong>?
                            {deleteTarget.users_count > 0 && (
                                <>
                                    {' '}Role ini masih dipakai oleh{' '}
                                    <strong>{deleteTarget.users_count}</strong> pengguna —
                                    pindahkan dulu sebelum menghapus.
                                </>
                            )}
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleDelete(deleteTarget)}
                            >
                                Hapus
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
