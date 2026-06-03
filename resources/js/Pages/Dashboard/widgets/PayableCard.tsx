import { Link } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, AlertTriangle, Clock, LucideIcon } from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "../helpers";

interface AgingBucket {
    total: number;
    count: number;
}

interface Aging {
    current: AgingBucket;
    d1_30: AgingBucket;
    d31_60: AgingBucket;
    d61_90: AgingBucket;
    d90_plus: AgingBucket;
}

interface PayableCardProps {
    stats: {
        payableOutstanding: number;
        payableOutstandingCount: number;
        payableOverdue: number;
        payableOverdueCount: number;
        payableDueSoon: number;
        payableDueSoonCount: number;
    };
    payableAging: Aging;
}

export default function PayableCard({ stats, payableAging }: PayableCardProps) {
    return (
        <ReceivablePayableCard
            title="Hutang Belum Lunas"
            icon={CreditCard}
            accentColor="orange"
            total={stats.payableOutstanding}
            count={stats.payableOutstandingCount}
            overdueAmount={stats.payableOverdue}
            overdueCount={stats.payableOverdueCount}
            dueSoonAmount={stats.payableDueSoon}
            dueSoonCount={stats.payableDueSoonCount}
            aging={payableAging}
            href="/transaksi/hutang"
        />
    );
}

function ReceivablePayableCard({
    title,
    icon: Icon,
    accentColor,
    total,
    count,
    overdueAmount,
    overdueCount,
    dueSoonAmount,
    dueSoonCount,
    aging,
    href,
}: {
    title: string;
    icon: LucideIcon;
    accentColor: "blue" | "orange";
    total: number;
    count: number;
    overdueAmount: number;
    overdueCount: number;
    dueSoonAmount: number;
    dueSoonCount: number;
    aging: Aging;
    href: string;
}) {
    const accent =
        accentColor === "blue"
            ? {
                  border: overdueCount > 0 ? "border-blue-300" : "",
                  iconBg: "bg-blue-100",
                  iconColor: "text-blue-600",
                  valueColor: "text-blue-700",
              }
            : {
                  border: overdueCount > 0 ? "border-orange-300" : "",
                  iconBg: "bg-orange-100",
                  iconColor: "text-orange-600",
                  valueColor: "text-orange-700",
              };

    const buckets: Array<{ key: keyof Aging; label: string }> = [
        { key: "current", label: "Belum jatuh tempo" },
        { key: "d1_30", label: "1–30 hr" },
        { key: "d31_60", label: "31–60 hr" },
        { key: "d61_90", label: "61–90 hr" },
        { key: "d90_plus", label: ">90 hr" },
    ];

    return (
        <Card className={accent.border}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${accent.iconBg}`}>
                            <Icon size={16} className={accent.iconColor} />
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                            {title}
                        </span>
                    </div>
                    <Link
                        href={href}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Lihat semua
                    </Link>
                </div>

                <p className={`text-lg font-bold ${accent.valueColor}`}>
                    {formatCurrency(total)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{count} dokumen aktif</p>

                {/* Alerts */}
                <div className="mt-2 space-y-1">
                    {overdueCount > 0 && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <span className="min-w-0 break-words">
                                {overdueCount} jatuh tempo —{" "}
                                {formatCurrency(overdueAmount)}
                            </span>
                        </div>
                    )}
                    {dueSoonCount > 0 && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                            <Clock size={12} className="mt-0.5 shrink-0" />
                            <span className="min-w-0 break-words">
                                {dueSoonCount} jatuh tempo &lt;7 hari —{" "}
                                {formatCurrency(dueSoonAmount)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Aging */}
                {count > 0 && (
                    <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                            Aging
                        </p>
                        <div className="grid grid-cols-5 gap-1 text-center">
                            {buckets.map(({ key, label }) => {
                                const b = aging[key];
                                const isOverdueBucket = key !== "current";
                                return (
                                    <div key={key} className="min-w-0">
                                        <p className="text-[10px] text-gray-400 truncate">
                                            {label}
                                        </p>
                                        <p
                                            className={`text-xs font-semibold mt-0.5 ${
                                                b.count === 0
                                                    ? "text-gray-300"
                                                    : isOverdueBucket
                                                        ? "text-red-600"
                                                        : "text-gray-800"
                                            }`}
                                        >
                                            {formatCurrencyCompact(b.total)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {b.count}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
