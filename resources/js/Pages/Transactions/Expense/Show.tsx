import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, BookOpen, XCircle } from 'lucide-react';
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
    lines: JournalLine[];
}

interface Transaction {
    id: number;
    transaction_number: string;
    date: string;
    amount: number;
    description: string;
    reference?: string;
    status: 'draft' | 'posted' | 'voided';
    status_label: string;
    status_color: string;
    cash_bank_name: string;
    cash_bank_type: string;
    category_name?: string;
    supplier_name?: string;
    posted_at?: string;
    journal_entries: JournalEntry[];
}

interface Props {
    transaction: Transaction;
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-red-100 text-red-700',
    voided: 'bg-gray-100 text-gray-500',
};

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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between py-2.5 border-b last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-right">{value}</span>
        </div>
    );
}

export default function Show({ transaction: t }: Props) {
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [reason, setReason] = useState('');
    const [voiding, setVoiding] = useState(false);

    const handleVoid = () => {
        if (!reason.trim()) return;
        setVoiding(true);
        router.post(
            `/transaksi/uang-keluar/${t.id}/batal`,
            { reason },
            { onFinish: () => setVoiding(false) }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Uang Keluar – ${t.transaction_number}`} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Uang Keluar', href: '/transaksi/uang-keluar' },
                    { label: 'Detail' },
                ]} />

                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <TrendingDown className="text-red-500" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Detail Uang Keluar</h1>
                            <p className="text-sm font-mono text-muted-foreground">
                                {t.transaction_number}
                            </p>
                        </div>
                    </div>
                    <span
                        className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusBadge[t.status]}`}
                    >
                        {t.status_label}
                    </span>
                </div>

                {/* Transaction detail */}
                <Card className="mb-5">
                    <CardContent className="p-5">
                        <DetailRow label="Tanggal" value={formatDate(t.date)} />
                        <DetailRow
                            label="Jumlah"
                            value={
                                <span className="text-red-600 font-bold text-base">
                                    {formatCurrency(t.amount)}
                                </span>
                            }
                        />
                        <DetailRow label="Keterangan" value={t.description} />
                        <DetailRow label="Dibayar dari" value={t.cash_bank_name} />
                        <DetailRow label="Akun" value={t.category_name ?? 'Tanpa akun'} />
                        <DetailRow label="Pemasok" value={t.supplier_name ?? 'Tidak ditentukan'} />
                        {t.reference && (
                            <DetailRow label="No. Referensi" value={t.reference} />
                        )}
                        {t.posted_at && (
                            <DetailRow label="Diposting pada" value={t.posted_at} />
                        )}
                    </CardContent>
                </Card>

                {/* Journal entries */}
                {t.journal_entries.length > 0 && (
                    <Card className="mb-5">
                        <div className="px-5 py-3.5 border-b flex items-center gap-2">
                            <BookOpen size={16} className="text-muted-foreground" />
                            <span className="text-sm font-semibold">Jurnal Akuntansi</span>
                        </div>
                        <CardContent className="p-0">
                            {t.journal_entries.map((entry, ei) => (
                                <div key={ei} className="p-5">
                                    <p className="text-xs text-muted-foreground mb-3 font-mono">
                                        {entry.entry_number} · {formatDate(entry.date)}
                                    </p>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-muted-foreground">
                                                <th className="text-left pb-2 font-medium">Akun</th>
                                                <th className="text-right pb-2 font-medium">Debit</th>
                                                <th className="text-right pb-2 font-medium">Kredit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entry.lines.map((line, li) => (
                                                <tr key={li} className="border-b last:border-0">
                                                    <td className="py-2">
                                                        <span className="font-mono text-xs text-muted-foreground mr-2">
                                                            {line.account_code}
                                                        </span>
                                                        {line.account_name}
                                                    </td>
                                                    <td className="py-2 text-right">
                                                        {line.debit > 0
                                                            ? formatCurrency(line.debit)
                                                            : '-'}
                                                    </td>
                                                    <td className="py-2 text-right">
                                                        {line.credit > 0
                                                            ? formatCurrency(line.credit)
                                                            : '-'}
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

                {/* Void action */}
                {t.status === 'posted' && (
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setShowVoidModal(true)}
                        >
                            <XCircle size={16} />
                            Batalkan Transaksi
                        </Button>
                    </div>
                )}
            </div>

            {/* Void confirmation modal */}
            {showVoidModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">
                            Batalkan Transaksi?
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Jurnal pembalikan otomatis akan dibuat. Tindakan ini tidak dapat
                            diurungkan.
                        </p>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Alasan pembatalan <span className="text-destructive">*</span>
                        </label>
                        <textarea
                            className="w-full rounded-md border border-input px-3 py-2 text-sm mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            rows={3}
                            placeholder="Tulis alasan pembatalan..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowVoidModal(false);
                                    setReason('');
                                }}
                            >
                                Kembali
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white gap-2"
                                disabled={!reason.trim() || voiding}
                                onClick={handleVoid}
                            >
                                <XCircle size={16} />
                                {voiding ? 'Membatalkan...' : 'Ya, Batalkan'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
