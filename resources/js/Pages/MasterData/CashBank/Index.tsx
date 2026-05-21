import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    account: { code: string; name: string };
}

export default function Index({ accounts }: { accounts: CashBankAccount[] }) {
    const { can } = usePermissions();
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

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kas & Bank</h1>
                    <p className="text-gray-600">Kelola akun kas dan rekening bank</p>
                </div>
                {can('cash_bank.create') && (
                    <Link href="/master/kas-bank/tambah">
                        <Button>
                            <Plus size={18} />
                            Tambah Akun
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Bank / No. Rek</TableHead>
                                <TableHead className="text-right">Saldo Saat Ini</TableHead>
                                <TableHead className='w-10'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        Belum ada akun kas/bank. Klik "Tambah Akun" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accounts.map((account) => (
                                    <TableRow key={account.id} className={!account.is_active ? 'opacity-60' : ''}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${account.type === 'cash' ? 'bg-green-100' : 'bg-blue-100'}`}>
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
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
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
