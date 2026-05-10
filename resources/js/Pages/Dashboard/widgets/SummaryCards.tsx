import { Link } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    DollarSign,
    LucideIcon,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "../helpers";

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    valueColor: string;
    link?: string;
    delta?: { pct: number | null; direction: "up" | "down" | "flat" };
    deltaGoodDirection?: "up" | "down";
    subtitle?: string;
}

function StatCard({
    title,
    value,
    icon: Icon,
    iconBg,
    iconColor,
    valueColor,
    link,
    delta,
    deltaGoodDirection,
    subtitle,
}: StatCardProps) {
    const renderDelta = () => {
        if (!delta || delta.direction === "flat") return null;
        const isGood = delta.direction === deltaGoodDirection;
        const colorClass = isGood ? "text-emerald-600" : "text-red-600";
        const ArrowIcon = delta.direction === "up" ? ArrowUpRight : ArrowDownRight;
        const label =
            delta.pct === null
                ? "baru"
                : `${Math.abs(delta.pct).toFixed(1)}%`;
        return (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
                <ArrowIcon size={12} />
                {label}
            </span>
        );
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${iconBg}`}>
                            <Icon size={14} className={iconColor} />
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                            {title}
                        </span>
                    </div>
                    {link && (
                        <Link
                            href={link}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Detail
                        </Link>
                    )}
                </div>
                <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
                <div className="flex items-center gap-2 mt-0.5 min-h-4">
                    {renderDelta()}
                    {subtitle && (
                        <span className="text-xs text-gray-400">{subtitle}</span>
                    )}
                    {delta && delta.direction !== "flat" && !subtitle && (
                        <span className="text-xs text-gray-400">vs bulan lalu</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function computeDelta(current: number, previous: number) {
    if (previous === 0) {
        if (current === 0) return { pct: 0, direction: "flat" as const };
        return { pct: null, direction: current > 0 ? ("up" as const) : ("down" as const) };
    }
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const direction: "up" | "down" | "flat" =
        pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
    return { pct, direction };
}

interface SummaryCardsProps {
    stats: {
        incomeThisMonth: number;
        incomeLastMonth: number;
        expenseThisMonth: number;
        expenseLastMonth: number;
        netProfit: number;
        netProfitLastMonth: number;
        totalCashBank: number;
    };
    cashBankAccountCount: number;
}

export default function SummaryCards({ stats, cashBankAccountCount }: SummaryCardsProps) {
    const incomeDelta = computeDelta(stats.incomeThisMonth, stats.incomeLastMonth);
    const expenseDelta = computeDelta(stats.expenseThisMonth, stats.expenseLastMonth);
    const profitDelta = computeDelta(stats.netProfit, stats.netProfitLastMonth);
    const profitMargin =
        stats.incomeThisMonth > 0
            ? (stats.netProfit / stats.incomeThisMonth) * 100
            : null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Uang Masuk"
                value={formatCurrency(stats.incomeThisMonth)}
                icon={TrendingUp}
                iconBg="bg-green-100"
                iconColor="text-green-600"
                valueColor="text-green-700"
                link="/transaksi/uang-masuk"
                delta={incomeDelta}
                deltaGoodDirection="up"
            />
            <StatCard
                title="Uang Keluar"
                value={formatCurrency(stats.expenseThisMonth)}
                icon={TrendingDown}
                iconBg="bg-red-100"
                iconColor="text-red-600"
                valueColor="text-red-700"
                link="/transaksi/uang-keluar"
                delta={expenseDelta}
                deltaGoodDirection="down"
            />
            <StatCard
                title="Saldo Kas & Bank"
                value={formatCurrency(stats.totalCashBank)}
                icon={Wallet}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                valueColor="text-blue-700"
                subtitle={`${cashBankAccountCount} akun aktif`}
            />
            <StatCard
                title="Laba Bulan Ini"
                value={formatCurrency(stats.netProfit)}
                icon={DollarSign}
                iconBg={stats.netProfit >= 0 ? "bg-emerald-100" : "bg-orange-100"}
                iconColor={
                    stats.netProfit >= 0 ? "text-emerald-600" : "text-orange-600"
                }
                valueColor={
                    stats.netProfit >= 0 ? "text-emerald-700" : "text-orange-700"
                }
                delta={profitDelta}
                deltaGoodDirection="up"
                subtitle={
                    profitMargin !== null
                        ? `Margin ${profitMargin.toFixed(1)}%`
                        : undefined
                }
            />
        </div>
    );
}
