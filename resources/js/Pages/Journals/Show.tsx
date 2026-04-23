import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
    BookOpen,
    CheckCircle2,
    XCircle,
    Pencil,
    Trash2,
    Zap,
    ArrowLeft,
} from 'lucide-react';

interface Line {
    account_id: number;
    account_code: string;
    account_name: string;
    description: string | null;
    debit: number;
    credit: number;
}

interface Entry {
    id: number;
    entry_number: string;
    date: string;
    description: string;
    status: 'draft' | 'posted' | 'voided';
    status_label: string;
    status_color: string;
    is_manual: boolean;
    is_adjusting: boolean;
    source_type: string | null;
    source_id: number | null;
    voided_at: string | null;
    void_reason: string | null;
    created_by: string | null;
    created_at: string | null;
    total_debit: number;
    total_credit: number;
    lines: Line[];
}

interface Props {
    entry: Entry;
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
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

export default function Show({ entry: e }: Props) {
    const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
    const flashSuccess = props.flash?.success;
    const flashError = props.flash?.error;

    const [showVoidModal, setShowVoidModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const editable = e.is_manual && e.status === 'draft';
    const deletable = e.is_manual && e.status === 'draft';
    const postable = e.status === 'draft';
    const voidable = e.status === 'posted';

    const handlePost = () => {
        setSubmitting(true);
        router.post(`/jurnal/${e.id}/posting`, {}, { onFinish: () => setSubmitting(false) });
    };

    const handleVoid = () => {
        if (!reason.trim()) return;
        setSubmitting(true);
        router.post(
            `/jurnal/${e.id}/batal`,
            { reason },
            { onFinish: () => setSubmitting(false) }
        );
    };

    const handleDelete = () => {
        setSubmitting(true);
        router.delete(`/jurnal/${e.id}`, { onFinish: () => setSubmitting(false) });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Jurnal – ${e.entry_number}`} />

            <div className="max-w-4xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Jurnal Umum', href: '/jurnal' },
                    { label: e.entry_number },
                ]} />

                {flashSuccess && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        {flashSuccess}
                    </div>
                )}
                {flashError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flashError}
                    </div>
                )}

                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <BookOpen className="text-indigo-600" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Detail Jurnal</h1>
                            <p className="text-sm font-mono text-muted-foreground">
                                {e.entry_number}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!e.is_manual && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                                <Zap size={12} />
                                Otomatis
                            </span>
                        )}
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusBadge[e.status]}`}>
                            {e.status_label}
                        </span>
                    </div>
                </div>

                {/* Header detail */}
                <Card className="mb-5">
                    <CardContent className="p-5">
                        <DetailRow label="Tanggal" value={formatDate(e.date)} />
                        <DetailRow label="Keterangan" value={e.description} />
                        <DetailRow
                            label="Jenis"
                            value={
                                <>
                                    {e.is_manual ? 'Manual' : 'Otomatis'}
                                    {e.is_adjusting && ' · Penyesuaian'}
                                </>
                            }
                        />
                        {!e.is_manual && e.source_type && (
                            <DetailRow
                                label="Sumber"
                                value={<span className="text-xs font-mono">{e.source_type} #{e.source_id}</span>}
                            />
                        )}
                        {e.created_by && (
                            <DetailRow label="Dibuat oleh" value={`${e.created_by} · ${e.created_at ?? ''}`} />
                        )}
                        {e.voided_at && (
                            <>
                                <DetailRow label="Dibatalkan pada" value={e.voided_at} />
                                <DetailRow
                                    label="Alasan pembatalan"
                                    value={<span className="text-red-600">{e.void_reason}</span>}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Lines */}
                <Card className="mb-5">
                    <div className="px-5 py-3.5 border-b flex items-center gap-2">
                        <BookOpen size={16} className="text-muted-foreground" />
                        <span className="text-sm font-semibold">Baris Jurnal ({e.lines.length})</span>
                    </div>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b text-xs text-muted-foreground">
                                <tr>
                                    <th className="text-left px-5 py-2.5 font-medium">Akun</th>
                                    <th className="text-left px-3 py-2.5 font-medium">Keterangan</th>
                                    <th className="text-right px-3 py-2.5 font-medium">Debit</th>
                                    <th className="text-right px-5 py-2.5 font-medium">Kredit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {e.lines.map((line, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="px-5 py-2.5">
                                            <span className="font-mono text-xs text-muted-foreground mr-2">
                                                {line.account_code}
                                            </span>
                                            {line.account_name}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                            {line.description ?? '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                            {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                        </td>
                                        <td className="px-5 py-2.5 text-right tabular-nums">
                                            {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t">
                                <tr>
                                    <td colSpan={2} className="px-5 py-3 text-right text-sm font-semibold">
                                        Total
                                    </td>
                                    <td className="px-3 py-3 text-right font-bold tabular-nums">
                                        {formatCurrency(e.total_debit)}
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold tabular-nums">
                                        {formatCurrency(e.total_credit)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/jurnal">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft size={16} />
                            Kembali
                        </Button>
                    </Link>
                    <div className="flex flex-wrap gap-2">
                        {editable && (
                            <Link href={`/jurnal/${e.id}/edit`}>
                                <Button variant="outline" className="gap-2">
                                    <Pencil size={16} />
                                    Edit
                                </Button>
                            </Link>
                        )}
                        {deletable && (
                            <Button
                                variant="outline"
                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                <Trash2 size={16} />
                                Hapus
                            </Button>
                        )}
                        {voidable && (
                            <Button
                                variant="outline"
                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setShowVoidModal(true)}
                            >
                                <XCircle size={16} />
                                Batalkan
                            </Button>
                        )}
                        {postable && (
                            <Button
                                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => setShowPostModal(true)}
                            >
                                <CheckCircle2 size={16} />
                                Posting Jurnal
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Post confirmation */}
            {showPostModal && (
                <Modal
                    title="Posting Jurnal?"
                    message="Jurnal akan dikunci dan mempengaruhi laporan keuangan. Setelah diposting, jurnal tidak dapat diedit atau dihapus — hanya dapat dibatalkan (void)."
                    confirmLabel="Ya, Posting"
                    confirmClass="bg-green-600 hover:bg-green-700"
                    onCancel={() => setShowPostModal(false)}
                    onConfirm={handlePost}
                    submitting={submitting}
                    icon={<CheckCircle2 size={16} />}
                />
            )}

            {/* Delete confirmation */}
            {showDeleteModal && (
                <Modal
                    title="Hapus Jurnal Draft?"
                    message="Jurnal draft ini akan dihapus permanen. Tindakan ini tidak dapat diurungkan."
                    confirmLabel="Ya, Hapus"
                    confirmClass="bg-red-600 hover:bg-red-700"
                    onCancel={() => setShowDeleteModal(false)}
                    onConfirm={handleDelete}
                    submitting={submitting}
                    icon={<Trash2 size={16} />}
                />
            )}

            {/* Void confirmation */}
            {showVoidModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Batalkan Jurnal?</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Jurnal pembalikan otomatis akan dibuat untuk menetralkan efeknya. Tindakan ini tidak dapat diurungkan.
                        </p>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Alasan pembatalan <span className="text-destructive">*</span>
                        </label>
                        <textarea
                            className="w-full rounded-md border border-input px-3 py-2 text-sm mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            rows={3}
                            placeholder="Tulis alasan pembatalan..."
                            value={reason}
                            onChange={(ev) => setReason(ev.target.value)}
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
                                disabled={!reason.trim() || submitting}
                                onClick={handleVoid}
                            >
                                <XCircle size={16} />
                                {submitting ? 'Membatalkan...' : 'Ya, Batalkan'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

function Modal({
    title,
    message,
    confirmLabel,
    confirmClass,
    onCancel,
    onConfirm,
    submitting,
    icon,
}: {
    title: string;
    message: string;
    confirmLabel: string;
    confirmClass: string;
    onCancel: () => void;
    onConfirm: () => void;
    submitting: boolean;
    icon: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
                <p className="text-sm text-muted-foreground mb-5">{message}</p>
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>
                        Kembali
                    </Button>
                    <Button
                        className={`${confirmClass} text-white gap-2`}
                        onClick={onConfirm}
                        disabled={submitting}
                    >
                        {icon}
                        {submitting ? 'Memproses...' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
