import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatCurrency } from "../helpers";

interface CashFlowCardProps {
    stats: {
        incomeThisMonth: number;
        expenseThisMonth: number;
    };
}

export default function CashFlowCard({ stats }: CashFlowCardProps) {
    const netCashFlow = stats.incomeThisMonth - stats.expenseThisMonth;
    const netTone =
        netCashFlow >= 0
            ? {
                  border: "border-emerald-200",
                  bg: "bg-emerald-50",
                  text: "text-emerald-800",
              }
            : {
                  border: "border-red-200",
                  bg: "bg-red-50",
                  text: "text-red-800",
              };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium text-gray-500">
                            Cash Flow Bulan Ini
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Ringkasan arus kas bulan berjalan
                        </p>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-2">
                        <Wallet size={16} className="text-slate-700" />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                            <div className="rounded-md bg-emerald-100 p-1.5">
                                <ArrowDownLeft size={14} className="text-emerald-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">
                                Kas masuk
                            </span>
                        </div>
                        <p className="mt-3 text-base font-bold text-emerald-700 sm:text-lg">
                            {formatCurrency(stats.incomeThisMonth)}
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center gap-2">
                            <div className="rounded-md bg-red-100 p-1.5">
                                <ArrowUpRight size={14} className="text-red-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">
                                Kas keluar
                            </span>
                        </div>
                        <p className="mt-3 text-base font-bold text-red-700 sm:text-lg">
                            {formatCurrency(stats.expenseThisMonth)}
                        </p>
                    </div>

                    <div className={`rounded-lg border p-3 ${netTone.border} ${netTone.bg}`}>
                        <p className="text-xs font-medium text-gray-500">
                            Net cash flow
                        </p>
                        <p className={`mt-2 text-2xl font-bold ${netTone.text}`}>
                            {formatCurrency(netCashFlow)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
