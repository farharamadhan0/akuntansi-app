import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { usePermissions } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Download, MoreVertical, Pencil, Plus, Search, ToggleLeft, ToggleRight, Trash2, Upload, Users } from 'lucide-react';
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

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedPartners {
    data: Partner[];
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

interface Filters {
    search?: string;
    status?: string;
    type?: string;
    per_page: number;
}

interface Props {
    partners: PaginatedPartners;
    filters: Filters;
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
    const [importType, setImportType] = useState<'customer' | 'supplier' | null>(null);
    const perPage = filters?.per_page ?? 25;
    const {
        data: importData,
        setData: setImportData,
        post: postImport,
        processing: importing,
        errors: importErrors,
        reset: resetImport,
        clearErrors: clearImportErrors,
    } = useForm<{ file: File | null }>({
        file: null,
    });

    const buildQuery = (overrides: Partial<Filters>) => ({
        search,
        status: filters.status,
        type: filters.type,
        per_page: perPage,
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

    const closeImportModal = () => {
        setImportType(null);
        resetImport('file');
        clearImportErrors();
    };

    const submitImport = (event: FormEvent) => {
        event.preventDefault();

        if (!importType) return;

        postImport(`/master/mitra/import/${importType}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: closeImportModal,
        });
    };

    const activeStatus = filters.status ?? 'active';
    const activeType = filters.type ?? 'all';
    const importTitle = importType === 'customer' ? 'Import Pelanggan' : 'Import Supplier';
    const importDescription = importType === 'customer'
        ? 'Gunakan CSV template pelanggan. Jika ada satu baris gagal validasi, seluruh import dibatalkan.'
        : 'Gunakan CSV template supplier. Jika ada satu baris gagal validasi, seluruh import dibatalkan.';

    return (
        <AuthenticatedLayout>
            <Head title="Data Mitra" />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Mitra' },
            ]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Users className="shrink-0 text-blue-500" size={26} />
                        Data Mitra
                    </h1>
                    <p className="mt-0.5 max-w-full text-sm text-gray-500">
                        Kelola daftar mitra (pelanggan & supplier) perusahaan
                    </p>
                </div>
                {can('partners.create') && (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto"
                            onClick={() => setImportType('customer')}
                        >
                            <Upload size={16} className="shrink-0" />
                            <span className="truncate">Import Customer</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto"
                            onClick={() => setImportType('supplier')}
                        >
                            <Upload size={16} className="shrink-0" />
                            <span className="truncate">Import Supplier</span>
                        </Button>
                        <Link href="/master/mitra/tambah" className="w-full sm:w-auto">
                            <Button className="w-full min-w-0 justify-center gap-1.5 overflow-hidden sm:w-auto">
                                <Plus size={18} className="shrink-0" />
                                <span className="truncate">Tambah Mitra</span>
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <div className="mb-4 flex flex-col gap-3">
                <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1 sm:max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Cari nama, kode, telepon, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="outline" className="w-full sm:w-auto">Cari</Button>
                </form>

                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="w-full text-xs font-medium text-gray-500 sm:w-auto">Tipe:</span>
                        {(['all', 'customer', 'supplier'] as const).map((t) => (
                            <Button
                                key={t}
                                variant={activeType === t ? 'default' : 'outline'}
                                size="sm"
                                className="min-w-0"
                                onClick={() => handleTypeFilter(t)}
                            >
                                {t === 'all' ? 'Semua' : typeLabel[t]}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="w-full text-xs font-medium text-gray-500 sm:w-auto">Status:</span>
                        {(['all', 'active', 'inactive'] as const).map((s) => (
                            <Button
                                key={s}
                                variant={activeStatus === s ? 'default' : 'outline'}
                                size="sm"
                                className="min-w-0"
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
                    {partners.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <Users size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada data mitra</p>
                            <p className="mt-1 text-sm">Klik "Tambah Mitra" untuk menambahkan mitra pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {partners.data.map((p) => (
                                    <div key={p.id} className={`p-4 ${!p.is_active ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <Link href={`/master/mitra/${p.id}`} className="min-w-0 flex-1">
                                                <p className="truncate font-mono text-sm text-primary">
                                                    {p.code || 'Tanpa kode'}
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                                    {p.name}
                                                </p>
                                            </Link>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="shrink-0">
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
                                                                className="flex items-center gap-2 text-red-500 focus:bg-red-50 focus:text-red-500"
                                                            >
                                                                <Trash2 size={14} />
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {p.types.length === 0 ? (
                                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Tanpa tipe</span>
                                            ) : (
                                                p.types.map((t) => (
                                                    <span
                                                        key={t}
                                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${typeBadgeClass[t] ?? 'bg-slate-100 text-slate-700'}`}
                                                    >
                                                        {typeLabel[t] ?? t}
                                                    </span>
                                                ))
                                            )}
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {p.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </div>

                                        {(p.email || p.phone) && (
                                            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                                {p.email && <p className="[overflow-wrap:anywhere]">Email: {p.email}</p>}
                                                {p.phone && <p className="[overflow-wrap:anywhere]">Telepon: {p.phone}</p>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
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
                                        {partners.data.map((p) => (
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
                                                                        className="flex items-center gap-2 text-red-500 focus:bg-red-50 focus:text-red-500"
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={partners} perPage={perPage} onPerPageChange={(val) => router.get('/master/mitra', buildQuery({ per_page: val }), { preserveState: true, replace: true })} />
                </CardContent>
            </Card>

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-2 text-lg font-semibold">Hapus Mitra</h3>
                        <p className="mb-4 text-sm text-gray-600">
                            Hapus mitra <strong>{deleteTarget.name}</strong>? Mitra yang masih memiliki piutang atau hutang aktif tidak dapat dihapus.
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
            {importType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={submitImport} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-2 text-lg font-semibold">{importTitle}</h3>
                        <p className="mb-4 text-sm text-gray-600">{importDescription}</p>

                        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                            <a
                                href={`/master/mitra/template-import/${importType}`}
                                className={buttonVariants({
                                    variant: 'outline',
                                    className: 'w-full justify-center gap-2 sm:w-auto',
                                })}
                            >
                                <Download size={16} />
                                Template CSV
                            </a>
                        </div>

                        <label className="block text-sm font-medium text-gray-700" htmlFor="partner-import-file">
                            File CSV
                        </label>
                        <input
                            id="partner-import-file"
                            type="file"
                            accept=".csv,text/csv"
                            className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:h-8 file:border file:border-border file:bg-background file:px-3 file:text-xs file:font-medium"
                            onChange={(event) => setImportData('file', event.target.files?.[0] ?? null)}
                        />
                        {importData.file && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                {importData.file.name}
                            </p>
                        )}
                        {importErrors.file && (
                            <div className="mt-3 max-h-40 overflow-auto whitespace-pre-line rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                {importErrors.file}
                            </div>
                        )}

                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeImportModal} disabled={importing}>
                                Batal
                            </Button>
                            <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={importing}>
                                <Upload size={16} />
                                {importing ? 'Mengimport...' : 'Import'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
