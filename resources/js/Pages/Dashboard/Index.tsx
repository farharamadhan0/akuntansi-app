import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import { BarChart3, Eye, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import WidgetGrid from "./components/WidgetGrid";
import CustomizeModal from "./components/CustomizeModal";
import { getDefaultLayout, getEmptyLayout, mergeWithDefaults, WIDGET_REGISTRY, type WidgetLayoutItem } from "./widgets/registry";
import type { DashboardProps } from "./types";

const RECOMMENDED_WIDGET_IDS = WIDGET_REGISTRY.slice(0, 4).map((widget) => widget.id);
const RECOMMENDED_WIDGETS = WIDGET_REGISTRY.filter((widget) =>
    RECOMMENDED_WIDGET_IDS.includes(widget.id)
);

function getRecommendedLayout(): WidgetLayoutItem[] {
    return getDefaultLayout().map((item) => ({
        ...item,
        visible: RECOMMENDED_WIDGET_IDS.includes(item.widgetId),
    }));
}

function DashboardEmptyState({
    onUseDefault,
    onCustomize,
}: {
    onUseDefault: () => void;
    onCustomize: () => void;
}) {
    return (
        <section className="min-h-[50vh]">
            <div className="border border-gray-200 bg-white">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="p-6 sm:p-8">
                        <div className="flex h-10 w-10 items-center justify-center border border-primary/20 bg-primary/10 text-primary">
                            <LayoutDashboard size={20} />
                        </div>
                        <div className="mt-5 max-w-2xl">
                            <p className="text-xl font-semibold text-gray-900">
                                Dashboard belum punya widget aktif
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-500">
                                Pilih widget yang ingin ditampilkan untuk memantau kas, transaksi,
                                piutang, hutang, penjualan, dan stok dari satu tempat.
                            </p>
                        </div>

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                            <Button type="button" onClick={onUseDefault} className="h-9 gap-1.5">
                                <Sparkles size={16} />
                                Pakai Rekomendasi
                            </Button>
                            <Button type="button" variant="outline" onClick={onCustomize} className="h-9 gap-1.5">
                                <Settings size={16} />
                                Pilih Manual
                            </Button>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 bg-gray-50 p-5 lg:border-l lg:border-t-0">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase text-gray-400">
                            <Eye size={14} />
                            Widget rekomendasi
                        </div>
                        <div className="mt-4 space-y-2">
                            {RECOMMENDED_WIDGETS.map((widget) => (
                                <div key={widget.id} className="border border-gray-200 bg-white px-3 py-2.5">
                                    <p className="text-sm font-medium text-gray-800">{widget.label}</p>
                                    <p className="mt-0.5 text-xs leading-5 text-gray-500">
                                        {widget.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function Dashboard({
    stats,
    cashBankAccounts,
    recentTransactions,
    receivableAging,
    payableAging,
    trend,
    topExpenseCategories,
    topSellingProducts,
    stockAttention,
    currentMonth,
    layout: savedLayout,
}: DashboardProps) {
    const [layout, setLayout] = useState<WidgetLayoutItem[]>(() =>
        savedLayout ? mergeWithDefaults(savedLayout) : getEmptyLayout()
    );
    const [showCustomize, setShowCustomize] = useState(false);
    const hasVisibleWidgets = layout.some((item) => item.visible);

    const handleSaveLayout = (newLayout: WidgetLayoutItem[]) => {
        setLayout(newLayout);
        setShowCustomize(false);
        router.post("/dashboard/preferences", { layout: newLayout } as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const useDefaultLayout = () => {
        handleSaveLayout(getRecommendedLayout());
    };

    const dashboardData = {
        stats,
        cashBankAccounts,
        recentTransactions,
        receivableAging,
        payableAging,
        trend,
        topExpenseCategories,
        topSellingProducts,
        stockAttention,
        currentMonth,
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Periode: <span className="font-medium">{currentMonth}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomize(true)}
                    >
                        <Settings size={14} />
                        Atur Widget
                    </Button>
                </div>
            </div>

            {hasVisibleWidgets ? (
                <WidgetGrid layout={layout} data={dashboardData} />
            ) : (
                <DashboardEmptyState
                    onUseDefault={useDefaultLayout}
                    onCustomize={() => setShowCustomize(true)}
                />
            )}

            <CustomizeModal
                open={showCustomize}
                layout={layout}
                onSave={handleSaveLayout}
                onClose={() => setShowCustomize(false)}
            />
        </AuthenticatedLayout>
    );
}
