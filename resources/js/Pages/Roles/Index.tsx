import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Plus, Pencil, Trash2, ShieldCheck, Crown, Lock, Users } from 'lucide-react';

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

interface PermissionSummary {
    isAll: boolean;
    modules: { label: string; count: number; total: number; full: boolean }[];
}

function getPermissionSummary(
    perms: string[],
    groups: Record<string, PermissionGroup>,
): PermissionSummary {
    if (perms.includes('*')) return { isAll: true, modules: [] };
    if (perms.length === 0) return { isAll: false, modules: [] };

    const byModule: Record<string, number> = {};
    for (const p of perms) {
        const [mod] = p.split('.');
        byModule[mod] = (byModule[mod] ?? 0) + 1;
    }

    const modules = Object.entries(byModule).map(([mod, count]) => {
        const total = groups[mod] ? Object.keys(groups[mod].actions).length : count;
        const label = groups[mod]?.label ?? mod;
        return { label, count, total, full: count === total };
    });

    return { isAll: false, modules };
}

function PermissionBadges({ perms, groups }: { perms: string[]; groups: Record<string, PermissionGroup> }) {
    const summary = getPermissionSummary(perms, groups);

    if (summary.isAll) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                <ShieldCheck size={11} />
                Semua akses
            </span>
        );
    }

    if (summary.modules.length === 0) {
        return <span className="text-gray-400 text-xs">Tidak ada akses</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {summary.modules.map((m) => (
                <span
                    key={m.label}
                    title={`${m.count} dari ${m.total} aksi`}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
                        m.full
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                >
                    {m.label}
                    <span className={`text-[10px] font-normal ${m.full ? 'text-blue-500' : 'text-gray-400'}`}>
                        {m.count}/{m.total}
                    </span>
                </span>
            ))}
        </div>
    );
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50/60">
                                    <th className="text-left px-4 py-3 font-medium text-gray-500 w-48">Nama</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">Permission</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-500 w-28">Pengguna</th>
                                    <th className="px-4 py-3 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {roles.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center text-gray-400 py-12 text-sm">
                                            Belum ada role.
                                        </td>
                                    </tr>
                                ) : (
                                    roles.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    {r.is_owner ? (
                                                        <Crown size={14} className="text-amber-500 shrink-0" />
                                                    ) : r.is_system ? (
                                                        <Lock size={13} className="text-gray-400 shrink-0" />
                                                    ) : (
                                                        <ShieldCheck size={13} className="text-blue-400 shrink-0" />
                                                    )}
                                                    <span className="font-medium text-gray-800">{r.name}</span>
                                                    {r.is_system && (
                                                        <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                                                            default
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <PermissionBadges perms={r.permissions} groups={permissionGroups} />
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="inline-flex items-center gap-1 text-gray-500">
                                                    <Users size={13} className="text-gray-400" />
                                                    {r.users_count}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {r.is_system ? (
                                                    <span className="text-xs text-gray-300">—</span>
                                                ) : (
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <Link href={`/pengaturan/role/${r.id}/edit`}>
                                                            <Button variant="ghost" size="sm" title="Edit" className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600">
                                                                <Pencil size={14} />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeleteTarget(r)}
                                                            title="Hapus"
                                                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Hapus Role</h3>
                        <p className="text-sm text-gray-500 mb-5">
                            Hapus role <strong className="text-gray-700">{deleteTarget.name}</strong>?
                            {deleteTarget.users_count > 0 && (
                                <>
                                    {' '}Role ini masih dipakai oleh{' '}
                                    <strong className="text-gray-700">{deleteTarget.users_count}</strong> pengguna —
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
