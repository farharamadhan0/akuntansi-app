import type { ReactNode } from "react";
import { Link } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, PackageMinus, PackageSearch } from "lucide-react";

interface StockAttention {
    lowStockCount: number;
    negativeStockCount: number;
    unsoldThirtyDaysCount: number;
}

interface StockAttentionCardProps {
    stockAttention: StockAttention;
}

function AttentionRow({
    label,
    count,
    tone,
    icon,
}: {
    label: string;
    count: number;
    tone: "amber" | "red" | "slate";
    icon: ReactNode;
}) {
    const toneClass = {
        amber: {
            wrap: "border-amber-200 bg-amber-50/80",
            icon: "bg-amber-100 text-amber-700",
            count: "text-amber-800",
        },
        red: {
            wrap: "border-red-200 bg-red-50/80",
            icon: "bg-red-100 text-red-700",
            count: "text-red-800",
        },
        slate: {
            wrap: "border-slate-200 bg-slate-50/80",
            icon: "bg-slate-100 text-slate-700",
            count: "text-slate-800",
        },
    }[tone];

    return (
        <div className={`flex items-center gap-3 rounded-md border p-3 ${toneClass.wrap}`}>
            <div className={`rounded-md p-2 ${toneClass.icon}`}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600">{label}</p>
                <p className={`mt-1 text-lg font-semibold ${toneClass.count}`}>
                    {count} produk
                </p>
            </div>
        </div>
    );
}

export default function StockAttentionCard({ stockAttention }: StockAttentionCardProps) {
    return (
        <Card className="h-full">
            <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700">
                            Stok Perlu Perhatian
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Pantau stok rendah, negatif, dan produk yang belum laku
                        </p>
                    </div>
                    <Link
                        href="/master/produk"
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Lihat produk
                    </Link>
                </div>

                <div className="space-y-2">
                    <AttentionRow
                        label="Stok rendah (<= 5 unit)"
                        count={stockAttention.lowStockCount}
                        tone="amber"
                        icon={<AlertTriangle size={16} />}
                    />
                    <AttentionRow
                        label="Stok negatif"
                        count={stockAttention.negativeStockCount}
                        tone="red"
                        icon={<PackageMinus size={16} />}
                    />
                    <AttentionRow
                        label="Belum terjual 30 hari terakhir"
                        count={stockAttention.unsoldThirtyDaysCount}
                        tone="slate"
                        icon={<PackageSearch size={16} />}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
