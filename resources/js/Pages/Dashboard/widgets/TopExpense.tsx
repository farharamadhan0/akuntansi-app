import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyCompact } from "../helpers";

interface TopCategory {
    name: string;
    total: number;
}

interface TopExpenseProps {
    topExpenseCategories: TopCategory[];
    currentMonth: string;
}

export default function TopExpense({ topExpenseCategories, currentMonth }: TopExpenseProps) {
    return (
        <Card className="h-full">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700">
                        Top Kategori Pengeluaran
                    </h2>
                    <span className="text-xs text-gray-400">{currentMonth}</span>
                </div>
                {topExpenseCategories.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                        Belum ada pengeluaran bulan ini
                    </p>
                ) : (
                    <TopCategoriesList items={topExpenseCategories} />
                )}
            </CardContent>
        </Card>
    );
}

function TopCategoriesList({ items }: { items: TopCategory[] }) {
    const max = Math.max(...items.map((i) => i.total), 1);
    return (
        <div className="space-y-2.5">
            {items.map((item) => {
                const pct = (item.total / max) * 100;
                return (
                    <div key={item.name}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-700 truncate pr-2">
                                {item.name}
                            </span>
                            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                                {formatCurrencyCompact(item.total)}
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className="h-full bg-red-400"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
