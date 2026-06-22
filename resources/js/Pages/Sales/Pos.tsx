import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatRupiah } from '@/lib/format';
import { ArrowLeft, CalendarDays, CheckCircle2, Minus, Plus, Printer, RefreshCw, Save, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
    receiptSale?: ReceiptSale | null;
    autoPrint?: boolean;
    summary: PosSummary;
}

interface CartItem {
    product_id: string;
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
    discount_amount: string;
}

type PosForm = {
    partner_id: string;
    date: string;
    due_date: string;
    payment_type: 'cash';
    cash_bank_account_id: string;
    notes: string;
    print_receipt: boolean;
    items: CartItem[];
};

interface ReceiptItem {
    id: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_amount: number;
    line_total: number;
    product: {
        name: string;
        product_code: string;
        sku?: string | null;
    } | null;
}

interface ReceiptSale {
    id: number;
    company_name: string;
    sale_number: string;
    date: string;
    posted_at: string | null;
    payment_type: string;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
    reference?: string | null;
    notes?: string | null;
    cash_bank_account: { name: string } | null;
    partner: { name: string; code?: string | null } | null;
    items: ReceiptItem[];
}

interface PosSummary {
    transaction_count: number;
    total_amount: number;
    last_sale_number?: string | null;
    last_sale_amount?: number | null;
}

interface HeldCart {
    id: string;
    label: string;
    saved_at: string;
    data: {
        cash_bank_account_id: string;
        notes: string;
        cash_received: string;
        discount_amount: string;
        items: CartItem[];
    };
}

const HOLD_STORAGE_KEY = 'emwal.pos.held_carts';

const emptyCartItem = (product: Product): CartItem => ({
    product_id: String(product.id),
    description: product.name,
    quantity: '1',
    unit: product.unit,
    unit_price: String(Number(product.sales_price ?? 0)),
    discount_amount: '0',
});

const lineTotal = (item: CartItem): number =>
    Number(item.quantity || 0) * Number(item.unit_price || 0)
        - Number(item.discount_amount || 0);

const lineSubtotal = (item: CartItem): number =>
    Number(item.quantity || 0) * Number(item.unit_price || 0);

const distributeAmount = (amount: number, items: CartItem[]): number[] => {
    const totalBase = items.reduce((sum, item) => sum + lineSubtotal(item), 0);

    if (amount <= 0 || totalBase <= 0 || items.length === 0) {
        return items.map(() => 0);
    }

    let allocated = 0;

    return items.map((item, index) => {
        if (index === items.length - 1) {
            return Math.max(0, Number((amount - allocated).toFixed(2)));
        }

        const share = Number(((lineSubtotal(item) / totalBase) * amount).toFixed(2));
        allocated += share;

        return share;
    });
};

function ReceiptPrint({ sale }: { sale: ReceiptSale }) {
    return (
        <section className="thermal-receipt hidden bg-white p-0 text-sm text-gray-900 print:block">
            <div className="border-b border-dashed border-gray-300 pb-4 text-center">
                <p className="text-base font-bold">{sale.company_name}</p>
                <p className="mt-1 text-xs text-gray-500">Struk penjualan</p>
            </div>

            <div className="space-y-1 border-b border-dashed border-gray-300 py-4 text-xs">
                <div className="flex justify-between gap-3">
                    <span>No</span>
                    <span className="text-right font-medium">{sale.sale_number}</span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Tanggal</span>
                    <span className="text-right">{sale.date}</span>
                </div>
                {sale.posted_at && (
                    <div className="flex justify-between gap-3">
                        <span>Posting</span>
                        <span className="text-right">{sale.posted_at}</span>
                    </div>
                )}
                <div className="flex justify-between gap-3">
                    <span>Bayar</span>
                    <span className="text-right">
                        {sale.payment_type === 'cash' ? 'Tunai' : 'Kredit'}
                    </span>
                </div>
                {sale.cash_bank_account && (
                    <div className="flex justify-between gap-3">
                        <span>Kas/Bank</span>
                        <span className="text-right">{sale.cash_bank_account.name}</span>
                    </div>
                )}
            </div>

            <div className="divide-y divide-dashed divide-gray-200 border-b border-dashed border-gray-300">
                {sale.items.map((item) => (
                    <div key={item.id} className="py-3">
                        <div className="flex justify-between gap-3">
                            <p className="font-medium">{item.description}</p>
                            <p className="shrink-0 font-semibold">
                                {formatRupiah(item.line_total)}
                            </p>
                        </div>
                        <div className="mt-1 flex justify-between gap-3 text-xs text-gray-500">
                            <span>
                                {item.quantity.toLocaleString('id-ID')} {item.unit} x {formatRupiah(item.unit_price)}
                            </span>
                            {item.product?.sku && <span>SKU {item.product.sku}</span>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-1 border-b border-dashed border-gray-300 py-4">
                <div className="flex justify-between gap-3 text-xs">
                    <span>Subtotal</span>
                    <span>{formatRupiah(sale.subtotal)}</span>
                </div>
                {sale.discount_amount > 0 && (
                    <div className="flex justify-between gap-3 text-xs">
                        <span>Diskon</span>
                        <span>{formatRupiah(sale.discount_amount)}</span>
                    </div>
                )}
                <div className="flex justify-between gap-3 pt-2 text-base font-bold">
                    <span>Total</span>
                    <span>{formatRupiah(sale.total_amount)}</span>
                </div>
            </div>

            {sale.notes && (
                <div className="border-b border-dashed border-gray-300 py-4 text-xs">
                    <p className="font-medium">Catatan</p>
                    <p className="mt-1 whitespace-pre-wrap text-gray-600">{sale.notes}</p>
                </div>
            )}

            <div className="pt-4 text-center text-xs text-gray-500">
                <p>Terima kasih.</p>
            </div>
        </section>
    );
}

export default function Pos({ cashBankAccounts, products, receiptSale, autoPrint = false, summary }: Props) {
    const { flash } = usePage().props as { flash?: Flash };
    const defaultCashBankAccountId = cashBankAccounts[0] ? String(cashBankAccounts[0].id) : '';
    const [query, setQuery] = useState('');
    const [cashReceived, setCashReceived] = useState('');
    const [globalDiscount, setGlobalDiscount] = useState('');
    const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
    const [lastReceipt, setLastReceipt] = useState<ReceiptSale | null>(receiptSale ?? null);
    const [transactionCompleted, setTransactionCompleted] = useState(Boolean(receiptSale));

    const { data, setData, post, processing, errors, transform } = useForm<PosForm>({
        partner_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: '',
        payment_type: 'cash',
        cash_bank_account_id: defaultCashBankAccountId,
        notes: '',
        print_receipt: false,
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

    const exactProduct = useMemo(() => {
        const normalized = query.trim().toLowerCase();

        if (!normalized) {
            return null;
        }

        return indexedProducts.find((product) =>
            product.product_code.toLowerCase() === normalized ||
            (product.sku ?? '').toLowerCase() === normalized
        ) ?? null;
    }, [indexedProducts, query]);

    const cartSubtotal = data.items.reduce((total, item) => total + lineSubtotal(item), 0);
    const discountAmount = Math.min(Number(globalDiscount || 0), cartSubtotal);
    const cartTotal = Math.max(0, cartSubtotal - discountAmount);
    const changeAmount = Math.max(Number(cashReceived || 0) - cartTotal, 0);
    const canSubmit = data.items.length > 0 && !!data.cash_bank_account_id && cartTotal > 0;
    const showCompletedState = transactionCompleted && !!lastReceipt && data.items.length === 0;

    const resetCart = () => {
        setData({
            ...data,
            partner_id: '',
            date: new Date().toISOString().split('T')[0],
            due_date: '',
            payment_type: 'cash',
            cash_bank_account_id: data.cash_bank_account_id || defaultCashBankAccountId,
            notes: '',
            print_receipt: false,
            items: [],
        });
        setCashReceived('');
        setGlobalDiscount('');
        setQuery('');
    };

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(HOLD_STORAGE_KEY);
            setHeldCarts(stored ? JSON.parse(stored) : []);
        } catch {
            setHeldCarts([]);
        }
    }, []);

    useEffect(() => {
        if (!receiptSale) {
            return;
        }

        setLastReceipt(receiptSale);
        setTransactionCompleted(true);

        if (!autoPrint) {
            resetCart();
            return;
        }

        const handleAfterPrint = () => {
            resetCart();
            setTransactionCompleted(true);
        };

        window.addEventListener('afterprint', handleAfterPrint);

        const timeout = window.setTimeout(() => {
            toast.dismiss();
            window.print();
        }, 300);

        return () => {
            window.clearTimeout(timeout);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [receiptSale, autoPrint]);

    const syncItems = (items: CartItem[]) => setData('items', items);

    const persistHeldCarts = (carts: HeldCart[]) => {
        setHeldCarts(carts);
        window.localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify(carts));
    };

    const startNewTransaction = () => {
        resetCart();
        setTransactionCompleted(false);
    };

    const printLastReceipt = () => {
        if (!lastReceipt) {
            return;
        }

        toast.dismiss();
        window.setTimeout(() => window.print(), 50);
    };

    const holdCart = () => {
        if (data.items.length === 0) {
            return;
        }

        const firstItem = data.items[0]?.description || 'Keranjang';
        const nextCart: HeldCart = {
            id: String(Date.now()),
            label: data.items.length > 1
                ? `${firstItem} +${data.items.length - 1} item`
                : firstItem,
            saved_at: new Date().toISOString(),
            data: {
                cash_bank_account_id: data.cash_bank_account_id,
                notes: data.notes,
                cash_received: cashReceived,
                discount_amount: globalDiscount,
                items: data.items,
            },
        };

        persistHeldCarts([nextCart, ...heldCarts].slice(0, 10));
        resetCart();
    };

    const resumeCart = (cart: HeldCart) => {
        setData({
            ...data,
            cash_bank_account_id: cart.data.cash_bank_account_id,
            notes: cart.data.notes,
            items: cart.data.items,
        });
        setCashReceived(cart.data.cash_received);
        setGlobalDiscount(cart.data.discount_amount);
        setTransactionCompleted(false);
        persistHeldCarts(heldCarts.filter((item) => item.id !== cart.id));
    };

    const removeHeldCart = (cartId: string) => {
        persistHeldCarts(heldCarts.filter((item) => item.id !== cartId));
    };

    const addProduct = (product: Product) => {
        if (transactionCompleted) {
            setTransactionCompleted(false);
        }

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

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        if (exactProduct) {
            addProduct(exactProduct);
            return;
        }

        if (filteredProducts.length === 1) {
            addProduct(filteredProducts[0]);
        }
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

    const submitTransaction = (printReceipt: boolean) => {
        const itemDiscounts = distributeAmount(discountAmount, data.items);

        transform((formData) => ({
            ...formData,
            print_receipt: printReceipt,
            items: formData.items.map((item, index) => ({
                ...item,
                discount_amount: String(itemDiscounts[index] ?? 0),
            })),
        }));

        post('/transaksi/pos');
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submitTransaction(true);
    };

    return (
        <AuthenticatedLayout fullscreen>
            <Head title="POS Kasir" />

            <div className="flex min-h-screen flex-col print:hidden lg:h-screen lg:min-h-0 lg:overflow-hidden">
                <header className="flex min-w-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 md:flex-nowrap md:px-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <h1 className="shrink-0 text-sm font-semibold text-gray-900">
                            POS Kasir
                        </h1>
                        <div className="hidden min-w-0 items-center divide-x divide-gray-200 text-xs sm:flex">
                            <div className="shrink-0 px-3">
                                <span className="text-gray-500">Transaksi </span>
                                <span className="font-semibold text-gray-900">
                                    {summary.transaction_count}
                                </span>
                            </div>
                            <div className="shrink-0 px-3">
                                <span className="text-gray-500">Total </span>
                                <span className="font-semibold text-primary">
                                    {formatRupiah(summary.total_amount)}
                                </span>
                            </div>
                            <div className="hidden min-w-0 px-3 lg:block">
                                <span className="text-gray-500">Terakhir </span>
                                <span className="font-medium text-gray-900">
                                    {summary.last_sale_number
                                        ? `${summary.last_sale_number} · ${formatRupiah(summary.last_sale_amount ?? 0)}`
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="order-3 grid w-full grid-cols-[minmax(0,1fr)_148px] gap-2 md:order-none md:ml-auto md:w-auto md:grid-cols-[minmax(220px,360px)_148px]">
                        <div className="relative min-w-0">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Cari produk, kode, atau SKU"
                                aria-label="Cari produk"
                                className="h-8 pl-8 text-xs"
                                autoFocus
                            />
                        </div>
                        <div className="relative">
                            <Input
                                type="date"
                                value={data.date}
                                onChange={(event) => setData('date', event.target.value)}
                                aria-label="Tanggal transaksi"
                                className="h-8 pr-9 text-xs"
                            />
                            <div className="absolute inset-y-0 right-0 flex w-8 items-center justify-center border-l border-gray-200 text-gray-500">
                                <CalendarDays className="size-4" />
                                <input
                                    type="date"
                                    value={data.date}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(event) => setData('date', event.target.value)}
                                    aria-label="Buka kalender tanggal transaksi"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                />
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/dashboard"
                        className="order-2 ml-auto inline-flex h-8 shrink-0 items-center justify-center gap-2 border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 md:order-none md:ml-0"
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

                <form onSubmit={submit} className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_500px] lg:overflow-hidden">
                    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-gray-200 bg-white">
                        <div className="flex items-center justify-between border-y border-gray-200 bg-gray-50 px-3 py-1.5">
                            <div>
                                <p className="text-xs font-semibold uppercase text-gray-500">
                                    Daftar Produk
                                </p>
                            </div>
                            <p className="text-xs text-gray-500">
                                {filteredProducts.length} tampil
                            </p>
                        </div>

                        <div className="grid min-h-0 flex-1 auto-rows-[128px] content-start grid-cols-1 gap-px overflow-y-auto bg-gray-200 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredProducts.map((product) => {
                                const stock = Number(product.current_stock ?? 0);
                                const stockLimited = product.is_stock_tracked && stock <= 0;

                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => addProduct(product)}
                                        disabled={stockLimited}
                                        className="flex h-32 min-h-0 flex-col justify-between bg-white p-4 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
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

                    <aside className="flex min-h-0 flex-col overflow-hidden border border-gray-200 bg-white">
                        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="size-4 text-primary" />
                                <h1 className="text-base font-semibold text-gray-900">POS Kasir</h1>
                            </div>
                            <span className="border border-gray-200 px-2 py-1 text-xs text-gray-500">
                                {data.items.length} item
                            </span>
                        </div>

                        {heldCarts.length > 0 && (
                            <div className="border-b border-gray-200 bg-gray-50 p-3">
                                <p className="mb-2 text-xs font-medium text-gray-600">Keranjang ditahan</p>
                                <div className="space-y-2">
                                    {heldCarts.map((cart) => (
                                        <div key={cart.id} className="flex items-center justify-between gap-2 border border-gray-200 bg-white px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => resumeCart(cart)}
                                                className="min-w-0 flex-1 text-left"
                                            >
                                                <p className="truncate text-xs font-medium text-gray-900">
                                                    {cart.label}
                                                </p>
                                                <p className="text-[11px] text-gray-500">
                                                    {cart.data.items.length} item · {formatRupiah(cart.data.items.reduce((sum, item) => sum + lineTotal(item), 0))}
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeHeldCart(cart.id)}
                                                className="shrink-0 text-xs font-medium text-red-600"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
                            {showCompletedState && lastReceipt && (
                                <div className="space-y-4 p-4">
                                    <div className="border border-emerald-200 bg-emerald-50 p-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-emerald-900">
                                                    Transaksi berhasil disimpan
                                                </p>
                                                <p className="mt-1 truncate text-xs text-emerald-700">
                                                    {lastReceipt.sale_number}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-2 border-t border-emerald-200 pt-3 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-emerald-700">Total</span>
                                                <span className="font-semibold text-emerald-950">
                                                    {formatRupiah(lastReceipt.total_amount)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-emerald-700">Kas/Bank</span>
                                                <span className="text-right font-medium text-emerald-950">
                                                    {lastReceipt.cash_bank_account?.name ?? '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="lg"
                                            className="h-10 text-sm"
                                            onClick={printLastReceipt}
                                        >
                                            <Printer className="size-4" />
                                            Cetak Ulang
                                        </Button>
                                        <Button
                                            type="button"
                                            size="lg"
                                            className="h-10 text-sm"
                                            onClick={startNewTransaction}
                                        >
                                            <RefreshCw className="size-4" />
                                            Transaksi Baru
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!showCompletedState && data.items.length === 0 && (
                                <div className="px-4 py-12 text-center text-sm text-gray-500">
                                    Keranjang masih kosong.
                                </div>
                            )}

                            {data.items.map((item, index) => (
                                <div key={`${item.product_id}-${index}`} className="px-3 py-2">
                                    <div className="grid grid-cols-[minmax(110px,1fr)_108px_88px_100px_28px] items-center gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-gray-900" title={item.description}>
                                                {item.description}
                                            </p>
                                            <p className="truncate text-[11px] text-gray-500">
                                                {item.unit}
                                            </p>
                                        </div>

                                        <div className="flex h-8 items-center border border-gray-200">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => stepQuantity(index, -1)}
                                                aria-label="Kurangi qty"
                                                className="h-8 w-7 shrink-0"
                                            >
                                                <Minus className="size-3.5" />
                                            </Button>
                                            <Input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={item.quantity}
                                                onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                                                className="h-7 min-w-0 border-0 px-0.5 text-center text-xs tabular-nums"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => stepQuantity(index, 1)}
                                                aria-label="Tambah qty"
                                                className="h-8 w-7 shrink-0"
                                            >
                                                <Plus className="size-3.5" />
                                            </Button>
                                        </div>

                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                                            className="h-8 px-2 text-right text-xs tabular-nums"
                                            aria-label="Harga item"
                                        />

                                        <span className="truncate text-right text-xs font-semibold text-gray-900 tabular-nums">
                                            {formatRupiah(lineTotal(item))}
                                        </span>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="size-7"
                                            onClick={() => removeItem(index)}
                                            aria-label="Hapus item"
                                        >
                                            <Trash2 className="size-3.5 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!showCompletedState && (
                            <div className="space-y-3 border-t border-gray-200 p-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Kas/Bank" error={errors.cash_bank_account_id} required>
                                        <Select
                                            value={data.cash_bank_account_id}
                                            onChange={(event) => setData('cash_bank_account_id', event.target.value)}
                                            className="h-9"
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
                                            className="h-9"
                                        />
                                    </FormField>

                                    <FormField label="Diskon">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={globalDiscount}
                                            onChange={(event) => setGlobalDiscount(event.target.value)}
                                            className="h-9"
                                        />
                                    </FormField>

                                    <FormField label="Catatan" error={errors.notes}>
                                        <Input
                                            value={data.notes}
                                            onChange={(event) => setData('notes', event.target.value)}
                                            className="h-9"
                                        />
                                    </FormField>
                                </div>

                                <div className="space-y-1.5 border-t border-gray-200 pt-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="font-medium text-gray-900">
                                            {formatRupiah(cartSubtotal)}
                                        </span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Diskon</span>
                                            <span className="font-medium text-red-600">
                                                -{formatRupiah(discountAmount)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Total</span>
                                        <span className="text-lg font-bold text-gray-900">
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

                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        className="h-10 w-full text-sm"
                                        disabled={data.items.length === 0 || processing}
                                        onClick={holdCart}
                                        title="Tahan keranjang"
                                    >
                                        Tahan Keranjang
                                    </Button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="lg"
                                            className="h-10 w-full text-xs"
                                            disabled={processing || !canSubmit}
                                            onClick={() => submitTransaction(false)}
                                        >
                                            <Save className="size-4" />
                                            Tanpa Cetak
                                        </Button>

                                        <Button
                                            type="submit"
                                            size="lg"
                                            className="h-10 w-full text-xs"
                                            disabled={processing || !canSubmit}
                                        >
                                            <Printer className="size-4" />
                                            Simpan & Cetak
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </form>
            </div>

            {lastReceipt && <ReceiptPrint sale={lastReceipt} />}
        </AuthenticatedLayout>
    );
}
