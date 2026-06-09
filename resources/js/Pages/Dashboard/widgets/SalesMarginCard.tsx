import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Calculator, Percent, Wallet } from "lucide-react";
import { formatCurrency } from "../helpers";

interface SalesMarginCardProps {
    stats: {
        salesThisMonth: number;
        salesCostThisMonth: number;
        grossProfitThisMonth: number;
        grossMarginThisMonth: number | null;
    };
    currentMonth: string;
}

const metricCards = [
    {
        key: "salesThisMonth",
        label: "Penjualan",
        icon: Wallet,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        valueColor: "text-blue-700",
    },
    {
        key: "salesCostThisMonth",
        label: "HPP",
        icon: Calculator,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
    },
    {
        key: "grossProfitThisMonth",
        label: "Laba Kotor",
        icon: BarChart3,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-700",
    },
] as const;

export default function SalesMarginCard({
    stats,
    currentMonth,
}: SalesMarginCardProps) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium text-gray-500">
                            Margin Penjualan
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Periode {currentMonth}
                        </p>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-2">
                        <Percent size={16} className="text-slate-600" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {metricCards.map((item) => {
                        const Icon = item.icon;
                        const value = stats[item.key];

                        return (
                            <div key={item.key} className="rounded-lg border border-gray-200 p-3">
                                <div className="flex items-center gap-2">
                                    <div className={`rounded-md p-1.5 ${item.iconBg}`}>
                                        <Icon size={14} className={item.iconColor} />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">
                                        {item.label}
                                    </span>
                                </div>
                                <p className={`mt-3 text-base font-bold sm:text-lg ${item.valueColor}`}>
                                    {formatCurrency(value)}
                                </p>
                            </div>
                        );
                    })}

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <div className="flex items-center gap-2">
                            <div className="rounded-md bg-slate-200 p-1.5">
                                <Percent size={14} className="text-slate-700" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">
                                Margin
                            </span>
                        </div>
                        <p className="mt-3 text-2xl font-bold text-slate-900">
                            {stats.grossMarginThisMonth !== null
                                ? `${stats.grossMarginThisMonth.toFixed(1)}%`
                                : "-"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            {(stats.grossMarginThisMonth ?? 0) >= 0
                                ? "Laba kotor dibagi total penjualan"
                                : "Margin negatif pada periode ini"}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
