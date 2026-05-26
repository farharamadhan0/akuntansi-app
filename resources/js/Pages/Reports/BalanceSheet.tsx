import { Head, Link } from "@inertiajs/react";
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
import { formatDateDDMMYYYY } from "@/lib/format";
import { Scale } from "lucide-react";

interface AccountRow {
    account_id: number;
    account_code: string;
    account_name: string;
    amount: number;
}

interface Filters {
    as_of: string;
}

interface Props {
    asset: AccountRow[];
    liability: AccountRow[];
    equity: AccountRow[];
    current_earnings: number;
    total_asset: number;
    total_liability: number;
    total_equity: number;
    total_liab_equity: number;
    is_balanced: boolean;
    filters: Filters;
}

const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(v);

const fmtDate = (d: string) => formatDateDDMMYYYY(d);

export default function BalanceSheet({
    asset,
    liability,
    equity,
    current_earnings,
    total_asset,
    total_liability,
    total_equity,
    total_liab_equity,
    is_balanced,
    filters,
}: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="Laporan – Neraca" />

            <Breadcrumb items={[{ label: "Laporan" }, { label: "Neraca" }]} />

            <div className="flex items-center gap-2 mb-5">
                <Scale className="text-blue-500" size={22} />
                <h1 className="text-xl font-bold text-gray-900">
                    Laporan Neraca
                </h1>
            </div>

            <ReportFilters
                url="/laporan/neraca"
                mode="asOf"
                asOf={filters.as_of}
            />

            {/* Header */}
            <div className="text-center mb-5">
                <p className="text-sm text-gray-500">
                    Per Tanggal: {fmtDate(filters.as_of)}
                </p>
            </div>

            {/* Aset */}
            <Card className="mb-4">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-blue-50">
                                <TableHead
                                    colSpan={2}
                                    className="text-blue-800 font-semibold"
                                >
                                    Aset
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
                            {asset.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        className="text-gray-400 text-sm text-center py-4"
                                    >
                                        Tidak ada aset pada tanggal ini
                                    </TableCell>
                                </TableRow>
                            ) : (
                                asset.map((a) => (
                                    <TableRow key={a.account_id}>
                                        <TableCell>
                                            <Link
                                                href={`/laporan/buku-besar?account_id=${a.account_id}&to=${filters.as_of}`}
                                                className="hover:underline hover:text-indigo-700"
                                            >
                                                <span className="text-gray-400 text-xs">
                                                    {a.account_code}
                                                </span>{" "}
                                                {a.account_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right text-blue-700">
                                            {fmt(a.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            <TableRow className="border-t-2 font-semibold bg-blue-50">
                                <TableCell>Total Aset</TableCell>
                                <TableCell className="text-right text-blue-700">
                                    {fmt(total_asset)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Kewajiban */}
            <Card className="mb-4">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-red-50">
                                <TableHead
                                    colSpan={2}
                                    className="text-red-800 font-semibold"
                                >
                                    Kewajiban
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
                            {liability.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        className="text-gray-400 text-sm text-center py-4"
                                    >
                                        Tidak ada kewajiban pada tanggal ini
                                    </TableCell>
                                </TableRow>
                            ) : (
                                liability.map((l) => (
                                    <TableRow key={l.account_id}>
                                        <TableCell>
                                            <Link
                                                href={`/laporan/buku-besar?account_id=${l.account_id}&to=${filters.as_of}`}
                                                className="hover:underline hover:text-indigo-700"
                                            >
                                                <span className="text-gray-400 text-xs">
                                                    {l.account_code}
                                                </span>{" "}
                                                {l.account_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right text-red-700">
                                            {fmt(l.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            <TableRow className="border-t-2 font-semibold bg-red-50">
                                <TableCell>Total Kewajiban</TableCell>
                                <TableCell className="text-right text-red-700">
                                    {fmt(total_liability)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal / Ekuitas */}
            <Card className="mb-4">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-amber-50">
                                <TableHead
                                    colSpan={2}
                                    className="text-amber-800 font-semibold"
                                >
                                    Modal (Ekuitas)
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
                            {equity.length === 0 && current_earnings === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        className="text-gray-400 text-sm text-center py-4"
                                    >
                                        Tidak ada modal pada tanggal ini
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {equity.map((e) => (
                                        <TableRow key={e.account_id}>
                                            <TableCell>
                                                <Link
                                                    href={`/laporan/buku-besar?account_id=${e.account_id}&to=${filters.as_of}`}
                                                    className="hover:underline hover:text-indigo-700"
                                                >
                                                    <span className="text-gray-400 text-xs">
                                                        {e.account_code}
                                                    </span>{" "}
                                                    {e.account_name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right text-amber-700">
                                                {fmt(e.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell>
                                            <span className="text-gray-400 text-xs">
                                                —
                                            </span>{" "}
                                            {current_earnings >= 0
                                                ? "Laba Periode Berjalan"
                                                : "Rugi Periode Berjalan"}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right ${current_earnings >= 0 ? "text-amber-700" : "text-red-700"}`}
                                        >
                                            {fmt(current_earnings)}
                                        </TableCell>
                                    </TableRow>
                                </>
                            )}
                            <TableRow className="border-t-2 font-semibold bg-amber-50">
                                <TableCell>Total Modal</TableCell>
                                <TableCell className="text-right text-amber-700">
                                    {fmt(total_equity)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Ringkasan */}
            <Card
                className={is_balanced ? "border-green-300" : "border-red-300"}
            >
                <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                            Total Aset
                        </span>
                        <span className="text-lg font-semibold text-blue-700">
                            {fmt(total_asset)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                            Total Kewajiban + Modal
                        </span>
                        <span className="text-lg font-semibold text-amber-700">
                            {fmt(total_liab_equity)}
                        </span>
                    </div>
                    <div className="pt-3 border-t flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">
                            {is_balanced ? "Neraca Seimbang" : "Selisih"}
                        </span>
                        <span
                            className={`text-2xl font-bold ${is_balanced ? "text-green-600" : "text-red-600"}`}
                        >
                            {fmt(Math.abs(total_asset - total_liab_equity))}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400">
                        Aset = Kewajiban + Modal
                    </p>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
