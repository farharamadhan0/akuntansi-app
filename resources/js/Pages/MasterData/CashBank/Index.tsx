import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Wallet, Building, MoreVertical } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { usePermissions } from '@/lib/permissions';

interface CashBankAccount {
    id: number;
    name: string;
    type: 'cash' | 'bank';
    type_label: string;
    bank_name?: string;
    account_number?: string;
    current_balance: number;
    is_active: boolean;
    account_code: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedCashBankAccounts {
    data: CashBankAccount[];
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
    accounts: PaginatedCashBankAccounts;
    filters: {
        per_page: number;
    };
}

export default function Index({ accounts, filters }: Props) {
    const { can } = usePermissions();
    const perPage = filters?.per_page ?? 25;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const handleDelete = (id: number) => {
        if (confirm('Yakin ingin menghapus akun kas/bank ini? Akun yang sudah digunakan dalam transaksi tidak dapat dihapus.')) {
            router.delete(`/master/kas-bank/${id}`);
        }
    };

    const handleToggle = (id: number) => {
        router.post(`/master/kas-bank/${id}/toggle`);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Kas & Bank" />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Kas & Bank' },
            ]} />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Wallet className="shrink-0 text-green-600" size={26} />
                        Kas & Bank
                    </h1>
                    <p className="mt-0.5 max-w-full text-sm text-gray-600">Kelola akun kas dan rekening bank</p>
                </div>
                {can('cash_bank.create') && (
                    <Link href="/master/kas-bank/tambah" className="w-full sm:w-auto">
                        <Button className="w-full min-w-0 justify-center gap-2 overflow-hidden sm:w-auto">
                            <Plus size={18} className="shrink-0" />
                            <span className="truncate">Tambah Akun</span>
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {accounts.data.length === 0 ? (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <Wallet size={40} className="mx-auto mb-2 text-gray-300" />
                            <p>Belum ada akun kas/bank</p>
                            <p className="mt-1 text-sm">Klik "Tambah Akun" untuk menambahkan akun pertama.</p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {accounts.data.map((account) => (
                                    <div key={account.id} className={`p-4 ${!account.is_active ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                                <div className={`shrink-0 rounded-lg p-2 ${account.type === 'cash' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                                    {account.type === 'cash' ? (
                                                        <Wallet size={18} className="text-green-600" />
                                                    ) : (
                                                        <Building size={18} className="text-blue-600" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">{account.name}</p>
                                                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{account.account_code}</p>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="shrink-0">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {can('cash_bank.edit') && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/master/kas-bank/${account.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil size={15} />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('cash_bank.edit') && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggle(account.id)}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {account.is_active
                                                                ? <><ToggleRight size={15} className="text-green-600" />Nonaktifkan</>
                                                                : <><ToggleLeft size={15} className="text-gray-400" />Aktifkan</>
                                                            }
                                                        </DropdownMenuItem>
                                                    )}
                                                    {can('cash_bank.delete') && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(account.id)}
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
                                                account.type === 'cash'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {account.type_label}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${account.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {account.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex items-start justify-between gap-3">
                                            <div className="min-w-0 text-xs text-muted-foreground">
                                                <p>Bank / No. Rek</p>
                                                {account.bank_name ? (
                                                    <div className="mt-1">
                                                        <p className="font-medium text-gray-700 [overflow-wrap:anywhere]">{account.bank_name}</p>
                                                        {account.account_number && (
                                                            <p className="mt-0.5 [overflow-wrap:anywhere]">{account.account_number}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="mt-1 font-medium text-gray-700">-</p>
                                                )}
                                            </div>
                                            <div className="min-w-0 text-right text-xs text-muted-foreground">
                                                <p>Saldo Saat Ini</p>
                                                <p className="mt-1 font-semibold text-gray-900 [overflow-wrap:anywhere]">
                                                    {formatCurrency(account.current_balance)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>Jenis</TableHead>
                                            <TableHead>Bank / No. Rek</TableHead>
                                            <TableHead className="text-right">Saldo Saat Ini</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {accounts.data.map((account) => (
                                            <TableRow key={account.id} className={!account.is_active ? 'opacity-60' : ''}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`rounded-lg p-2 ${account.type === 'cash' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                                            {account.type === 'cash' ? (
                                                                <Wallet size={18} className="text-green-600" />
                                                            ) : (
                                                                <Building size={18} className="text-blue-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{account.name}</p>
                                                            <p className="text-xs text-muted-foreground">{account.account_code}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                                        account.type === 'cash'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {account.type_label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {account.bank_name ? (
                                                        <div>
                                                            <p>{account.bank_name}</p>
                                                            {account.account_number && (
                                                                <p className="text-xs text-muted-foreground">{account.account_number}</p>
                                                            )}
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(account.current_balance)}
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreVertical size={16} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {can('cash_bank.edit') && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/master/kas-bank/${account.id}/edit`} className="flex items-center gap-2">
                                                                        <Pencil size={15} />
                                                                        Edit
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}
                                                            {can('cash_bank.edit') && (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleToggle(account.id)}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    {account.is_active
                                                                        ? <><ToggleRight size={15} className="text-green-600" />Nonaktifkan</>
                                                                        : <><ToggleLeft size={15} className="text-gray-400" />Aktifkan</>
                                                                    }
                                                                </DropdownMenuItem>
                                                            )}
                                                            {can('cash_bank.delete') && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(account.id)}
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
                    <Pagination transactions={accounts} perPage={perPage} onPerPageChange={(val) => router.get('/master/kas-bank', { per_page: val }, { preserveState: true, replace: true })} />
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
