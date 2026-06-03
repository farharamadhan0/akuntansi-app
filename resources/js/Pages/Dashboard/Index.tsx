import { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { FileClock, ArrowRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import WidgetGrid from "./components/WidgetGrid";
import CustomizeModal from "./components/CustomizeModal";
import { getDefaultLayout, mergeWithDefaults, type WidgetLayoutItem } from "./widgets/registry";
import type { DashboardProps } from "./types";

export default function Dashboard({
    stats,
    cashBankAccounts,
    recentTransactions,
    receivableAging,
    payableAging,
    trend,
    topExpenseCategories,
    currentMonth,
    layout: savedLayout,
}: DashboardProps) {
    const [layout, setLayout] = useState<WidgetLayoutItem[]>(() =>
        savedLayout ? mergeWithDefaults(savedLayout) : getDefaultLayout()
    );
    const [showCustomize, setShowCustomize] = useState(false);

    const handleSaveLayout = (newLayout: WidgetLayoutItem[]) => {
        setLayout(newLayout);
        setShowCustomize(false);
        router.post("/dashboard/preferences", { layout: newLayout } as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const dashboardData = {
        stats,
        cashBankAccounts,
        recentTransactions,
        receivableAging,
        payableAging,
        trend,
        topExpenseCategories,
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
                        Sesuaikan
                    </Button>
                </div>
            </div>

            <WidgetGrid layout={layout} data={dashboardData} />

            <CustomizeModal
                open={showCustomize}
                layout={layout}
                onSave={handleSaveLayout}
                onClose={() => setShowCustomize(false)}
            />
        </AuthenticatedLayout>
    );
}
