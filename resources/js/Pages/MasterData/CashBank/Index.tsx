import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Wallet, Building } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface CashBankAccount {
    id: number;
    name: string;
    type: 'cash' | 'bank';
    type_label: string;
    bank_name?: string;
    account_number?: string;
    opening_balance: number;
    is_active: boolean;
    account_code: string;
    account: { code: string; name: string };
}

export default function Index({ accounts }: { accounts: CashBankAccount[] }) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const handleDelete = (id: number) => {
        if (confirm('Yakin ingin menghapus akun ini?')) {
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
                <Link href="/master/kas-bank/tambah">
                    <Button>
                        <Plus size={18} />
                        Tambah Akun
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Bank / No. Rek</TableHead>
                                <TableHead className="text-right">Saldo Awal</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        Belum ada akun kas/bank
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accounts.map((account) => (
                                    <TableRow key={account.id}>
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
                                            {formatCurrency(account.opening_balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                account.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {account.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-1">
                                                <Link href={`/master/kas-bank/${account.id}/edit`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Pencil size={16} />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleToggle(account.id)}
                                                >
                                                    {account.is_active ? (
                                                        <ToggleRight size={16} className="text-green-600" />
                                                    ) : (
                                                        <ToggleLeft size={16} className="text-gray-400" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(account.id)}
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
