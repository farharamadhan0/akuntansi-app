import { Head, Link, router } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
    Plus,
    Pencil,
    Trash2,
    ToggleLeft,
    ToggleRight,
    MoreVertical,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FilterTabs } from "@/components/ui/filter-tabs";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { usePermissions } from "@/lib/permissions";
import { useState } from "react";

interface Category {
    id: number;
    name: string;
    type: 'income' | 'expense';
    description?: string;
    is_active: boolean;
}

export default function Index({ categories }: { categories: Category[] }) {
    const { can } = usePermissions();
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

    const handleDelete = (id: number) => {
        if (confirm("Yakin ingin menghapus akun ini? Akun yang sudah digunakan dalam transaksi tidak dapat dihapus.")) {
            router.delete(`/master/kategori/${id}`);
        }
    };

    const handleToggle = (id: number) => {
        router.post(`/master/kategori/${id}/toggle`);
    };

    const filtered =
        filter === "all"
            ? categories
            : categories.filter((c) => c.type === filter);

    return (
        <AuthenticatedLayout>
            <Head title="Daftar Akun" />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Daftar Akun' },
            ]} />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Daftar Akun
                    </h1>
                    <p className="text-gray-600">
                        Kelola akun pemasukan dan pengeluaran
                    </p>
                </div>
                {can('accounts.create') && (
                    <Link href="/master/kategori/tambah">
                        <Button>
                            <Plus size={18} />
                            Tambah Akun
                        </Button>
                    </Link>
                )}
            </div>

            <FilterTabs<'all' | 'income' | 'expense'>
                className="mb-4"
                value={filter}
                onChange={setFilter}
                items={[
                    { value: 'all', label: 'Semua', count: categories.length },
                    { value: 'income', label: 'Pemasukan', count: categories.filter(c => c.type === 'income').length },
                    { value: 'expense', label: 'Pengeluaran', count: categories.filter(c => c.type === 'expense').length },
                ]}
            />

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Akun</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead className='w-10'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                                        Belum ada akun. Klik "Tambah Akun" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((cat) => (
                                    <TableRow key={cat.id} className={!cat.is_active ? 'opacity-60' : ''}>
                                        <TableCell>
                                            <p className="font-medium">{cat.name}</p>
                                            {cat.description && (
                                                <p className="text-xs text-muted-foreground">{cat.description}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                cat.type === "income"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}>
                                                {cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {can('accounts.edit') && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/master/kategori/${cat.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil size={15} />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('accounts.edit') && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleToggle(cat.id)}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {cat.is_active
                                                                ? <><ToggleRight size={15} className="text-green-600" />Nonaktifkan</>
                                                                : <><ToggleLeft size={15} className="text-gray-400" />Aktifkan</>
                                                            }
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('accounts.delete') && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(cat.id)}
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
        </AuthenticatedLayout>
    );
}
