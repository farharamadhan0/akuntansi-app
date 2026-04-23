import { Head, Link } from "@inertiajs/react";
import { Card, CardContent } from "@/components/ui/card";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    LucideIcon,
    DollarSign,
    Users,
    CreditCard,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    FileClock,
    ArrowRight,
} from "lucide-react";
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
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

interface Stats {
    incomeThisMonth: number;
    incomeLastMonth: number;
    expenseThisMonth: number;
    expenseLastMonth: number;
    netProfit: number;
    netProfitLastMonth: number;
    totalCashBank: number;
    receivableOutstanding: number;
    receivableOutstandingCount: number;
    receivableOverdue: number;
    receivableOverdueCount: number;
    receivableDueSoon: number;
    receivableDueSoonCount: number;
    payableOutstanding: number;
    payableOutstandingCount: number;
    payableOverdue: number;
    payableOverdueCount: number;
    payableDueSoon: number;
    payableDueSoonCount: number;
    draftCount: number;
}

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

interface TrendPoint {
    period: string;
    label: string;
    income: number;
    expense: number;
}

interface TopCategory {
    name: string;
    total: number;
}

interface CashBankAccount {
    id: number;
    name: string;
    type: "cash" | "bank";
    balance: number;
}

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

interface Props {
    stats: Stats;
    cashBankAccounts: CashBankAccount[];
    recentTransactions: RecentTransaction[];
    receivableAging: Aging;
    payableAging: Aging;
    trend: TrendPoint[];
    topExpenseCategories: TopCategory[];
    currentMonth: string;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatCurrencyCompact(value: number) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (abs >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
    if (abs >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
    return `Rp ${value.toFixed(0)}`;
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

export default function Dashboard({
    stats,
    cashBankAccounts,
    recentTransactions,
    receivableAging,
    payableAging,
    trend,
    topExpenseCategories,
    currentMonth,
}: Props) {
    const incomeDelta = computeDelta(stats.incomeThisMonth, stats.incomeLastMonth);
    const expenseDelta = computeDelta(stats.expenseThisMonth, stats.expenseLastMonth);
    const profitDelta = computeDelta(stats.netProfit, stats.netProfitLastMonth);
    const profitMargin =
        stats.incomeThisMonth > 0
            ? (stats.netProfit / stats.incomeThisMonth) * 100
            : null;

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Periode: <span className="font-medium">{currentMonth}</span>
                    </p>
                </div>
                {stats.draftCount > 0 && (
                    <Link
                        href="/laporan/transaksi?status=draft"
                        className="flex items-center gap-2 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-3 py-2 hover:bg-amber-100 transition-colors"
                    >
                        <FileClock size={14} />
                        <span>
                            {stats.draftCount} transaksi draft menunggu review
                        </span>
                        <ArrowRight size={12} />
                    </Link>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    subtitle={`${cashBankAccounts.length} akun aktif`}
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

            {/* Trend Chart + Top Expense Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <Card className="lg:col-span-2">
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

                <Card>
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
            </div>

            {/* Piutang & Hutang Summary with Aging */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ReceivablePayableCard
                    title="Piutang Belum Lunas"
                    icon={Users}
                    accentColor="blue"
                    total={stats.receivableOutstanding}
                    count={stats.receivableOutstandingCount}
                    overdueAmount={stats.receivableOverdue}
                    overdueCount={stats.receivableOverdueCount}
                    dueSoonAmount={stats.receivableDueSoon}
                    dueSoonCount={stats.receivableDueSoonCount}
                    aging={receivableAging}
                    href="/transaksi/piutang"
                />
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
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cash & Bank Balances */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-700">
                                Saldo Kas & Bank
                            </h2>
                            <Link
                                href="/master/kas-bank"
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Kelola
                            </Link>
                        </div>
                        {cashBankAccounts.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-400">
                                    Belum ada akun kas/bank
                                </p>
                                <Link
                                    href="/master/kas-bank/tambah"
                                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                    + Tambah Kas/Bank
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {cashBankAccounts.map((acc) => (
                                    <div
                                        key={acc.id}
                                        className="flex items-center justify-between py-2 border-b last:border-0"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div
                                                className={`p-1.5 rounded ${acc.type === "cash" ? "bg-green-50" : "bg-blue-50"}`}
                                            >
                                                <Wallet
                                                    size={14}
                                                    className={
                                                        acc.type === "cash"
                                                            ? "text-green-600"
                                                            : "text-blue-600"
                                                    }
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-700 truncate">
                                                    {acc.name}
                                                </p>
                                                <p className="text-xs text-gray-400 capitalize">
                                                    {acc.type === "cash" ? "Kas" : "Bank"}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`text-sm font-semibold whitespace-nowrap ml-2 ${acc.balance >= 0 ? "text-gray-900" : "text-red-600"}`}
                                        >
                                            {formatCurrency(acc.balance)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Transactions */}
                <Card>
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
                                        className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
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
                                            className={`text-sm font-semibold whitespace-nowrap ml-2 ${t.type === "income" ? "text-green-600" : "text-red-600"}`}
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
            </div>
        </AuthenticatedLayout>
    );
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
}: {
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
}) {
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
                        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                            <AlertTriangle size={12} />
                            <span>
                                {overdueCount} jatuh tempo —{" "}
                                {formatCurrency(overdueAmount)}
                            </span>
                        </div>
                    )}
                    {dueSoonCount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                            <Clock size={12} />
                            <span>
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
