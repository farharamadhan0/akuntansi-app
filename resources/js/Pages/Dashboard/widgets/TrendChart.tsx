import { Card, CardContent } from "@/components/ui/card";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "../helpers";

interface TrendPoint {
    period: string;
    label: string;
    income: number;
    expense: number;
}

interface TrendChartProps {
    trend: TrendPoint[];
}

export default function TrendChart({ trend }: TrendChartProps) {
    return (
        <Card className="h-full">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700">
                        Tren 6 Bulan Terakhir
                    </h2>
                    <span className="text-xs text-gray-400">
                        Pemasukan vs Pengeluaran
                    </span>
                </div>
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={trend}
                            margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#f1f5f9"
                            />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: "#6b7280" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "#6b7280" }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => formatCurrencyCompact(v)}
                                width={70}
                            />
                            <Tooltip
                                formatter={(value) =>
                                    formatCurrency(Number(value))
                                }
                                contentStyle={{
                                    fontSize: 12,
                                    borderRadius: 6,
                                    border: "1px solid #e5e7eb",
                                }}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: 11 }}
                                iconType="circle"
                            />
                            <Bar
                                dataKey="income"
                                name="Pemasukan"
                                fill="#16a34a"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                dataKey="expense"
                                name="Pengeluaran"
                                fill="#dc2626"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
