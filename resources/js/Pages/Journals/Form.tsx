import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useMemo, type FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Select } from '@/components/ui/select';
import { BookOpen, Plus, Trash2, Save } from 'lucide-react';

interface Account {
    id: number;
    code: string;
    name: string;
    type: string;
    type_label: string;
}

interface LineInput {
    account_id: string | number;
    description: string;
    debit: string | number;
    credit: string | number;
}

interface EntryData {
    id: number;
    entry_number: string;
    date: string;
    description: string;
    is_adjusting: boolean;
    lines: Array<{
        account_id: number;
        description: string | null;
        debit: number;
        credit: number;
    }>;
}

interface Props {
    entry: EntryData | null;
    accounts: Account[];
    defaultDate: string;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function toNumber(v: string | number): number {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
}

export default function Form({ entry, accounts, defaultDate }: Props) {
    const isEdit = !!entry;
    const { props } = usePage<{ flash?: { error?: string } }>();
    const flashError = props.flash?.error;

    const initialLines: LineInput[] = entry
        ? entry.lines.map((l) => ({
              account_id: l.account_id,
              description: l.description ?? '',
              debit: l.debit || '',
              credit: l.credit || '',
          }))
        : [
              { account_id: '', description: '', debit: '', credit: '' },
              { account_id: '', description: '', debit: '', credit: '' },
          ];

    const { data, setData, post, put, processing, errors } = useForm({
        date: entry?.date ?? defaultDate,
        description: entry?.description ?? '',
        is_adjusting: entry?.is_adjusting ?? false,
        lines: initialLines,
    });

    const totals = useMemo(() => {
        const debit = data.lines.reduce((sum, l) => sum + toNumber(l.debit), 0);
        const credit = data.lines.reduce((sum, l) => sum + toNumber(l.credit), 0);
        return { debit, credit, diff: debit - credit };
    }, [data.lines]);

    const isBalanced = totals.diff === 0 && totals.debit > 0;

    const updateLine = (index: number, field: keyof LineInput, value: string | number) => {
        const next = [...data.lines];
        next[index] = { ...next[index], [field]: value };
        // If user types in debit, clear credit (and vice versa)
        if (field === 'debit' && toNumber(value) > 0) next[index].credit = '';
        if (field === 'credit' && toNumber(value) > 0) next[index].debit = '';
        setData('lines', next);
    };

    const addLine = () => {
        setData('lines', [
            ...data.lines,
            { account_id: '', description: '', debit: '', credit: '' },
        ]);
    };

    const removeLine = (index: number) => {
        if (data.lines.length <= 2) return;
        setData('lines', data.lines.filter((_, i) => i !== index));
    };

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit && entry) {
            put(`/jurnal/${entry.id}`);
        } else {
            post('/jurnal');
        }
    };

    const lineErrors = (errors as unknown) as Record<string, string>;

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? `Edit Jurnal ${entry?.entry_number}` : 'Buat Jurnal Baru'} />

            <div className="max-w-5xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Jurnal Umum', href: '/jurnal' },
                    { label: isEdit ? 'Edit' : 'Buat' },
                ]} />

                {flashError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flashError}
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <BookOpen className="text-indigo-600" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {isEdit ? `Edit Jurnal ${entry?.entry_number}` : 'Buat Jurnal Baru'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {isEdit
                                ? 'Ubah baris dan keterangan jurnal draft'
                                : 'Jurnal akan disimpan sebagai draft sebelum diposting'}
                        </p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    {/* Header fields */}
                    <Card className="mb-4">
                        <CardContent className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Tanggal Jurnal" required error={errors.date}>
                                    <Input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                        aria-invalid={!!errors.date}
                                    />
                                </FormField>

                                <FormField label="Jenis" error={(errors as any).is_adjusting}>
                                    <label className="flex items-center gap-2 h-10 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300"
                                            checked={data.is_adjusting}
                                            onChange={(e) => setData('is_adjusting', e.target.checked)}
                                        />
                                        <span className="text-sm">Jurnal penyesuaian</span>
                                    </label>
                                </FormField>
                            </div>

                            <FormField
                                label="Keterangan"
                                required
                                error={errors.description}
                                hint="Deskripsikan tujuan atau alasan jurnal ini"
                            >
                                <Textarea
                                    placeholder="Contoh: Penyesuaian akhir bulan — beban penyusutan peralatan"
                                    rows={2}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    aria-invalid={!!errors.description}
                                />
                            </FormField>
                        </CardContent>
                    </Card>

                    {/* Lines editor */}
                    <Card className="mb-4">
                        <div className="px-6 py-3.5 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen size={16} className="text-muted-foreground" />
                                <span className="text-sm font-semibold">Baris Jurnal</span>
                            </div>
                            <Button type="button" size="sm" variant="outline" onClick={addLine} className="gap-1">
                                <Plus size={14} />
                                Tambah Baris
                            </Button>
                        </div>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b text-xs text-muted-foreground">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium w-[30%]">Akun *</th>
                                        <th className="text-left px-3 py-2 font-medium">Keterangan Baris</th>
                                        <th className="text-right px-3 py-2 font-medium w-[15%]">Debit</th>
                                        <th className="text-right px-3 py-2 font-medium w-[15%]">Kredit</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.lines.map((line, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="px-3 py-2 align-top">
                                                <Select
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
                                                    value={line.account_id}
                                                    onChange={(e) => updateLine(i, 'account_id', e.target.value)}
                                                    aria-invalid={!!lineErrors[`lines.${i}.account_id`]}
                                                >
                                                    <option value="">-- Pilih akun --</option>
                                                    {accounts.map((a) => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.code} — {a.name} ({a.type_label})
                                                        </option>
                                                    ))}
                                                </Select>
                                                {lineErrors[`lines.${i}.account_id`] && (
                                                    <p className="mt-1 text-xs text-destructive">
                                                        {lineErrors[`lines.${i}.account_id`]}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <Input
                                                    placeholder="Opsional"
                                                    value={line.description}
                                                    onChange={(e) => updateLine(i, 'description', e.target.value)}
                                                    className="h-9"
                                                />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    placeholder="0"
                                                    value={line.debit}
                                                    onChange={(e) => updateLine(i, 'debit', e.target.value)}
                                                    className="h-9 text-right"
                                                    aria-invalid={!!lineErrors[`lines.${i}.debit`]}
                                                />
                                                {lineErrors[`lines.${i}.debit`] && (
                                                    <p className="mt-1 text-xs text-destructive">
                                                        {lineErrors[`lines.${i}.debit`]}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    placeholder="0"
                                                    value={line.credit}
                                                    onChange={(e) => updateLine(i, 'credit', e.target.value)}
                                                    className="h-9 text-right"
                                                    aria-invalid={!!lineErrors[`lines.${i}.credit`]}
                                                />
                                                {lineErrors[`lines.${i}.credit`] && (
                                                    <p className="mt-1 text-xs text-destructive">
                                                        {lineErrors[`lines.${i}.credit`]}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 align-top text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(i)}
                                                    disabled={data.lines.length <= 2}
                                                    className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Hapus baris"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t">
                                    <tr>
                                        <td colSpan={2} className="px-3 py-3 text-right text-sm font-semibold">
                                            Total
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold tabular-nums">
                                            {formatCurrency(totals.debit)}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold tabular-nums">
                                            {formatCurrency(totals.credit)}
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} className="px-3 py-2 text-right text-xs text-muted-foreground">
                                            Selisih (Debit − Kredit)
                                        </td>
                                        <td
                                            colSpan={2}
                                            className={`px-3 py-2 text-right text-sm font-semibold tabular-nums ${
                                                totals.diff === 0 ? 'text-green-700' : 'text-red-600'
                                            }`}
                                        >
                                            {formatCurrency(totals.diff)}
                                            {totals.diff === 0 && totals.debit > 0 && ' ✓ Seimbang'}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>

                            {lineErrors['lines'] && (
                                <p className="px-6 py-3 text-xs text-destructive border-t bg-red-50">
                                    {lineErrors['lines']}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info */}
                    <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                        <p className="font-medium mb-1">Informasi:</p>
                        <ul className="space-y-0.5 text-indigo-700 text-xs">
                            <li>• Total Debit harus sama dengan total Kredit.</li>
                            <li>• Satu baris hanya boleh memiliki nilai Debit <strong>atau</strong> Kredit.</li>
                            <li>• Minimal 2 baris jurnal diperlukan.</li>
                            <li>• Jurnal akan disimpan sebagai <strong>draft</strong> — posting dilakukan dari halaman detail.</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <Link href={isEdit && entry ? `/jurnal/${entry.id}` : '/jurnal'}>
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={processing || !isBalanced}
                            className="gap-2 min-w-40"
                        >
                            <Save size={16} />
                            {processing ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan sebagai Draft'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
