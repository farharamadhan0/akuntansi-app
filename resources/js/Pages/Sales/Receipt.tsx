import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { formatDateDDMMYYYY, formatRupiah } from '@/lib/format';
import { ArrowLeft, LayoutDashboard, Printer } from 'lucide-react';

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

interface SaleReceipt {
    id: number;
    company_name: string;
    sale_number: string;
    date: string;
    posted_at: string | null;
    payment_type: string;
    source: string;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
    reference?: string | null;
    notes?: string | null;
    cash_bank_account: { name: string } | null;
    partner: { name: string; code?: string | null } | null;
    items: ReceiptItem[];
}

interface Props {
    sale: SaleReceipt;
}

export default function Receipt({ sale }: Props) {
    return (
        <AuthenticatedLayout fullscreen>
            <Head title={`Struk ${sale.sale_number}`} />

            <div className="min-h-screen bg-gray-100 print:bg-white">
                <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 print:hidden md:px-6">
                    <div className="min-w-0">
                        <h1 className="truncate text-base font-semibold text-gray-900">
                            Struk Penjualan
                        </h1>
                        <p className="truncate text-xs text-gray-500">
                            {sale.sale_number}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Link href="/transaksi/pos">
                            <Button type="button" variant="outline" size="lg">
                                <ArrowLeft className="size-4" />
                                POS
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button type="button" variant="outline" size="lg">
                                <LayoutDashboard className="size-4" />
                                Dashboard
                            </Button>
                        </Link>
                        <Button type="button" size="lg" onClick={() => window.print()}>
                            <Printer className="size-4" />
                            Cetak
                        </Button>
                    </div>
                </header>

                <main className="mx-auto max-w-sm px-4 py-6 print:m-0 print:max-w-none print:p-0">
                    <section className="thermal-receipt bg-white p-5 text-sm text-gray-900 shadow-sm print:p-0 print:shadow-none">
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
                                <span className="text-right">{formatDateDDMMYYYY(sale.date)}</span>
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
                            {sale.reference && (
                                <div className="flex justify-between gap-3">
                                    <span>Referensi</span>
                                    <span className="text-right">{sale.reference}</span>
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
                                    {item.discount_amount > 0 && (
                                        <div className="mt-1 text-xs text-gray-500">
                                            <span>Diskon {formatRupiah(item.discount_amount)}</span>
                                        </div>
                                    )}
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
                            <p className="mt-1">Barang yang sudah dibeli mengikuti ketentuan toko.</p>
                        </div>
                    </section>
                </main>
            </div>
        </AuthenticatedLayout>
    );
}
