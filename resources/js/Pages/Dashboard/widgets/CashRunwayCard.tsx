import { Card, CardContent } from "@/components/ui/card";
import { Clock3, PiggyBank, TrendingDown } from "lucide-react";
import { formatCurrency } from "../helpers";

interface CashRunwayCardProps {
    stats: {
        totalCashBank: number;
        averageExpenseLastMonth: number | null;
        cashRunwayMonths: number | null;
    };
}

function formatMonths(value: number | null) {
    if (value === null) {
        return "-";
    }

    return `${value.toFixed(1)} bulan`;
}

export default function CashRunwayCard({ stats }: CashRunwayCardProps) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium text-gray-500">
                            Cash Runway
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Berdasarkan pengeluaran bulan sebelumnya
                        </p>
                    </div>
                    <div className="rounded-lg bg-cyan-100 p-2">
                        <Clock3 size={16} className="text-cyan-700" />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                            <div className="rounded-md bg-emerald-100 p-1.5">
                                <PiggyBank size={14} className="text-emerald-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">
                                Saldo kas &amp; bank
                            </span>
                        </div>
                        <p className="mt-3 text-base font-bold text-emerald-700 sm:text-lg">
                            {formatCurrency(stats.totalCashBank)}
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                            <div className="rounded-md bg-amber-100 p-1.5">
                                <TrendingDown size={14} className="text-amber-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">
                                Uang keluar bulan sebelumnya
                            </span>
                        </div>
                        <p className="mt-3 text-base font-bold text-amber-700 sm:text-lg">
                            {stats.averageExpenseLastMonth !== null
                                ? formatCurrency(stats.averageExpenseLastMonth)
                                : "-"}
                        </p>
                    </div>

                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                        <p className="text-xs font-medium text-gray-500">
                            Estimasi cukup untuk
                        </p>
                        <p className="mt-2 text-2xl font-bold text-cyan-900">
                            {formatMonths(stats.cashRunwayMonths)}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            {stats.cashRunwayMonths === null
                                ? "Belum ada data pengeluaran pada bulan sebelumnya"
                                : "Estimasi berdasarkan saldo saat ini dan pengeluaran bulan sebelumnya"}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
