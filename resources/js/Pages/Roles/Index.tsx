import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Plus, Pencil, Trash2, ShieldCheck, Crown, Lock, Users, ChevronDown } from 'lucide-react';

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

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedRoles {
    data: RoleRow[];
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
    roles: PaginatedRoles;
    permissionGroups: Record<string, PermissionGroup>;
    filters: {
        per_page: number;
    };
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
    const [expanded, setExpanded] = useState(false);
    const visibleLimit = 3;
    const canCollapse = summary.modules.length > visibleLimit;
    const visibleModules = canCollapse && !expanded
        ? summary.modules.slice(0, visibleLimit)
        : summary.modules;
    const hiddenCount = summary.modules.length - visibleLimit;

    if (summary.isAll) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <ShieldCheck size={11} />
                Semua akses
            </span>
        );
    }

    if (summary.modules.length === 0) {
        return <span className="text-xs text-gray-400">Tidak ada akses</span>;
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {visibleModules.map((m) => (
                <span
                    key={m.label}
                    title={`${m.count} dari ${m.total} aksi`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                        m.full
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                >
                    {m.label}
                    <span className={`text-[10px] font-normal ${m.full ? 'text-blue-500' : 'text-gray-400'}`}>
                        {m.count}/{m.total}
                    </span>
                </span>
            ))}
            {canCollapse && (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                >
                    {expanded ? 'Ringkas' : `+${hiddenCount} lagi`}
                    <ChevronDown
                        size={12}
                        className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                </button>
            )}
        </div>
    );
}

export default function Index({ roles, permissionGroups, filters }: Props) {
    const { flash } = usePage<PageFlash>().props;
    const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
    const perPage = filters?.per_page ?? 25;

    const handleDelete = (role: RoleRow) => {
        router.delete(`/pengaturan/role/${role.id}`, {
            onFinish: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Role" />

            <Breadcrumb items={[{ label: 'Pengaturan' }, { label: 'Role' }]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <ShieldCheck className="shrink-0 text-blue-500" size={26} />
                        Role
                    </h1>
                    <p className="mt-0.5 max-w-full text-sm text-gray-500">
                        Kelola role dan permission yang dapat diberikan kepada pengguna
                    </p>
                </div>
                <Link href="/pengaturan/role/tambah" className="w-full sm:w-auto">
                    <Button className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto">
                        <Plus size={18} className="shrink-0" />
                        <span className="truncate">Tambah Role</span>
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
                    {roles.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <ShieldCheck size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada role</p>
                            <p className="mt-1 text-sm">Klik "Tambah Role" untuk menambahkan role pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {roles.data.map((r) => (
                                    <div key={r.id} className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                    {r.is_owner ? (
                                                        <Crown size={14} className="shrink-0 text-amber-500" />
                                                    ) : r.is_system ? (
                                                        <Lock size={13} className="shrink-0 text-gray-400" />
                                                    ) : (
                                                        <ShieldCheck size={13} className="shrink-0 text-blue-400" />
                                                    )}
                                                    <p className="font-medium text-gray-800 [overflow-wrap:anywhere]">
                                                        {r.name}
                                                    </p>
                                                    {r.is_system && (
                                                        <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                                            default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Users size={13} className="text-gray-400" />
                                                    {r.users_count} pengguna
                                                </p>
                                            </div>
                                            {!r.is_system && (
                                                <div className="flex shrink-0 items-center gap-1">
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
                                        </div>

                                        <div className="mt-3">
                                            <PermissionBadges perms={r.permissions} groups={permissionGroups} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50/60">
                                            <th className="w-48 px-4 py-3 text-left font-medium text-gray-500">Nama</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500">Permission</th>
                                            <th className="w-28 px-4 py-3 text-center font-medium text-gray-500">Pengguna</th>
                                            <th className="w-20 px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {roles.data.map((r) => (
                                            <tr key={r.id} className="transition-colors hover:bg-gray-50/50">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        {r.is_owner ? (
                                                            <Crown size={14} className="shrink-0 text-amber-500" />
                                                        ) : r.is_system ? (
                                                            <Lock size={13} className="shrink-0 text-gray-400" />
                                                        ) : (
                                                            <ShieldCheck size={13} className="shrink-0 text-blue-400" />
                                                        )}
                                                        <span className="font-medium text-gray-800">{r.name}</span>
                                                        {r.is_system && (
                                                            <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
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
                                                        <span className="text-xs text-gray-300">-</span>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1">
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={roles} perPage={perPage} onPerPageChange={(val) => router.get('/pengaturan/role', { per_page: val }, { preserveState: true, replace: true })} />
                </CardContent>
            </Card>

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl sm:p-6">
                        <h3 className="mb-1 text-base font-semibold text-gray-900">Hapus Role</h3>
                        <p className="mb-5 text-sm text-gray-500">
                            Hapus role <strong className="text-gray-700">{deleteTarget.name}</strong>?
                            {deleteTarget.users_count > 0 && (
                                <>
                                    {' '}Role ini masih dipakai oleh{' '}
                                    <strong className="text-gray-700">{deleteTarget.users_count}</strong> pengguna -
                                    pindahkan dulu sebelum menghapus.
                                </>
                            )}
                        </p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteTarget(null)}>
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                className="w-full sm:w-auto"
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
