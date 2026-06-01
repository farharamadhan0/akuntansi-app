import { Head } from "@inertiajs/react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
} from "recharts";
import {
    Building2,
    TrendingUp,
    Receipt,
    Users,
    AlertTriangle,
    Menu,
    BarChart2,
    Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

interface TopItem {
    menu_key?: string;
    route_name?: string;
    label: string;
    total: number;
}

interface IncompleteSetupTenant {
    id: number;
    name: string;
    email: string | null;
    created_at: string;
    missing: string[];
}

interface DauPoint {
    date: string;
    label: string;
    dau: number;
}

interface Metrics {
    totalTenants: number;
    activeTenantsThisMonth: number;
    totalTransactionsThisMonth: number;
    dauToday: number;
    incompleteSetupCount: number;
}

interface Props {
    metrics: Metrics;
    topMenus: TopItem[];
    topReports: TopItem[];
    incompleteSetup: IncompleteSetupTenant[];
    dauChart: DauPoint[];
    period: string;
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-center gap-4">
                    <div
                        className={`flex h-11 w-11 items-center justify-center rounded-lg ${color}`}
                    >
                        <Icon size={22} className="text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {value}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function DevDashboard({
    metrics,
    topMenus,
    topReports,
    incompleteSetup,
    dauChart,
    period,
}: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="Dev Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600">
                        <Activity size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            Developer Dashboard
                        </h1>
                        <p className="text-xs text-gray-500">
                            Metrik performa aplikasi — Periode:{" "}
                            <span className="font-medium">{period}</span>
                        </p>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                    <StatCard
                        icon={Building2}
                        label="Total Tenant"
                        value={metrics.totalTenants}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Tenant Aktif Bulan Ini"
                        value={metrics.activeTenantsThisMonth}
                        color="bg-emerald-500"
                    />
                    <StatCard
                        icon={Receipt}
                        label="Transaksi Bulan Ini"
                        value={metrics.totalTransactionsThisMonth}
                        color="bg-orange-500"
                    />
                    <StatCard
                        icon={Users}
                        label="DAU Hari Ini"
                        value={metrics.dauToday}
                        color="bg-violet-500"
                    />
                    <StatCard
                        icon={AlertTriangle}
                        label="Setup Belum Lengkap"
                        value={metrics.incompleteSetupCount}
                        color={
                            metrics.incompleteSetupCount > 0
                                ? "bg-red-500"
                                : "bg-gray-400"
                        }
                    />
                </div>

                {/* DAU Chart */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Users size={16} />
                            Daily Active Users (14 hari terakhir)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={dauChart}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0f0f0"
                                />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        fontSize: 12,
                                        borderRadius: 8,
                                    }}
                                    formatter={(val: number) => [
                                        val,
                                        "Pengguna Aktif",
                                    ]}
                                    labelFormatter={(label) => `Tanggal: ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="dau"
                                    stroke="#7c3aed"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Menus & Top Reports */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Top Menus */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Menu size={16} />
                                Menu Paling Sering Digunakan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topMenus.length === 0 ? (
                                <p className="text-sm text-gray-400 py-4 text-center">
                                    Belum ada data bulan ini
                                </p>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart
                                        data={topMenus}
                                        layout="vertical"
                                        margin={{ left: 8, right: 16 }}
                                    >
                                        <XAxis
                                            type="number"
                                            tick={{ fontSize: 11 }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="label"
                                            tick={{ fontSize: 11 }}
                                            tickLine={false}
                                            width={110}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                fontSize: 12,
                                                borderRadius: 8,
                                            }}
                                            formatter={(val: number) => [
                                                val,
                                                "Kunjungan",
                                            ]}
                                        />
                                        <Bar
                                            dataKey="total"
                                            fill="#3b82f6"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Reports */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <BarChart2 size={16} />
                                Laporan Paling Sering Dibuka
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topReports.length === 0 ? (
                                <p className="text-sm text-gray-400 py-4 text-center">
                                    Belum ada data bulan ini
                                </p>
                            ) : (
                                <div className="space-y-3 pt-1">
                                    {topReports.map((r, i) => (
                                        <div
                                            key={r.route_name ?? i}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                                                    {i + 1}
                                                </span>
                                                <span className="text-sm text-gray-700">
                                                    {r.label}
                                                </span>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {r.total}x
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Incomplete Setup */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <AlertTriangle size={16} className="text-amber-500" />
                            Tenant Belum Menyelesaikan Setup
                            {incompleteSetup.length > 0 && (
                                <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                                    {incompleteSetup.length}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {incompleteSetup.length === 0 ? (
                            <p className="text-sm text-emerald-600 py-2">
                                Semua tenant sudah menyelesaikan setup.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                                            <th className="pb-2 pr-4 font-medium">
                                                Nama Usaha
                                            </th>
                                            <th className="pb-2 pr-4 font-medium">
                                                Email
                                            </th>
                                            <th className="pb-2 pr-4 font-medium">
                                                Terdaftar
                                            </th>
                                            <th className="pb-2 font-medium">
                                                Belum Ada
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incompleteSetup.map((t) => (
                                            <tr
                                                key={t.id}
                                                className="border-b border-gray-50 last:border-0"
                                            >
                                                <td className="py-2 pr-4 font-medium text-gray-800">
                                                    {t.name}
                                                </td>
                                                <td className="py-2 pr-4 text-gray-500">
                                                    {t.email ?? "-"}
                                                </td>
                                                <td className="py-2 pr-4 text-gray-500">
                                                    {t.created_at}
                                                </td>
                                                <td className="py-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {t.missing.map((m) => (
                                                            <span
                                                                key={m}
                                                                className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600"
                                                            >
                                                                {m}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
