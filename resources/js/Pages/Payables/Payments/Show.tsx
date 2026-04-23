import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Banknote, BookOpen, XCircle, ExternalLink } from 'lucide-react';

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

interface Allocation {
    payable_number: string;
    payable_id: number;
    amount: number;
}

interface Supplier {
    id: number;
    name: string;
    code?: string;
}

interface Payment {
    id: number;
    payment_number: string;
    supplier: Supplier;
    cash_bank_name: string;
    date: string;
    amount: number;
    description: string;
    reference?: string;
    status: 'draft' | 'posted' | 'voided';
    status_label: string;
    posted_at?: string;
    voided_at?: string;
    void_reason?: string;
    created_by_name?: string;
    allocations: Allocation[];
}

interface Props {
    payment: Payment;
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

export default function Show({ payment: p, journalEntries }: Props) {
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [voiding, setVoiding] = useState(false);

    const handleVoid = () => {
        if (!voidReason.trim()) return;
        setVoiding(true);
        router.post(
            `/transaksi/hutang-bayar/${p.id}/batal`,
            { reason: voidReason },
            { onFinish: () => setVoiding(false) }
        );
    };

    const statusBadge = () => {
        const colors: Record<string, string> = {
            draft: 'bg-gray-100 text-gray-600',
            posted: 'bg-green-100 text-green-700',
            voided: 'bg-red-100 text-red-600',
        };
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colors[p.status]}`}>
                {p.status_label}
            </span>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Pembayaran – ${p.payment_number}`} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Hutang', href: '/transaksi/hutang' },
                    { label: 'Pembayaran', href: '/transaksi/hutang-bayar' },
                    { label: 'Detail' },
                ]} />

                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Banknote className="text-orange-600" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Detail Pembayaran</h1>
                            <p className="text-sm font-mono text-muted-foreground">
                                {p.payment_number}
                            </p>
                        </div>
                    </div>
                    {statusBadge()}
                </div>

                {/* Void Info */}
                {p.status === 'voided' && (
                    <div className="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm">
                        <p className="font-medium text-gray-700">Dibatalkan pada {p.voided_at}</p>
                        <p className="text-gray-600">Alasan: {p.void_reason}</p>
                    </div>
                )}

                {/* Main Info */}
                <Card className="mb-4">
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Pemasok</p>
                                <p className="font-medium text-gray-900">{p.supplier.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Dibayar dari</p>
                                <p className="font-medium text-gray-900">{p.cash_bank_name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Tanggal</p>
                                <p className="font-medium text-gray-900">{formatDate(p.date)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Jumlah</p>
                                <p className="text-xl font-bold text-orange-600">{formatCurrency(p.amount)}</p>
                            </div>
                        </div>

                        {p.description && (
                            <>
                                <hr />
                                <div>
                                    <p className="text-gray-500 text-sm">Keterangan</p>
                                    <p className="text-gray-900">{p.description}</p>
                                </div>
                            </>
                        )}

                        {p.reference && (
                            <div>
                                <p className="text-gray-500 text-sm">Referensi</p>
                                <p className="text-gray-900">{p.reference}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Allocations */}
                <Card className="mb-4">
                    <CardContent className="p-4">
                        <h3 className="font-medium text-gray-900 mb-3">Alokasi Pembayaran</h3>
                        <div className="space-y-2">
                            {p.allocations.map((a, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <Link
                                            href={`/transaksi/hutang/${a.payable_id}`}
                                            className="font-mono text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                                        >
                                            {a.payable_number}
                                            <ExternalLink size={12} />
                                        </Link>
                                    </div>
                                    <span className="font-medium text-orange-600">
                                        {formatCurrency(a.amount)}
                                    </span>
                                </div>
                            ))}
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
                {p.status === 'posted' && (
                    <div className="flex justify-end">
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setShowVoidModal(true)}
                        >
                            <XCircle size={16} />
                            Batalkan Pembayaran
                        </Button>
                    </div>
                )}

                {/* Void Modal */}
                {showVoidModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Batalkan Pembayaran</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Pembayaran <strong>{p.payment_number}</strong> akan dibatalkan.
                                Status hutang terkait akan dikembalikan.
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
