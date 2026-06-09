import { Card, CardContent } from "@/components/ui/card";
import type { TopSellingProduct } from "../types";

interface TopProductsProps {
    topSellingProducts?: TopSellingProduct[];
    currentMonth: string;
}

function formatQuantity(value: number) {
    return Number.isInteger(value)
        ? value.toLocaleString("id-ID")
        : value.toLocaleString("id-ID", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
          });
}

export default function TopProducts({
    topSellingProducts = [],
    currentMonth,
}: TopProductsProps) {
    return (
        <Card className="h-full">
            <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">
                        Top 5 Produk Terlaris
                    </h2>
                    <span className="text-xs text-gray-400">{currentMonth}</span>
                </div>
                {topSellingProducts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">
                        Belum ada penjualan produk bulan ini
                    </p>
                ) : (
                    <div className="space-y-2.5">
                        {topSellingProducts.map((product, index) => (
                            <div key={product.id} className="rounded-lg border border-gray-200 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-500">
                                            #{index + 1}
                                        </p>
                                        <p className="truncate text-sm font-semibold text-gray-800">
                                            {product.name}
                                        </p>
                                    </div>
                                    <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                                        {formatQuantity(product.totalQuantity)} {product.unit}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
