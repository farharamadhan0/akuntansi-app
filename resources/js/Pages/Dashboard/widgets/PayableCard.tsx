import { Link } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, CreditCard, LucideIcon } from "lucide-react";
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
            agingTitle="Ringkasan Umur Hutang"
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
    agingTitle,
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
    agingTitle: string;
}) {
    const accent =
        accentColor === "blue"
            ? {
                  border: overdueCount > 0 ? "border-blue-300" : "",
                  iconBg: "bg-blue-100",
                  iconColor: "text-blue-600",
                  valueColor: "text-blue-700",
                  currentTone: "border-blue-200 bg-blue-50/80",
              }
            : {
                  border: overdueCount > 0 ? "border-orange-300" : "",
                  iconBg: "bg-orange-100",
                  iconColor: "text-orange-600",
                  valueColor: "text-orange-700",
                  currentTone: "border-orange-200 bg-orange-50/80",
              };

    const buckets: Array<{ key: keyof Aging; label: string }> = [
        { key: "current", label: "Belum jatuh tempo" },
        { key: "d1_30", label: "Terlambat 1-30 hari" },
        { key: "d31_60", label: "Terlambat 31-60 hari" },
        { key: "d61_90", label: "Terlambat 61-90 hari" },
        { key: "d90_plus", label: "Terlambat >90 hari" },
    ];

    return (
        <Card className={accent.border}>
            <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-1.5 ${accent.iconBg}`}>
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
                <p className="mt-0.5 text-xs text-gray-400">{count} dokumen aktif</p>

                <div className="mt-2 space-y-1">
                    {overdueCount > 0 && (
                        <div className="flex items-start gap-1.5 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            <span className="min-w-0 break-words">
                                {overdueCount} jatuh tempo - {formatCurrency(overdueAmount)}
                            </span>
                        </div>
                    )}
                    {dueSoonCount > 0 && (
                        <div className="flex items-start gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                            <Clock size={12} className="mt-0.5 shrink-0" />
                            <span className="min-w-0 break-words">
                                {dueSoonCount} jatuh tempo &lt;7 hari - {formatCurrency(dueSoonAmount)}
                            </span>
                        </div>
                    )}
                </div>

                {count > 0 && (
                    <div className="mt-3 border-t pt-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-gray-500">
                                {agingTitle}
                            </p>
                            <span className="text-[11px] text-gray-400">
                                {count} dokumen
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            {buckets.map(({ key, label }) => {
                                const bucket = aging[key];
                                const isOverdueBucket = key !== "current";
                                const hasValue = bucket.count > 0;
                                const toneClass = !hasValue
                                    ? "border-gray-200 bg-gray-50"
                                    : isOverdueBucket
                                        ? "border-red-200 bg-red-50/80"
                                        : accent.currentTone;
                                const amountClass = !hasValue
                                    ? "text-gray-400"
                                    : isOverdueBucket
                                        ? "text-red-700"
                                        : "text-gray-900";

                                return (
                                    <div
                                        key={key}
                                        className={`rounded-md border p-3 ${toneClass}`}
                                    >
                                        <p className="text-[11px] font-medium leading-snug text-gray-600">
                                            {label}
                                        </p>
                                        <p className={`mt-2 text-sm font-semibold ${amountClass}`}>
                                            {formatCurrencyCompact(bucket.total)}
                                        </p>
                                        <p className="mt-1 text-[11px] text-gray-500">
                                            {bucket.count} dokumen
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
