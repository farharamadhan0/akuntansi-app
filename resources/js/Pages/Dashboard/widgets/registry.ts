export type WidgetSize = 'full' | '2/3' | '1/3' | '1/2';

export interface WidgetMeta {
    id: string;
    label: string;
    description: string;
    defaultVisible: boolean;
    defaultOrder: number;
    defaultSize: WidgetSize;
}

export interface WidgetLayoutItem {
    widgetId: string;
    visible: boolean;
    order: number;
    size: WidgetSize;
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
    {
        id: 'summary-cards',
        label: 'Ringkasan Keuangan',
        description: 'Uang masuk, keluar, penjualan, dan laba bulan ini',
        defaultVisible: true,
        defaultOrder: 1,
        defaultSize: 'full',
    },
    {
        id: 'sales-margin',
        label: 'Margin Penjualan',
        description: 'Penjualan, HPP, laba kotor, dan margin bulan ini',
        defaultVisible: true,
        defaultOrder: 2,
        defaultSize: '1/2',
    },
    {
        id: 'trend-chart',
        label: 'Tren 6 Bulan',
        description: 'Grafik pemasukan vs pengeluaran 6 bulan terakhir',
        defaultVisible: true,
        defaultOrder: 3,
        defaultSize: '2/3',
    },
    {
        id: 'top-expense',
        label: 'Top Kategori Pengeluaran',
        description: 'Kategori pengeluaran terbesar bulan ini',
        defaultVisible: true,
        defaultOrder: 4,
        defaultSize: '1/3',
    },
    {
        id: 'receivable',
        label: 'Piutang Belum Lunas',
        description: 'Ringkasan dan aging piutang',
        defaultVisible: true,
        defaultOrder: 5,
        defaultSize: '1/2',
    },
    {
        id: 'payable',
        label: 'Hutang Belum Lunas',
        description: 'Ringkasan dan aging hutang',
        defaultVisible: true,
        defaultOrder: 6,
        defaultSize: '1/2',
    },
    {
        id: 'cash-bank',
        label: 'Saldo Kas & Bank',
        description: 'Daftar saldo akun kas dan bank',
        defaultVisible: true,
        defaultOrder: 7,
        defaultSize: '1/2',
    },
    {
        id: 'stock-attention',
        label: 'Stok Perlu Perhatian',
        description: 'Stok rendah, stok negatif, dan produk yang belum terjual',
        defaultVisible: true,
        defaultOrder: 8,
        defaultSize: '1/2',
    },
    {
        id: 'recent-transactions',
        label: 'Transaksi Terakhir',
        description: '5 transaksi terakhir yang tercatat',
        defaultVisible: true,
        defaultOrder: 9,
        defaultSize: '1/2',
    },
];

export function getDefaultLayout(): WidgetLayoutItem[] {
    return WIDGET_REGISTRY.map((w) => ({
        widgetId: w.id,
        visible: w.defaultVisible,
        order: w.defaultOrder,
        size: w.defaultSize,
    }));
}

export function getEmptyLayout(): WidgetLayoutItem[] {
    return WIDGET_REGISTRY.map((w) => ({
        widgetId: w.id,
        visible: false,
        order: w.defaultOrder,
        size: w.defaultSize,
    }));
}

export function mergeWithDefaults(saved: WidgetLayoutItem[]): WidgetLayoutItem[] {
    const savedMap = new Map(saved.map((s) => [s.widgetId, s]));
    const merged: WidgetLayoutItem[] = [];

    // Keep saved items in their order
    for (const s of saved) {
        if (WIDGET_REGISTRY.find((w) => w.id === s.widgetId)) {
            merged.push(s);
        }
    }

    // Add any new widgets not in saved layout
    for (const w of WIDGET_REGISTRY) {
        if (!savedMap.has(w.id)) {
            merged.push({
                widgetId: w.id,
                visible: w.defaultVisible,
                order: merged.length + 1,
                size: w.defaultSize,
            });
        }
    }

    // Reindex order
    return merged.map((item, i) => ({ ...item, order: i + 1 }));
}
