import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatRupiah } from '@/lib/format';
import { ArrowLeft, Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';

interface CashBankAccount {
    id: number;
    name: string;
}

interface Product {
    id: number;
    product_code: string;
    sku?: string | null;
    name: string;
    product_type: string;
    unit: string;
    sales_price: number;
    is_stock_tracked: boolean;
    current_stock?: string | number | null;
}

interface Flash {
    error?: string;
}

interface Props {
    cashBankAccounts: CashBankAccount[];
    products: Product[];
}

interface CartItem {
    product_id: string;
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
    discount_amount: string;
    tax_amount: string;
}

type PosForm = {
    partner_id: string;
    date: string;
    due_date: string;
    payment_type: 'cash';
    cash_bank_account_id: string;
    notes: string;
    reference: string;
    items: CartItem[];
};

const emptyCartItem = (product: Product): CartItem => ({
    product_id: String(product.id),
    description: product.name,
    quantity: '1',
    unit: product.unit,
    unit_price: String(Number(product.sales_price ?? 0)),
    discount_amount: '0',
    tax_amount: '0',
});

const lineTotal = (item: CartItem): number =>
    Number(item.quantity || 0) * Number(item.unit_price || 0)
        - Number(item.discount_amount || 0)
        + Number(item.tax_amount || 0);

export default function Pos({ cashBankAccounts, products }: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const [query, setQuery] = useState('');
    const [cashReceived, setCashReceived] = useState('');

    const { data, setData, post, processing, errors } = useForm<PosForm>({
        partner_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: '',
        payment_type: 'cash',
        cash_bank_account_id: cashBankAccounts[0] ? String(cashBankAccounts[0].id) : '',
        notes: '',
        reference: '',
        items: [],
    });

    const indexedProducts = useMemo(
        () =>
            products.map((product) => ({
                ...product,
                searchText: [
                    product.product_code,
                    product.sku ?? '',
                    product.name,
                ].join(' ').toLowerCase(),
            })),
        [products],
    );

    const filteredProducts = useMemo(() => {
        const normalized = query.trim().toLowerCase();

        if (!normalized) {
            return indexedProducts.slice(0, 24);
        }

        return indexedProducts
            .filter((product) => product.searchText.includes(normalized))
            .slice(0, 24);
    }, [indexedProducts, query]);

    const cartTotal = data.items.reduce((total, item) => total + lineTotal(item), 0);
    const changeAmount = Math.max(Number(cashReceived || 0) - cartTotal, 0);
    const canSubmit = data.items.length > 0 && !!data.cash_bank_account_id && cartTotal > 0;

    const syncItems = (items: CartItem[]) => setData('items', items);

    const addProduct = (product: Product) => {
        const existingIndex = data.items.findIndex(
            (item) => item.product_id === String(product.id),
        );

        if (existingIndex >= 0) {
            const nextItems = [...data.items];
            const currentQty = Number(nextItems[existingIndex].quantity || 0);
            nextItems[existingIndex] = {
                ...nextItems[existingIndex],
                quantity: String(currentQty + 1),
            };
            syncItems(nextItems);
        } else {
            syncItems([...data.items, emptyCartItem(product)]);
        }

        setQuery('');
    };

    const updateItem = (index: number, key: keyof CartItem, value: string) => {
        const nextItems = [...data.items];
        nextItems[index] = { ...nextItems[index], [key]: value };
        syncItems(nextItems);
    };

    const stepQuantity = (index: number, delta: number) => {
        const currentQty = Number(data.items[index].quantity || 0);
        const nextQty = Math.max(1, currentQty + delta);
        updateItem(index, 'quantity', String(nextQty));
    };

    const removeItem = (index: number) => {
        syncItems(data.items.filter((_, itemIndex) => itemIndex !== index));
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/transaksi/pos');
    };

    return (
        <AuthenticatedLayout fullscreen>
            <Head title="POS Kasir" />

            <div className="flex min-h-screen flex-col">
                <header className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 md:px-6">
                    <div className="min-w-0">
                        <h1 className="truncate text-base font-semibold text-gray-900">
                            POS Kasir
                        </h1>
                        <p className="truncate text-xs text-gray-500">
                            Transaksi penjualan cepat
                        </p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        <ArrowLeft className="size-4" />
                        Dashboard
                    </Link>
                </header>

                {flash?.error && (
                    <div className="mx-4 mt-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive md:mx-6">
                        {flash.error}
                    </div>
                )}

                <form onSubmit={submit} className="grid min-h-0 flex-1 gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                    <section className="min-w-0 overflow-hidden border border-gray-200 bg-white">
                        <div className="border-b border-gray-200 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                                <div className="min-w-0 flex-1">
                                    <FormField label="Cari Produk">
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                                            <Input
                                                value={query}
                                                onChange={(event) => setQuery(event.target.value)}
                                                placeholder="Nama, kode, atau SKU"
                                                className="h-10 pl-8 text-sm"
                                                autoFocus
                                            />
                                        </div>
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-2 gap-3 md:w-80">
                                    <FormField label="Tanggal" error={errors.date}>
                                        <Input
                                            type="date"
                                            value={data.date}
                                            onChange={(event) => setData('date', event.target.value)}
                                            className="h-10"
                                        />
                                    </FormField>
                                    <FormField label="Referensi" error={errors.reference}>
                                        <Input
                                            value={data.reference}
                                            onChange={(event) => setData('reference', event.target.value)}
                                            className="h-10"
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        <div className="grid max-h-[calc(100vh-178px)] grid-cols-1 gap-px overflow-y-auto bg-gray-200 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredProducts.map((product) => {
                                const stock = Number(product.current_stock ?? 0);
                                const stockLimited = product.is_stock_tracked && stock <= 0;

                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => addProduct(product)}
                                        disabled={stockLimited}
                                        className="flex min-h-32 flex-col justify-between bg-white p-4 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                                                    {product.name}
                                                </p>
                                                <span className="shrink-0 border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
                                                    {product.product_code}
                                                </span>
                                            </div>
                                            {product.sku && (
                                                <p className="mt-1 truncate text-xs text-gray-500">
                                                    SKU {product.sku}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-4 flex items-end justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-primary">
                                                    {formatRupiah(Number(product.sales_price ?? 0))}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    per {product.unit}
                                                </p>
                                            </div>
                                            {product.is_stock_tracked && (
                                                <span className="text-xs text-gray-500">
                                                    Stok {stock.toLocaleString('id-ID')} {product.unit}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {filteredProducts.length === 0 && (
                            <div className="border-t border-gray-200 bg-white px-4 py-16 text-center text-sm text-gray-500">
                                Produk tidak ditemukan.
                            </div>
                        )}
                    </section>

                    <aside className="flex min-h-0 flex-col border border-gray-200 bg-white">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="size-4 text-primary" />
                                <h1 className="text-base font-semibold text-gray-900">POS Kasir</h1>
                            </div>
                            <span className="border border-gray-200 px-2 py-1 text-xs text-gray-500">
                                {data.items.length} item
                            </span>
                        </div>

                        <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
                            {data.items.length === 0 && (
                                <div className="px-4 py-12 text-center text-sm text-gray-500">
                                    Keranjang masih kosong.
                                </div>
                            )}

                            {data.items.map((item, index) => (
                                <div key={`${item.product_id}-${index}`} className="space-y-3 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-gray-900">
                                                {item.description}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatRupiah(Number(item.unit_price || 0))} / {item.unit}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => removeItem(index)}
                                            aria-label="Hapus item"
                                        >
                                            <Trash2 className="size-4 text-red-500" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
                                        <div className="flex h-9 items-center border border-gray-200">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => stepQuantity(index, -1)}
                                                aria-label="Kurangi qty"
                                                className="h-9 w-9"
                                            >
                                                <Minus className="size-4" />
                                            </Button>
                                            <Input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={item.quantity}
                                                onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                                                className="h-8 border-0 px-1 text-center"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => stepQuantity(index, 1)}
                                                aria-label="Tambah qty"
                                                className="h-9 w-9"
                                            >
                                                <Plus className="size-4" />
                                            </Button>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                                            className="h-9"
                                            aria-label="Harga item"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="font-semibold text-gray-900">
                                            {formatRupiah(lineTotal(item))}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 border-t border-gray-200 p-4">
                            <FormField label="Kas/Bank" error={errors.cash_bank_account_id} required>
                                <Select
                                    value={data.cash_bank_account_id}
                                    onChange={(event) => setData('cash_bank_account_id', event.target.value)}
                                    className="h-10"
                                >
                                    <option value="">Pilih Kas/Bank</option>
                                    {cashBankAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormField>

                            <FormField label="Uang Diterima">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cashReceived}
                                    onChange={(event) => setCashReceived(event.target.value)}
                                    className="h-10"
                                />
                            </FormField>

                            <FormField label="Catatan" error={errors.notes}>
                                <Input
                                    value={data.notes}
                                    onChange={(event) => setData('notes', event.target.value)}
                                    className="h-10"
                                />
                            </FormField>

                            <div className="space-y-2 border-t border-gray-200 pt-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Total</span>
                                    <span className="text-xl font-bold text-gray-900">
                                        {formatRupiah(cartTotal)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Kembalian</span>
                                    <span className="font-semibold text-emerald-700">
                                        {formatRupiah(changeAmount)}
                                    </span>
                                </div>
                            </div>

                            {errors.items && (
                                <p className="text-xs text-red-600">{errors.items}</p>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="h-11 w-full text-sm"
                                disabled={processing || !canSubmit}
                            >
                                Simpan Transaksi
                            </Button>
                        </div>
                    </aside>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
