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
import { Droplets, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface FlowRow {
    account: string;
    source: string;
    amount: number;
}
interface Filters {
    from: string;
    to: string;
}

interface Props {
    inflows: FlowRow[];
    outflows: FlowRow[];
    total_in: number;
    total_out: number;
    net_flow: number;
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

function FlowTable({ rows, type }: { rows: FlowRow[]; type: "in" | "out" }) {
    const isIn = type === "in";
    const color = isIn ? "text-green-700" : "text-red-700";
    const bgHeader = isIn ? "bg-green-50" : "bg-red-50";
    const title = isIn ? "Arus Kas Masuk" : "Arus Kas Keluar";
    const icon = isIn ? (
        <ArrowUpCircle size={16} className="text-green-600" />
    ) : (
        <ArrowDownCircle size={16} className="text-red-600" />
    );

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className={bgHeader}>
                            <TableHead
                                colSpan={3}
                                className={`font-semibold ${color}`}
                            >
                                <span className="flex items-center gap-1.5">
                                    {icon}
                                    {title}
                                </span>
                            </TableHead>
                        </TableRow>
                        <TableRow>
                            <TableHead>Akun</TableHead>
                            <TableHead>Sumber</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="text-gray-400 text-sm text-center py-4"
                                >
                                    Tidak ada arus kas pada periode ini
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((r, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium">
                                        {r.account}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {r.source}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right ${color}`}
                                    >
                                        {fmt(r.amount)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function CashFlow({
    inflows,
    outflows,
    total_in,
    total_out,
    net_flow,
    filters,
}: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="Laporan – Arus Kas" />

            <Breadcrumb items={[{ label: "Laporan" }, { label: "Arus Kas" }]} />

            <div className="flex items-center gap-2 mb-5">
                <Droplets className="text-blue-500" size={22} />
                <h1 className="text-xl font-bold text-gray-900">
                    Laporan Arus Kas
                </h1>
            </div>

            <ReportFilters
                url="/laporan/arus-kas"
                from={filters.from}
                to={filters.to}
            />

            <div className="text-center mb-5">
                <p className="text-sm text-gray-500">
                    Periode: {fmtDate(filters.from)} – {fmtDate(filters.to)}
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Total Masuk</p>
                        <p className="font-bold text-green-600">
                            {fmt(total_in)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Total Keluar</p>
                        <p className="font-bold text-red-600">
                            {fmt(total_out)}
                        </p>
                    </CardContent>
                </Card>
                <Card
                    className={
                        net_flow >= 0 ? "border-green-300" : "border-red-300"
                    }
                >
                    <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Arus Kas Bersih</p>
                        <p
                            className={`font-bold text-lg ${net_flow >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                            {fmt(net_flow)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <FlowTable rows={inflows} type="in" />
                <FlowTable rows={outflows} type="out" />
            </div>

            {/* Net summary row */}
            <Card
                className={`mt-4 ${net_flow >= 0 ? "border-green-300" : "border-red-300"}`}
            >
                <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">
                            Arus Kas Bersih
                        </span>
                        <span
                            className={`font-bold text-xl ${net_flow >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                            {fmt(net_flow)}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Masuk {fmt(total_in)} − Keluar {fmt(total_out)}
                    </p>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
