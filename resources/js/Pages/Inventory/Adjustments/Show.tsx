import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AdjustmentItem {
    id: number;
    adjustment_type: string;
    quantity: number;
    unit_cost?: number | null;
    total_cost: number;
    reason?: string | null;
    product: { name: string; product_code: string; unit: string; };
}

interface AdjustmentData {
    id: number;
    adjustment_number: string;
    date: string;
    notes?: string | null;
    status: string;
    status_label: string;
    items: AdjustmentItem[];
}

interface JournalEntry {
    entry_number: string;
    date: string;
    description: string;
    status: string;
    lines: { account_code: string; account_name: string; debit: number; credit: number; }[];
}

interface Props {
    stock_adjustment: AdjustmentData;
    journalEntries: JournalEntry[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function Show({ stock_adjustment: adjustment, journalEntries }: Props) {
    const [reason, setReason] = useState('');

    return (
        <AuthenticatedLayout>
            <Head title={`Penyesuaian ${adjustment.adjustment_number}`} />
            <div className="mx-auto max-w-5xl">
                <Breadcrumb items={[{ label: 'Transaksi' }, { label: 'Penyesuaian Stok', href: '/transaksi/stok-penyesuaian' }, { label: 'Detail' }]} />

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Penyesuaian {adjustment.adjustment_number}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{adjustment.date}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{adjustment.status_label}</span>
                </div>

                <Card>
                    <CardContent className="space-y-4 p-6">
                        {adjustment.notes && <div><div className="text-sm text-muted-foreground">Catatan</div><div>{adjustment.notes}</div></div>}
                        <div className="rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Produk</th>
                                        <th className="px-3 py-2 text-left font-medium">Jenis</th>
                                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                                        <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                                        <th className="px-3 py-2 text-right font-medium">Nilai</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adjustment.items.map((item) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="px-3 py-2">{item.product.product_code} - {item.product.name}</td>
                                            <td className="px-3 py-2">{item.adjustment_type === 'in' ? 'Tambah' : 'Kurang'}</td>
                                            <td className="px-3 py-2 text-right">{item.quantity} {item.product.unit}</td>
                                            <td className="px-3 py-2 text-right">{item.unit_cost ? formatCurrency(item.unit_cost) : '-'}</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency(item.total_cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {journalEntries.length > 0 && (
                    <Card className="mt-6">
                        <CardContent className="space-y-3 p-6">
                            <h2 className="text-lg font-semibold">Jurnal</h2>
                            {journalEntries.map((entry) => (
                                <div key={entry.entry_number} className="rounded-lg border p-4">
                                    <div className="mb-2 flex items-center justify-between text-sm">
                                        <span className="font-mono">{entry.entry_number}</span>
                                        <span>{entry.date}</span>
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

                {adjustment.status === 'posted' && (
                    <Card className="mt-6">
                        <CardContent className="space-y-3 p-6">
                            <h2 className="text-lg font-semibold">Batalkan Dokumen</h2>
                            <textarea className="min-h-24 w-full rounded-md border p-3 text-sm" placeholder="Alasan pembatalan..." value={reason} onChange={(e) => setReason(e.target.value)} />
                            <div className="flex justify-end">
                                <Button variant="destructive" disabled={!reason.trim()} onClick={() => router.post(`/transaksi/stok-penyesuaian/${adjustment.id}/batal`, { reason })}>
                                    Batalkan Penyesuaian
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
