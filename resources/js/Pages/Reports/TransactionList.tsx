import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import ReportFilters from '@/components/reports/ReportFilters';
import { formatDateDDMMYYYY } from '@/lib/format';
import { ArrowDownCircle, ArrowUpCircle, List } from 'lucide-react';

interface Row {
    id: number;
    number: string;
    date: string;
    type: 'income' | 'expense' | 'transfer';
    type_label: string;
    description: string;
    category?: string;
    cash_bank?: string;
    amount: number;
    reference?: string;
}

interface Summary {
    total_income: number;
    total_expense: number;
    net: number;
}

interface Filters { from: string; to: string; type: string; }

interface Props { rows: Row[]; summary: Summary; filters: Filters; }

const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
const fmtDate = (d: string) => formatDateDDMMYYYY(d);

export default function TransactionList({ rows, summary, filters }: Props) {
    const [typeFilter, setTypeFilter] = useState(filters.type);

    const applyTypeFilter = (type: string) => {
        setTypeFilter(type);
        router.get('/laporan/transaksi', { from: filters.from, to: filters.to, type }, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Laporan – Daftar Transaksi" />

            <Breadcrumb items={[{ label: 'Laporan' }, { label: 'Daftar Transaksi' }]} />

            <div className="flex items-center gap-2 mb-5">
                <List className="text-blue-500" size={22} />
                <h1 className="text-xl font-bold text-gray-900">Daftar Transaksi</h1>
            </div>

            <ReportFilters url="/laporan/transaksi" from={filters.from} to={filters.to}
                extra={
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Jenis</label>
                        <select
                            className="h-10 rounded-md border border-input px-3 text-sm"
                            value={typeFilter}
                            onChange={(e) => applyTypeFilter(e.target.value)}
                        >
                            <option value="">Semua</option>
                            <option value="income">Uang Masuk</option>
                            <option value="expense">Uang Keluar</option>
                        </select>
                    </div>
                }
            />

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <ArrowUpCircle className="text-green-500" size={22} />
                        <div>
                            <p className="text-xs text-gray-500">Total Masuk</p>
                            <p className="font-bold text-green-600">{fmt(summary.total_income)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <ArrowDownCircle className="text-red-500" size={22} />
                        <div>
                            <p className="text-xs text-gray-500">Total Keluar</p>
                            <p className="font-bold text-red-600">{fmt(summary.total_expense)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Selisih Bersih</p>
                        <p className={`font-bold text-lg ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {fmt(summary.net)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. Transaksi</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead>Akun</TableHead>
                                <TableHead>Kas/Bank</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                                        Tidak ada transaksi pada periode ini. Ubah filter tanggal untuk melihat data lain.
                                    </TableCell>
                                </TableRow>
                            ) : rows.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono text-xs text-gray-500">
                                        <Link href={`/transaksi/${r.type === 'income' ? 'uang-masuk' : 'uang-keluar'}/${r.id}`}
                                            className="hover:underline text-blue-600">
                                            {r.number}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{fmtDate(r.date)}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${r.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.type_label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="max-w-48 truncate">{r.description}</TableCell>
                                    <TableCell>{r.category ?? '-'}</TableCell>
                                    <TableCell>{r.cash_bank ?? '-'}</TableCell>
                                    <TableCell className={`text-right font-medium ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {fmt(r.amount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
