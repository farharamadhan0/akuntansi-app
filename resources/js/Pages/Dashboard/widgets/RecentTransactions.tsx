import { Link } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatDate } from "../helpers";

interface RecentTransaction {
    id: number;
    transaction_number: string;
    type: "income" | "expense";
    date: string;
    amount: number;
    description: string;
    cash_bank_name: string;
    category_name?: string;
}

interface RecentTransactionsProps {
    recentTransactions: RecentTransaction[];
}

export default function RecentTransactions({ recentTransactions }: RecentTransactionsProps) {
    return (
        <Card className="h-full">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700">
                        Transaksi Terakhir
                    </h2>
                    <Link
                        href="/laporan/transaksi"
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Lihat semua
                    </Link>
                </div>
                {recentTransactions.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-400">
                            Belum ada transaksi
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentTransactions.map((t) => (
                            <Link
                                key={t.id}
                                href={`/transaksi/${t.type === "income" ? "uang-masuk" : "uang-keluar"}/${t.id}`}
                                className="flex flex-col gap-1 py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-2 self-stretch sm:self-auto">
                                    <div
                                        className={`p-1.5 rounded ${t.type === "income" ? "bg-green-50" : "bg-red-50"}`}
                                    >
                                        {t.type === "income" ? (
                                            <TrendingUp
                                                size={14}
                                                className="text-green-600"
                                            />
                                        ) : (
                                            <TrendingDown
                                                size={14}
                                                className="text-red-600"
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-700 truncate">
                                            {t.description}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {formatDate(t.date)} ·{" "}
                                            <span className="font-mono">
                                                {t.transaction_number}
                                            </span>
                                            {t.category_name && (
                                                <>
                                                    {" · "}
                                                    {t.category_name}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`ml-8 text-sm font-semibold sm:ml-2 sm:whitespace-nowrap ${t.type === "income" ? "text-green-600" : "text-red-600"}`}
                                >
                                    {t.type === "income" ? "+" : "-"}
                                    {formatCurrency(t.amount)}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
