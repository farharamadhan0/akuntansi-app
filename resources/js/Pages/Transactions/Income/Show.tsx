import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, BookOpen, XCircle, Edit3 } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { formatDateDDMMYYYY, formatDateTime } from '@/lib/format';

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

interface CorrectionRef {
    id: number;
    transaction_number: string;
}

interface Transaction {
    id: number;
    transaction_number: string;
    date: string;
    amount: number;
    description: string;
    reference?: string;
    status: 'draft' | 'posted' | 'voided' | 'corrected';
    status_label: string;
    status_color: string;
    cash_bank_name: string;
    cash_bank_type: string;
    category_name?: string;
    partner_name?: string;
    posted_at?: string;
    corrected_at?: string;
    corrected_by?: CorrectionRef;
    corrects?: CorrectionRef;
    journal_entries: JournalEntry[];
}

interface Props {
    transaction: Transaction;
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
    corrected: 'bg-amber-100 text-amber-700',
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
    return formatDateDDMMYYYY(dateStr);
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
            `/transaksi/uang-masuk/${t.id}/batal`,
            { reason },
            { onFinish: () => setVoiding(false) }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Uang Masuk – ${t.transaction_number}`} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Uang Masuk', href: '/transaksi/uang-masuk' },
                    { label: 'Detail' },
                ]} />

                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="text-green-600" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Detail Uang Masuk</h1>
                            <p className="text-sm font-mono text-muted-foreground">
                                {t.transaction_number}
                            </p>
                        </div>
                    </div>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusBadge[t.status]}`}>
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
                                <span className="text-green-700 font-bold text-base">
                                    {formatCurrency(t.amount)}
                                </span>
                            }
                        />
                        <DetailRow label="Keterangan" value={t.description} />
                        <DetailRow label="Diterima di" value={t.cash_bank_name} />
                        <DetailRow label="Akun" value={t.category_name ?? 'Tanpa akun'} />
                        <DetailRow label="Pelanggan" value={t.partner_name ?? 'Tidak ditentukan'} />
                        {t.reference && (
                            <DetailRow label="No. Referensi" value={t.reference} />
                        )}
                        {t.posted_at && (
                            <DetailRow label="Diposting pada" value={formatDateTime(t.posted_at)} />
                        )}
                    </CardContent>
                </Card>

                {/* Correction info - if this transaction was corrected */}
                {t.status === 'corrected' && t.corrected_by && (
                    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm text-amber-800">
                            <strong>Transaksi ini telah dikoreksi</strong> pada {t.corrected_at} oleh transaksi{' '}
                            <Link
                                href={`/transaksi/uang-masuk/${t.corrected_by.id}`}
                                className="font-mono font-medium underline hover:text-amber-900"
                            >
                                {t.corrected_by.transaction_number}
                            </Link>
                        </p>
                    </div>
                )}

                {/* Correction info - if this transaction corrects another */}
                {t.corrects && (
                    <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                        <p className="text-sm text-blue-800">
                            <strong>Transaksi ini adalah koreksi</strong> dari transaksi{' '}
                            <Link
                                href={`/transaksi/uang-masuk/${t.corrects.id}`}
                                className="font-mono font-medium underline hover:text-blue-900"
                            >
                                {t.corrects.transaction_number}
                            </Link>
                        </p>
                    </div>
                )}

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

                {/* Actions for posted transactions */}
                {t.status === 'posted' && (
                    <div className="flex justify-end gap-3">
                        <Link href={`/transaksi/uang-masuk/${t.id}/koreksi`}>
                            <Button
                                variant="outline"
                                className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                            >
                                <Edit3 size={16} />
                                Koreksi Transaksi
                            </Button>
                        </Link>
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
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Batalkan Transaksi?</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Jurnal pembalikan otomatis akan dibuat. Tindakan ini tidak dapat diurungkan.
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
                                onClick={() => { setShowVoidModal(false); setReason(''); }}
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
