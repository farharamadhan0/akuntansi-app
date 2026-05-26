import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import ReportFilters from '@/components/reports/ReportFilters';
import { formatDateDDMMYYYY } from '@/lib/format';
import { Users, AlertTriangle } from 'lucide-react';

interface Row {
    id: number;
    number: string;
    customer: string;
    date: string;
    due_date: string;
    amount: number;
    paid_amount: number;
    remaining: number;
    payment_status: string;
    payment_status_label: string;
    is_overdue: boolean;
    description: string;
}

interface Summary { total_amount: number; total_paid: number; total_remaining: number; total_overdue: number; }
interface Filters { from: string; to: string; payment_status: string; }
interface Props { rows: Row[]; summary: Summary; filters: Filters; }

const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
const fmtDate = (d: string) => formatDateDDMMYYYY(d);

const statusColors: Record<string, string> = {
    unpaid: 'bg-red-100 text-red-700',
    partial: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
};

export default function ReceivableList({ rows, summary, filters }: Props) {
    const [statusFilter, setStatusFilter] = useState(filters.payment_status);

    const applyStatus = (s: string) => {
        setStatusFilter(s);
        router.get('/laporan/piutang', { from: filters.from, to: filters.to, payment_status: s }, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Laporan – Daftar Piutang" />

            <Breadcrumb items={[{ label: 'Laporan' }, { label: 'Daftar Piutang' }]} />

            <div className="flex items-center gap-2 mb-5">
                <Users className="text-blue-500" size={22} />
                <h1 className="text-xl font-bold text-gray-900">Daftar Piutang</h1>
            </div>

            <ReportFilters url="/laporan/piutang" from={filters.from} to={filters.to}
                extra={
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Status Bayar</label>
                        <select
                            className="h-10 rounded-md border border-input px-3 text-sm"
                            value={statusFilter}
                            onChange={(e) => applyStatus(e.target.value)}
                        >
                            <option value="">Semua</option>
                            <option value="unpaid">Belum Bayar</option>
                            <option value="partial">Sebagian</option>
                            <option value="paid">Lunas</option>
                        </select>
                    </div>
                }
            />

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                    { label: 'Total Piutang', value: summary.total_amount, color: 'text-gray-900' },
                    { label: 'Sudah Diterima', value: summary.total_paid, color: 'text-green-600' },
                    { label: 'Sisa Piutang', value: summary.total_remaining, color: 'text-blue-600' },
                    { label: 'Lewat Jatuh Tempo', value: summary.total_overdue, color: 'text-red-600' },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardContent className="p-4">
                            <p className="text-xs text-gray-500">{s.label}</p>
                            <p className={`font-bold text-lg ${s.color}`}>{fmt(s.value)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. Piutang</TableHead>
                                <TableHead>Pelanggan</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Jatuh Tempo</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Sisa</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                                        Tidak ada data piutang pada periode ini. Ubah filter untuk melihat data lain.
                                    </TableCell>
                                </TableRow>
                            ) : rows.map((r) => (
                                <TableRow key={r.id} className={r.is_overdue ? 'bg-red-50' : ''}>
                                    <TableCell className="font-mono text-xs text-gray-500">
                                        <Link href={`/transaksi/piutang/${r.id}`} className="hover:underline text-blue-600">
                                            {r.number}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="font-medium">{r.customer}</TableCell>
                                    <TableCell>{fmtDate(r.date)}</TableCell>
                                    <TableCell>
                                        <span className={r.is_overdue ? 'text-red-600 font-medium' : ''}>
                                            {fmtDate(r.due_date)}
                                        </span>
                                        {r.is_overdue && <AlertTriangle size={13} className="inline ml-1 text-red-500" />}
                                    </TableCell>
                                    <TableCell className="text-right">{fmt(r.amount)}</TableCell>
                                    <TableCell className="text-right font-medium text-blue-600">{fmt(r.remaining)}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[r.payment_status]}`}>
                                            {r.payment_status_label}
                                        </span>
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
