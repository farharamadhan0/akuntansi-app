import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Banknote, Edit3 } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/format';

interface SaleItem {
    id: number;
    quantity: number;
    unit: string;
    unit_price: number;
    line_total: number;
    unit_cost: number;
    cost_amount: number;
    product: { name: string; product_code: string; deleted_at: string | null; } | null;
}

interface CorrectionRef {
    id: number;
    sale_number: string;
}

interface SaleData {
    id: number;
    sale_number: string;
    date: string;
    due_date?: string | null;
    payment_type: string;
    total_amount: number;
    notes?: string | null;
    reference?: string | null;
    status: string;
    status_label: string;
    posted_at?: string | null;
    voided_at?: string | null;
    void_reason?: string | null;
    corrected_at?: string | null;
    corrected_by?: CorrectionRef | null;
    corrects?: CorrectionRef | null;
    partner?: { id: number; name: string; code?: string | null; } | null;
    cash_bank_account?: { name: string; } | null;
    receivable?: { id: number; receivable_number: string; payment_status: string; amount: number; paid_amount: number; remaining_amount: number; } | null;
    items: SaleItem[];
}

interface JournalEntry {
    entry_number: string;
    date: string;
    description: string;
    status: string;
    lines: { account_code: string; account_name: string; debit: number; credit: number; }[];
}

interface Props {
    sale: SaleData;
    journalEntries: JournalEntry[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
    corrected: 'bg-amber-100 text-amber-700',
};

export default function Show({ sale, journalEntries }: Props) {
    const [reason, setReason] = useState('');
    const receivablePaymentUrl = sale.status === 'posted'
        && sale.payment_type === 'credit'
        && sale.receivable
        && sale.receivable.payment_status !== 'paid'
        && sale.receivable.remaining_amount > 0
        ? `/transaksi/piutang-bayar/catat?receivable_id=${sale.receivable.id}`
        : null;

    return (
        <AuthenticatedLayout>
            <Head title={`Penjualan ${sale.sale_number}`} />
            <div className="mx-auto max-w-5xl">
                <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Penjualan', href: '/transaksi/penjualan' }, { label: 'Detail' }]} />

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Penjualan {sale.sale_number}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{sale.payment_type === 'cash' ? 'Tunai' : 'Kredit'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm ${statusBadge[sale.status] ?? 'bg-slate-100 text-slate-700'}`}>{sale.status_label}</span>
                </div>

                {sale.status === 'corrected' && sale.corrected_by && (
                    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm text-amber-800">
                            <strong>Penjualan ini telah dikoreksi</strong> pada {sale.corrected_at} oleh penjualan{' '}
                            <Link href={`/transaksi/penjualan/${sale.corrected_by.id}`} className="font-mono font-medium underline hover:text-amber-900">
                                {sale.corrected_by.sale_number}
                            </Link>
                        </p>
                    </div>
                )}

                {sale.corrects && (
                    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                        <p className="text-sm text-blue-800">
                            <strong>Penjualan ini adalah koreksi</strong> dari penjualan{' '}
                            <Link href={`/transaksi/penjualan/${sale.corrects.id}`} className="font-mono font-medium underline hover:text-blue-900">
                                {sale.corrects.sale_number}
                            </Link>
                        </p>
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardContent className="space-y-4 p-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div><div className="text-sm text-muted-foreground">Tanggal</div><div className="font-medium">{formatDateDDMMYYYY(sale.date)}</div></div>
                                <div><div className="text-sm text-muted-foreground">Jatuh Tempo</div><div className="font-medium">{sale.due_date ? formatDateDDMMYYYY(sale.due_date) : '-'}</div></div>
                                <div><div className="text-sm text-muted-foreground">Pelanggan</div><div className="font-medium">{sale.partner?.name ?? '-'}</div></div>
                                <div><div className="text-sm text-muted-foreground">Kas/Bank</div><div className="font-medium">{sale.cash_bank_account?.name ?? '-'}</div></div>
                            </div>

                            <div className="rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">Produk</th>
                                            <th className="px-3 py-2 text-right font-medium">Qty</th>
                                            <th className="px-3 py-2 text-right font-medium">Harga</th>
                                            <th className="px-3 py-2 text-right font-medium">HPP</th>
                                            <th className="px-3 py-2 text-right font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sale.items.map((item) => (
                                            <tr key={item.id} className="border-t">
                                                <td className="px-3 py-2">
                                                    {item.product
                                                        ? <>{item.product.product_code} - {item.product.name}{item.product.deleted_at && <span className="ml-1.5 italic text-xs text-muted-foreground">(produk dihapus)</span>}</>
                                                        : '-'
                                                    }
                                                </td>
                                                <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                                                <td className="px-3 py-2 text-right">{item.cost_amount > 0 ? formatCurrency(item.cost_amount) : '-'}</td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(item.line_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="space-y-4 p-6">
                            <div><div className="text-sm text-muted-foreground">Total</div><div className="text-2xl font-semibold">{formatCurrency(sale.total_amount)}</div></div>
                            {sale.receivable && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Piutang Terkait</div>
                                    <Link href={`/transaksi/piutang/${sale.receivable.id}`} className="font-medium underline hover:text-primary">
                                        {sale.receivable.receivable_number}
                                    </Link>
                                    <div className="text-xs text-muted-foreground">
                                        Dibayar {formatCurrency(sale.receivable.paid_amount)} dari {formatCurrency(sale.receivable.amount)}
                                    </div>
                                    {sale.receivable.remaining_amount > 0 && (
                                        <div className="text-xs font-medium text-green-700">
                                            Sisa {formatCurrency(sale.receivable.remaining_amount)}
                                        </div>
                                    )}
                                </div>
                            )}
                            {sale.reference && <div><div className="text-sm text-muted-foreground">Referensi</div><div className="font-medium">{sale.reference}</div></div>}
                            {sale.notes && <div><div className="text-sm text-muted-foreground">Catatan</div><div>{sale.notes}</div></div>}
                            {receivablePaymentUrl && (
                                <Link href={receivablePaymentUrl}>
                                    <Button className="w-full gap-2">
                                        <Banknote size={16} />
                                        Terima Pembayaran
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {journalEntries.length > 0 && (
                    <Card className="mt-6">
                        <CardContent className="space-y-3 p-6">
                            <h2 className="text-lg font-semibold">Jurnal</h2>
                            {journalEntries.map((entry) => (
                                <div key={entry.entry_number} className="rounded-lg border p-4">
                                    <div className="mb-2 flex items-center justify-between text-sm">
                                        <span className="font-mono">{entry.entry_number}</span>
                                        <span>{formatDateDDMMYYYY(entry.date)}</span>
                                    </div>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {entry.lines.map((line, index) => (
                                                <tr key={index}>
                                                    <td className="py-1">{line.account_code} - {line.account_name}</td>
                                                    <td className="py-1 text-right text-green-700">{line.debit > 0 ? formatCurrency(line.debit) : ''}</td>
                                                    <td className="py-1 text-right text-red-700">{line.credit > 0 ? formatCurrency(line.credit) : ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {sale.status === 'posted' && (
                    <div className="mt-6 space-y-4">
                        <div className="flex justify-end">
                            <Link href={`/transaksi/penjualan/${sale.id}/koreksi`}>
                                <Button variant="outline" className="gap-2 border-amber-200 text-amber-600 hover:bg-amber-50">
                                    <Edit3 size={16} />
                                    Koreksi Penjualan
                                </Button>
                            </Link>
                        </div>

                        <Card>
                            <CardContent className="space-y-3 p-6">
                                <h2 className="text-lg font-semibold">Batalkan Dokumen</h2>
                                <textarea className="min-h-24 w-full rounded-md border p-3 text-sm" placeholder="Alasan pembatalan..." value={reason} onChange={(e) => setReason(e.target.value)} />
                                <div className="flex justify-end">
                                    <Button variant="destructive" disabled={!reason.trim()} onClick={() => router.post(`/transaksi/penjualan/${sale.id}/batal`, { reason })}>
                                        Batalkan Penjualan
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
