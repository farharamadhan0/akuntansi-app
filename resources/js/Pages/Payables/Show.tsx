import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Wallet, BookOpen, XCircle, AlertTriangle, Banknote } from 'lucide-react';

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

interface Partner {
    id: number;
    name: string;
    code?: string;
    phone?: string;
    email?: string;
}

interface Payable {
    id: number;
    payable_number: string;
    partner: Partner;
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
    payable: Payable;
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

export default function Show({ payable: p, journalEntries }: Props) {
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [voiding, setVoiding] = useState(false);

    const handleVoid = () => {
        if (!voidReason.trim()) return;
        setVoiding(true);
        router.post(
            `/transaksi/hutang/${p.id}/batal`,
            { reason: voidReason },
            { onFinish: () => setVoiding(false) }
        );
    };

    const paymentStatusColors: Record<string, string> = {
        unpaid: 'bg-red-100 text-red-700',
        partial: 'bg-yellow-100 text-yellow-700',
        paid: 'bg-green-100 text-green-700',
    };

    const statusColors: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-600',
        posted: 'bg-blue-100 text-blue-700',
        voided: 'bg-red-100 text-red-600',
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Hutang – ${p.payable_number}`} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Hutang', href: '/transaksi/hutang' },
                    { label: 'Detail' },
                ]} />

                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Wallet className="text-orange-600" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Detail Hutang</h1>
                            <p className="text-sm font-mono text-muted-foreground">
                                {p.payable_number}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[p.status]}`}>
                            {p.status_label}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${paymentStatusColors[p.payment_status]}`}>
                            {p.payment_status_label}
                        </span>
                    </div>
                </div>

                {/* Void Info */}
                {p.status === 'voided' && (
                    <div className="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm">
                        <p className="font-medium text-gray-700">Dibatalkan pada {p.voided_at}</p>
                        <p className="text-gray-600">Alasan: {p.void_reason}</p>
                    </div>
                )}

                {/* Overdue Warning */}
                {p.is_overdue && (
                    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm flex items-center gap-2 text-red-700">
                        <AlertTriangle size={16} />
                        Hutang ini telah melewati jatuh tempo!
                    </div>
                )}

                {/* Main Info */}
                <Card className="mb-4">
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Supplier</p>
                                <p className="font-semibold text-gray-900">{p.partner.name}</p>
                                {p.partner.phone && (
                                    <p className="text-gray-400 text-xs">{p.partner.phone}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-gray-500">Akun</p>
                                <p className="font-medium text-gray-900">{p.category_name ?? 'Tanpa akun'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Tanggal</p>
                                <p className="font-medium text-gray-900">{formatDate(p.date)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Jatuh Tempo</p>
                                <p className={`font-medium ${p.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
                                    {formatDate(p.due_date)}
                                </p>
                            </div>
                        </div>

                        <hr />

                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Total Hutang</p>
                                <p className="text-lg font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Sudah Dibayar</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(p.paid_amount)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Sisa Hutang</p>
                                <p className={`text-lg font-bold ${p.remaining_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {formatCurrency(p.remaining_amount)}
                                </p>
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
                                <p className="text-gray-500 text-sm">No. Referensi</p>
                                <p className="font-mono text-gray-900">{p.reference}</p>
                            </div>
                        )}

                        {p.posted_at && (
                            <div className="text-xs text-gray-400">
                                Diposting: {p.posted_at}
                                {p.created_by_name && ` oleh ${p.created_by_name}`}
                            </div>
                        )}
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
                                        <thead>
                                            <tr className="text-xs text-gray-400">
                                                <th className="text-left font-normal">Akun</th>
                                                <th className="text-right font-normal w-28">Debit</th>
                                                <th className="text-right font-normal w-28">Kredit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entry.lines.map((line, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-1">
                                                        <span className="text-gray-400">{line.account_code}</span>{' '}
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
                    <div className="flex justify-end gap-2">
                        {p.payment_status !== 'paid' && (
                            <Link href={`/transaksi/hutang-bayar/catat?partner_id=${p.partner.id}`}>
                                <Button size="sm" className="gap-1.5">
                                    <Banknote size={16} />
                                    Bayar Hutang
                                </Button>
                            </Link>
                        )}
                        {p.paid_amount === 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => setShowVoidModal(true)}
                            >
                                <XCircle size={16} />
                                Batalkan Hutang
                            </Button>
                        )}
                    </div>
                )}

                {/* Void Modal */}
                {showVoidModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                            <h3 className="text-lg font-semibold mb-4">Batalkan Hutang</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Hutang <strong>{p.payable_number}</strong> akan dibatalkan dan jurnal akan dibalik.
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
