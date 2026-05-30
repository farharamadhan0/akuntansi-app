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

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Kategori Transaksi
                    </h1>
                    <p className="text-gray-600">
                        Kelola kategori pemasukan dan pengeluaran
                    </p>
                </div>
                {can("accounts.create") && (
                    <Link href="/master/kategori/tambah">
                        <Button>
                            <Plus size={18} />
                            Tambah Kategori
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Kategori</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                                        Belum ada kategori. Klik "Tambah Kategori" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.data.map((cat) => (
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination transactions={categories} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
