import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, XCircle, AlertTriangle, Banknote } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface JournalLine {
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
}

interface JournalEntry {
    entry_number: string;
    date: string;
    description: string;
    status: string;
    lines: JournalLine[];
}

interface Customer {
    id: number;
    name: string;
    code?: string;
    phone?: string;
    email?: string;
}

interface Receivable {
    id: number;
    receivable_number: string;
    customer: Customer;
    category_name?: string;
    date: string;
    due_date: string;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    description: string;
    reference?: string;
    status: 'draft' | 'posted' | 'voided';
    status_label: string;
    payment_status: 'unpaid' | 'partial' | 'paid';
    payment_status_label: string;
    is_overdue: boolean;
    posted_at?: string;
    voided_at?: string;
    void_reason?: string;
    created_by_name?: string;
}

interface Props {
    receivable: Receivable;
    journalEntries: JournalEntry[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function Show({ receivable: r, journalEntries }: Props) {
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [voiding, setVoiding] = useState(false);

    const handleVoid = () => {
        if (!voidReason.trim()) return;
        setVoiding(true);
        router.post(
            `/transaksi/piutang/${r.id}/batal`,
            { reason: voidReason },
            { onFinish: () => setVoiding(false) }
        );
    };

    const statusBadge = () => {
        if (r.status === 'voided') {
            return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Dibatalkan</span>;
        }
        const colors: Record<string, string> = {
            unpaid: 'bg-red-100 text-red-700',
            partial: 'bg-yellow-100 text-yellow-700',
            paid: 'bg-green-100 text-green-700',
        };
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colors[r.payment_status]}`}>
                {r.payment_status_label}
            </span>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Piutang – ${r.receivable_number}`} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Piutang', href: '/transaksi/piutang' },
                    { label: 'Detail' },
                ]} />

                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="text-blue-600" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Detail Piutang</h1>
                            <p className="text-sm font-mono text-muted-foreground">
                                {r.receivable_number}
                            </p>
                        </div>
                    </div>
                    {statusBadge()}
                </div>

                {/* Overdue Warning */}
                {r.is_overdue && r.status === 'posted' && (
                    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 flex items-center gap-2">
                        <AlertTriangle className="text-red-600" size={18} />
                        <span className="text-sm text-red-700 font-medium">
                            Piutang ini sudah melewati jatuh tempo
                        </span>
                    </div>
                )}

                {/* Void Info */}
                {r.status === 'voided' && (
                    <div className="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm">
                        <p className="font-medium text-gray-700">Dibatalkan pada {r.voided_at}</p>
                        <p className="text-gray-600">Alasan: {r.void_reason}</p>
                    </div>
                )}

                {/* Main Info */}
                <Card className="mb-4">
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Pelanggan</p>
                                <p className="font-medium text-gray-900">{r.customer.name}</p>
                                {r.customer.phone && (
                                    <p className="text-gray-500 text-xs">{r.customer.phone}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-gray-500">Akun</p>
                                <p className="font-medium text-gray-900">{r.category_name || 'Tanpa akun'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Tanggal</p>
                                <p className="font-medium text-gray-900">{formatDate(r.date)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Jatuh Tempo</p>
                                <p className={`font-medium ${r.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
                                    {formatDate(r.due_date)}
                                </p>
                            </div>
                        </div>

                        <hr />

                        <div>
                            <p className="text-gray-500 text-sm">Keterangan</p>
                            <p className="text-gray-900">{r.description}</p>
                        </div>

                        {r.reference && (
                            <div>
                                <p className="text-gray-500 text-sm">Referensi</p>
                                <p className="text-gray-900">{r.reference}</p>
                            </div>
                        )}

                        <hr />

                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-gray-500 text-sm">Jumlah</p>
                                <p className="text-lg font-bold text-gray-900">{formatCurrency(r.amount)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Dibayar</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(r.paid_amount)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Sisa Tagihan</p>
                                <p className="text-lg font-bold text-blue-600">{formatCurrency(r.remaining_amount)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Journal Entries */}
                {journalEntries.length > 0 && (
                    <Card className="mb-4">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <BookOpen size={16} className="text-gray-500" />
                                <h3 className="font-medium text-gray-900">Jurnal Terkait</h3>
                            </div>
                            {journalEntries.map((entry) => (
                                <div key={entry.entry_number} className="text-sm border rounded-lg p-3 mb-2 last:mb-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-mono text-xs text-gray-500">{entry.entry_number}</span>
                                        <span className="text-xs text-gray-400">{entry.date}</span>
                                    </div>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {entry.lines.map((line, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-1">
                                                        <span className="text-gray-500">{line.account_code}</span>{' '}
                                                        {line.account_name}
                                                    </td>
                                                    <td className="text-right text-green-600 w-28">
                                                        {line.debit > 0 ? formatCurrency(line.debit) : ''}
                                                    </td>
                                                    <td className="text-right text-red-600 w-28">
                                                        {line.credit > 0 ? formatCurrency(line.credit) : ''}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Actions */}
                {r.status === 'posted' && (
                    <div className="flex justify-end gap-2">
                        {r.payment_status !== 'paid' && (
                            <Link href={`/transaksi/piutang-bayar/catat?customer_id=${r.customer.id}`}>
                                <Button size="sm" className="gap-1.5">
                                    <Banknote size={16} />
                                    Terima Pembayaran
                                </Button>
                            </Link>
                        )}
                        {r.paid_amount === 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => setShowVoidModal(true)}
                            >
                                <XCircle size={16} />
                                Batalkan Piutang
                            </Button>
                        )}
                    </div>
                )}

                {/* Void Modal */}
                {showVoidModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Batalkan Piutang</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Piutang <strong>{r.receivable_number}</strong> akan dibatalkan dan jurnal akan dibalik.
                            </p>
                            <textarea
                                className="w-full border rounded-md p-2 text-sm mb-4"
                                rows={3}
                                placeholder="Alasan pembatalan..."
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => { setShowVoidModal(false); setVoidReason(''); }}>
                                    Kembali
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleVoid}
                                    disabled={!voidReason.trim() || voiding}
                                >
                                    Ya, Batalkan
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
