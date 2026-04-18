import { Head } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import ReportFilters from "@/components/reports/ReportFilters";
import { TrendingUp } from "lucide-react";

interface AccountRow {
    account_id: number;
    account_code: string;
    account_name: string;
    amount: number;
}
interface Filters {
    from: string;
    to: string;
}

interface Props {
    revenue: AccountRow[];
    expense: AccountRow[];
    total_revenue: number;
    total_expense: number;
    net_income: number;
    filters: Filters;
}

const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(v);
const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

export default function IncomeStatement({
    revenue,
    expense,
    total_revenue,
    total_expense,
    net_income,
    filters,
}: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="Laporan – Laba Rugi" />

            <Breadcrumb
                items={[{ label: "Laporan" }, { label: "Laba Rugi" }]}
            />

            <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="text-green-500" size={22} />
                <h1 className="text-xl font-bold text-gray-900">
                    Laporan Laba Rugi
                </h1>
            </div>

            <ReportFilters
                url="/laporan/laba-rugi"
                from={filters.from}
                to={filters.to}
            />

            {/* Header */}
            <div className="text-center mb-5">
                <p className="text-sm text-gray-500">
                    Periode: {fmtDate(filters.from)} – {fmtDate(filters.to)}
                </p>
            </div>

            {/* Pendapatan */}
            <Card className="mb-4">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-green-50">
                                <TableHead
                                    colSpan={2}
                                    className="text-green-800 font-semibold"
                                >
                                    Pendapatan
                                </TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead>Akun</TableHead>
                                <TableHead className="text-right">
                                    Jumlah
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {revenue.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        className="text-gray-400 text-sm text-center py-4"
                                    >
                                        Tidak ada pendapatan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                revenue.map((r) => (
                                    <TableRow key={r.account_id}>
                                        <TableCell>
                                            <span className="text-gray-400 text-xs">
                                                {r.account_code}
                                            </span>{" "}
                                            {r.account_name}
                                        </TableCell>
                                        <TableCell className="text-right text-green-700">
                                            {fmt(r.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            <TableRow className="border-t-2 font-semibold bg-green-50">
                                <TableCell>Total Pendapatan</TableCell>
                                <TableCell className="text-right text-green-700">
                                    {fmt(total_revenue)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Beban */}
            <Card className="mb-4">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-red-50">
                                <TableHead
                                    colSpan={2}
                                    className="text-red-800 font-semibold"
                                >
                                    Beban
                                </TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead>Akun</TableHead>
                                <TableHead className="text-right">
                                    Jumlah
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expense.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        className="text-gray-400 text-sm text-center py-4"
                                    >
                                        Tidak ada beban
                                    </TableCell>
                                </TableRow>
                            ) : (
                                expense.map((e) => (
                                    <TableRow key={e.account_id}>
                                        <TableCell>
                                            <span className="text-gray-400 text-xs">
                                                {e.account_code}
                                            </span>{" "}
                                            {e.account_name}
                                        </TableCell>
                                        <TableCell className="text-right text-red-700">
                                            {fmt(e.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            <TableRow className="border-t-2 font-semibold bg-red-50">
                                <TableCell>Total Beban</TableCell>
                                <TableCell className="text-right text-red-700">
                                    {fmt(total_expense)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Net */}
            <Card
                className={
                    net_income >= 0 ? "border-green-300" : "border-red-300"
                }
            >
                <CardContent className="p-5">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">
                            {net_income >= 0 ? "Laba Bersih" : "Rugi Bersih"}
                        </span>
                        <span
                            className={`text-2xl font-bold ${net_income >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                            {fmt(Math.abs(net_income))}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Pendapatan {fmt(total_revenue)} − Beban{" "}
                        {fmt(total_expense)}
                    </p>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
