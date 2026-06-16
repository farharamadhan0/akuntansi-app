import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/lib/permissions';
import { ClipboardList } from 'lucide-react';

interface Production {
    id: number;
    production_number: string;
    date: string;
    product: { id: number; product_code: string; name: string; unit: string };
    recipe_yield_quantity: number;
    actual_yield_quantity: number;
    unit: string;
    total_input_cost: number;
    unit_cost: number;
    notes?: string | null;
    status: string;
    status_label: string;
    void_reason?: string | null;
    inputs: Array<{
        id: number;
        product: { id: number; product_code: string; name: string; unit: string };
        planned_quantity: number;
        actual_quantity: number;
        unit: string;
        unit_cost: number;
        total_cost: number;
    }>;
}

interface JournalEntry {
    entry_number: string;
    date: string;
    description: string;
    status: string;
    lines: Array<{
        account_code: string;
        account_name: string;
        debit: number;
        credit: number;
    }>;
}

interface Flash {
    error?: string;
}

interface Props {
    production: Production;
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

function statusClass(status: string) {
    const classes: Record<string, string> = {
        posted: 'bg-green-100 text-green-700',
        draft: 'bg-amber-100 text-amber-700',
        voided: 'bg-red-100 text-red-700',
    };

    return classes[status] ?? 'bg-gray-100 text-gray-600';
}

export default function Show({ production, journalEntries }: Props) {
    const { can } = usePermissions();
    const { flash } = usePage().props as { flash?: Flash };
    const [showVoidModal, setShowVoidModal] = useState(false);
    const { data, setData, post, processing, errors } = useForm({ reason: '' });
    const actualOutputQuantity = Number(production.actual_yield_quantity);
    const comparableInputQuantity = production.inputs
        .filter((input) => input.unit === production.unit)
        .reduce((total, input) => total + Number(input.actual_quantity), 0);
    const shrinkageQuantity = comparableInputQuantity > 0
        ? comparableInputQuantity - actualOutputQuantity
        : Number(production.recipe_yield_quantity) - actualOutputQuantity;
    const shrinkagePercentage = comparableInputQuantity > 0
        ? (shrinkageQuantity / comparableInputQuantity) * 100
        : 0;

    const submitVoid = (event: FormEvent) => {
        event.preventDefault();
        post(`/fnb/produksi/${production.id}/batal`, {
            onSuccess: () => setShowVoidModal(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={production.production_number} />
            <div className="mx-auto max-w-6xl">
                <Breadcrumb items={[{ label: 'F&B' }, { label: 'Produksi / Prep', href: '/fnb/produksi' }, { label: production.production_number }]} />

                {flash?.error && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{flash.error}</div>}

                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-emerald-100 p-3">
                            <ClipboardList className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">{production.production_number}</h1>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(production.status)}`}>
                                    {production.status_label}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{production.date}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/fnb/produksi">
                            <Button variant="outline">Kembali</Button>
                        </Link>
                        {can('productions.delete') && production.status === 'posted' && (
                            <Button variant="destructive" onClick={() => setShowVoidModal(true)}>Batalkan</Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardContent className="p-6">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900">Output Produksi</h2>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Produk Hasil</p>
                                        <p className="mt-1 font-medium text-gray-900">{production.product.name}</p>
                                        <p className="font-mono text-xs text-muted-foreground">{production.product.product_code}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Hasil Aktual</p>
                                        <p className="mt-1 font-medium text-gray-900">{Number(production.actual_yield_quantity).toFixed(2)} {production.unit}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Input Cost</p>
                                        <p className="mt-1 font-medium text-gray-900">{formatCurrency(production.total_input_cost)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Unit Cost Output</p>
                                        <p className="mt-1 font-medium text-gray-900">{formatCurrency(production.unit_cost)}</p>
                                    </div>
                                    {production.notes && (
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-muted-foreground">Catatan</p>
                                            <p className="mt-1 whitespace-pre-line text-sm text-gray-900">{production.notes}</p>
                                        </div>
                                    )}
                                    {production.void_reason && (
                                        <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                            Alasan batal: {production.void_reason}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-0">
                                <div className="border-b p-5">
                                    <h2 className="text-lg font-semibold text-gray-900">Input Bahan</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bahan</TableHead>
                                                <TableHead className="text-right">Rencana</TableHead>
                                                <TableHead className="text-right">Aktual</TableHead>
                                                <TableHead className="text-right">Unit Cost</TableHead>
                                                <TableHead className="text-right">Total Cost</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {production.inputs.map((input) => (
                                                <TableRow key={input.id}>
                                                    <TableCell>
                                                        <div className="font-medium text-gray-900">{input.product.name}</div>
                                                        <div className="font-mono text-xs text-muted-foreground">{input.product.product_code}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{Number(input.planned_quantity).toFixed(2)} {input.unit}</TableCell>
                                                    <TableCell className="text-right">{Number(input.actual_quantity).toFixed(2)} {input.unit}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(input.unit_cost)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(input.total_cost)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-0">
                                <div className="border-b p-5">
                                    <h2 className="text-lg font-semibold text-gray-900">Jurnal</h2>
                                </div>
                                {journalEntries.length === 0 ? (
                                    <div className="p-6 text-sm text-muted-foreground">Tidak ada jurnal karena total input cost bernilai 0.</div>
                                ) : (
                                    <div className="space-y-4 p-5">
                                        {journalEntries.map((entry) => (
                                            <div key={entry.entry_number} className="rounded-lg border">
                                                <div className="border-b px-4 py-3">
                                                    <p className="font-medium text-gray-900">{entry.entry_number}</p>
                                                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                                                </div>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Akun</TableHead>
                                                            <TableHead className="text-right">Debit</TableHead>
                                                            <TableHead className="text-right">Kredit</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {entry.lines.map((line, index) => (
                                                            <TableRow key={`${entry.entry_number}-${index}`}>
                                                                <TableCell>
                                                                    <span className="font-mono text-xs text-muted-foreground">{line.account_code}</span> {line.account_name}
                                                                </TableCell>
                                                                <TableCell className="text-right">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</TableCell>
                                                                <TableCell className="text-right">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="h-fit">
                        <CardContent className="space-y-4 p-6">
                            <h2 className="text-lg font-semibold text-gray-900">Ringkasan</h2>
                            <div className="rounded-lg border bg-muted/30 p-4">
                                <p className="text-sm text-muted-foreground">Penyusutan Input ke Output</p>
                                <p className="mt-1 text-xl font-semibold text-gray-900">
                                    {shrinkageQuantity.toFixed(2)} {production.unit}
                                </p>
                                {comparableInputQuantity > 0 && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {shrinkagePercentage.toLocaleString('id-ID', { maximumFractionDigits: 2 })}% dari {comparableInputQuantity.toFixed(2)} {production.unit} input
                                    </p>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Penyusutan dihitung dari total input aktual bersatuan sama dikurangi hasil aktual. Biaya input terserap ke output sehingga unit cost hasil naik.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {showVoidModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={submitVoid} className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-2 text-lg font-semibold">Batalkan Produksi</h3>
                        <p className="mb-4 text-sm text-gray-600">Produksi hanya bisa dibatalkan jika mutasi stok hasil belum dipakai transaksi setelahnya.</p>
                        <FormField label="Alasan" error={errors.reason} required>
                            <Input value={data.reason} onChange={(event) => setData('reason', event.target.value)} />
                        </FormField>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" onClick={() => setShowVoidModal(false)} disabled={processing}>Batal</Button>
                            <Button type="submit" variant="destructive" disabled={processing}>Batalkan Produksi</Button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
