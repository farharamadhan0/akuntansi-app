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
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useState } from "react";

interface Category {
    id: number;
    name: string;
    type: 'income' | 'expense';
    description?: string;
    is_active: boolean;
    account?: { code: string; name: string };
}

const FILTERS = [
    { value: "all", label: "Semua" },
    { value: "income", label: "Pemasukan" },
    { value: "expense", label: "Pengeluaran" },
];

export default function Index({ categories }: { categories: Category[] }) {
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

    const handleDelete = (id: number) => {
        if (confirm("Yakin ingin menghapus kategori ini? Kategori yang sudah digunakan dalam transaksi tidak dapat dihapus.")) {
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
            <Head title="Kategori Transaksi" />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Kategori' },
            ]} />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Kategori Transaksi
                    </h1>
                    <p className="text-gray-600">
                        Kelola kategori pemasukan dan pengeluaran
                    </p>
                </div>
                <Link href="/master/kategori/tambah">
                    <Button>
                        <Plus size={18} />
                        Tambah Kategori
                    </Button>
                </Link>
            </div>

            <Card>
                <div className="px-6 py-4 border-b flex items-center gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value as 'all' | 'income' | 'expense')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                filter === f.value
                                    ? "bg-gray-900 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {f.label}
                            <span
                                className={`ml-1.5 text-xs ${filter === f.value ? "text-gray-300" : "text-gray-400"}`}
                            >
                                {f.value === "all"
                                    ? categories.length
                                    : categories.filter(
                                          (c) => c.type === f.value,
                                      ).length}
                            </span>
                        </button>
                    ))}
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Kategori</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Akun Buku Besar</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        Belum ada kategori. Klik "Tambah Kategori" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((cat) => (
                                    <TableRow key={cat.id}>
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
                                        <TableCell className="text-muted-foreground">
                                            <p>{cat.account?.name}</p>
                                            <p className="text-xs text-muted-foreground">{cat.account?.code}</p>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                cat.is_active
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-100 text-gray-600"
                                            }`}>
                                                {cat.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-1">
                                                <Link href={`/master/kategori/${cat.id}/edit`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Pencil size={16} />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleToggle(cat.id)}
                                                >
                                                    {cat.is_active ? (
                                                        <ToggleRight size={16} className="text-green-600" />
                                                    ) : (
                                                        <ToggleLeft size={16} className="text-gray-400" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(cat.id)}
                                                >
                                                    <Trash2 size={16} />
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
        </AuthenticatedLayout>
    );
}
