import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect, FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Banknote, AlertTriangle, Check } from 'lucide-react';

interface Receivable {
    id: number;
    receivable_number: string;
    customer_id: number;
    customer_name: string;
    date: string;
    due_date: string;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    description: string;
    is_overdue: boolean;
}

interface CashBankAccount {
    id: number;
    name: string;
    type: 'cash' | 'bank';
}

interface Props {
    receivables: Receivable[];
    cashBankAccounts: CashBankAccount[];
    preselectedCustomerId: number | null;
}

interface Allocation {
    id: number;
    amount: string;
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
        month: 'short',
        year: 'numeric',
    });
}

export default function Create({ receivables, cashBankAccounts, preselectedCustomerId }: Props) {
    const { flash } = usePage().props as { flash?: { error?: string } };
    const flashError = flash?.error;

    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(preselectedCustomerId);
    const [allocations, setAllocations] = useState<Record<number, string>>({});

    const { data, setData, post, processing, errors } = useForm({
        date: new Date().toISOString().split('T')[0],
        cash_bank_account_id: '',
        description: '',
        reference: '',
        allocations: [] as Allocation[],
    });

    // Filter receivables by selected customer
    const filteredReceivables = selectedCustomerId
        ? receivables.filter(r => r.customer_id === selectedCustomerId)
        : receivables;

    // Unique customers
    const customers = Array.from(
        new Map(receivables.map(r => [r.customer_id, { id: r.customer_id, name: r.customer_name }])).values()
    );

    // Calculate total
    const totalAllocation = Object.values(allocations).reduce(
        (sum, val) => sum + (parseFloat(val) || 0),
        0
    );

    // Update form allocations when state changes
    useEffect(() => {
        const formAllocations = Object.entries(allocations)
            .filter(([_, amount]) => parseFloat(amount) > 0)
            .map(([id, amount]) => ({
                id: parseInt(id),
                amount,
            }));
        setData('allocations', formAllocations);
    }, [allocations]);

    const handleAllocationChange = (receivableId: number, value: string) => {
        setAllocations(prev => ({
            ...prev,
            [receivableId]: value,
        }));
    };

    const handlePayFull = (receivable: Receivable) => {
        setAllocations(prev => ({
            ...prev,
            [receivable.id]: receivable.remaining_amount.toString(),
        }));
    };

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/transaksi/piutang-bayar');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Catat Pembayaran Piutang" />

            <div className="max-w-3xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Transaksi' },
                    { label: 'Piutang', href: '/transaksi/piutang' },
                    { label: 'Catat Pembayaran' },
                ]} />

                {flashError && (
                    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {flashError}
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <Banknote className="text-green-600" size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Catat Pembayaran Piutang</h1>
                        <p className="text-sm text-gray-500">
                            Terima pembayaran dari pelanggan
                        </p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    {/* Payment Info */}
                    <Card className="mb-4">
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Tanggal" error={errors.date} required>
                                    <Input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </FormField>

                                <FormField label="Terima di" error={errors.cash_bank_account_id} required>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={data.cash_bank_account_id}
                                        onChange={(e) => setData('cash_bank_account_id', e.target.value)}
                                    >
                                        <option value="">Pilih kas/bank...</option>
                                        {cashBankAccounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} ({acc.type === 'cash' ? 'Kas' : 'Bank'})
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>

                            <FormField label="Keterangan" error={errors.description}>
                                <Textarea
                                    placeholder="Keterangan pembayaran (opsional)"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={2}
                                />
                            </FormField>

                            <FormField label="Referensi" error={errors.reference}>
                                <Input
                                    placeholder="No. Bukti, Slip, dll (opsional)"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                />
                            </FormField>
                        </CardContent>
                    </Card>

                    {/* Customer Filter */}
                    <Card className="mb-4">
                        <CardContent className="p-4">
                            <FormField label="Filter Pelanggan">
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedCustomerId ?? ''}
                                    onChange={(e) => {
                                        setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null);
                                        setAllocations({});
                                    }}
                                >
                                    <option value="">Semua pelanggan</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </FormField>
                        </CardContent>
                    </Card>

                    {/* Receivables List */}
                    <Card className="mb-4">
                        <CardContent className="p-0">
                            <div className="p-4 border-b bg-gray-50">
                                <h3 className="font-medium text-gray-900">Piutang Belum Lunas</h3>
                                <p className="text-sm text-gray-500">
                                    Masukkan jumlah pembayaran untuk setiap piutang
                                </p>
                            </div>

                            {filteredReceivables.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    Tidak ada piutang yang belum lunas
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredReceivables.map((r) => (
                                        <div 
                                            key={r.id} 
                                            className={`p-4 ${r.is_overdue ? 'bg-red-50' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm text-gray-500">
                                                            {r.receivable_number}
                                                        </span>
                                                        {r.is_overdue && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                                                <AlertTriangle size={12} />
                                                                Jatuh Tempo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {r.customer_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 truncate">
                                                        {r.description}
                                                    </p>
                                                    <div className="mt-1 text-sm text-gray-500">
                                                        <span>Jatuh tempo: {formatDate(r.due_date)}</span>
                                                        <span className="mx-2">•</span>
                                                        <span>Sisa: <strong className="text-blue-600">{formatCurrency(r.remaining_amount)}</strong></span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-40">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={r.remaining_amount}
                                                            step="1"
                                                            placeholder="0"
                                                            value={allocations[r.id] || ''}
                                                            onChange={(e) => handleAllocationChange(r.id, e.target.value)}
                                                            className="text-right"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handlePayFull(r)}
                                                        title="Bayar Lunas"
                                                    >
                                                        <Check size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                            {errors[`allocations.${Object.keys(allocations).indexOf(r.id.toString())}.amount`] && (
                                                <p className="text-sm text-destructive mt-1">
                                                    {errors[`allocations.${Object.keys(allocations).indexOf(r.id.toString())}.amount`]}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary & Submit */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Pembayaran</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(totalAllocation)}
                                    </p>
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={processing || totalAllocation === 0}
                                    className="gap-2"
                                >
                                    <Banknote size={18} />
                                    Simpan Pembayaran
                                </Button>
                            </div>

                            {errors.allocations && (
                                <p className="text-sm text-destructive mt-2">{errors.allocations}</p>
                            )}

                            {/* Journal Info */}
                            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                                <p className="font-medium text-blue-800">Jurnal Otomatis</p>
                                <p className="text-blue-700">
                                    Debit: Kas/Bank | Kredit: Piutang Usaha
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
