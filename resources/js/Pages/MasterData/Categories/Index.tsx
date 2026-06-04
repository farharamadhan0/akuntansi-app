import { Head, Link, router } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
    Plus,
    Pencil,
    Trash2,
    ToggleLeft,
    ToggleRight,
    MoreVertical,
    Tags,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FilterTabs } from "@/components/ui/filter-tabs";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { usePermissions } from "@/lib/permissions";

interface Category {
    id: number;
    name: string;
    type: "income" | "expense";
    description?: string;
    is_active: boolean;
}

interface Summary {
    count_all: number;
    count_income: number;
    count_expense: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedCategories {
    data: Category[];
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
    categories: PaginatedCategories;
    summary: Summary;
    filters: {
        type: "all" | "income" | "expense";
        per_page: number;
    };
}

type FilterType = "all" | "income" | "expense";

export default function Index({ categories, summary, filters }: Props) {
    const { can } = usePermissions();
    const filter = filters?.type ?? "all";
    const perPage = filters?.per_page ?? 25;

    const handleDelete = (id: number) => {
        if (confirm("Yakin ingin menghapus kategori ini? Kategori yang sudah digunakan dalam transaksi tidak dapat dihapus.")) {
            router.delete(`/master/kategori/${id}`);
        }
    };

    const handleToggle = (id: number) => {
        router.post(`/master/kategori/${id}/toggle`);
    };

    const navigate = (overrides: Record<string, string | number>) => {
        router.get(
            "/master/kategori",
            { type: filter, per_page: perPage, ...overrides },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Kategori Transaksi" />

            <Breadcrumb items={[
                { label: "Master Data" },
                { label: "Kategori Transaksi" },
            ]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Tags className="shrink-0 text-purple-600" size={26} />
                        Kategori Transaksi
                    </h1>
                    <p className="mt-0.5 max-w-full text-sm text-gray-600">
                        Kelola kategori pemasukan dan pengeluaran
                    </p>
                </div>
                {can("accounts.create") && (
                    <Link href="/master/kategori/tambah" className="w-full sm:w-auto">
                        <Button className="w-full min-w-0 justify-center gap-2 overflow-hidden sm:w-auto">
                            <Plus size={18} className="shrink-0" />
                            <span className="truncate">Tambah Kategori</span>
                        </Button>
                    </Link>
                )}
            </div>

            <FilterTabs<FilterType>
                className="mb-4"
                value={filter}
                onChange={(value) => navigate({ type: value })}
                items={[
                    { value: "all", label: "Semua", count: summary.count_all },
                    { value: "income", label: "Pemasukan", count: summary.count_income },
                    { value: "expense", label: "Pengeluaran", count: summary.count_expense },
                ]}
            />

            <Card>
                <CardContent className="p-0">
                    {categories.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <Tags size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada kategori</p>
                            <p className="mt-1 text-sm">Klik "Tambah Kategori" untuk menambahkan kategori pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {categories.data.map((cat) => (
                                    <div key={cat.id} className={`p-4 ${!cat.is_active ? "opacity-60" : ""}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                                                    {cat.name}
                                                </p>
                                                {cat.description && (
                                                    <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                                        {cat.description}
                                                    </p>
                                                )}
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="shrink-0">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {can("accounts.edit") && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/master/kategori/${cat.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil size={15} />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can("accounts.edit") && (
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
                                                    {can("accounts.delete") && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(cat.id)}
                                                                className="flex items-center gap-2 text-red-500 focus:bg-red-50 focus:text-red-500"
                                                            >
                                                                <Trash2 size={15} />
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                                cat.type === "income"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}>
                                                {cat.type === "income" ? "Pemasukan" : "Pengeluaran"}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${cat.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                                {cat.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Kategori</TableHead>
                                            <TableHead>Jenis</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categories.data.map((cat) => (
                                            <TableRow key={cat.id} className={!cat.is_active ? "opacity-60" : ""}>
                                                <TableCell>
                                                    <p className="font-medium">{cat.name}</p>
                                                    {cat.description && (
                                                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                                        cat.type === "income"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}>
                                                        {cat.type === "income" ? "Pemasukan" : "Pengeluaran"}
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
                                                            {can("accounts.edit") && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/master/kategori/${cat.id}/edit`} className="flex items-center gap-2">
                                                                        <Pencil size={15} />
                                                                        Edit
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {can("accounts.edit") && (
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
                                                            {can("accounts.delete") && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(cat.id)}
                                                                        className="flex items-center gap-2 text-red-500 focus:bg-red-50 focus:text-red-500"
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <Pagination transactions={categories} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
