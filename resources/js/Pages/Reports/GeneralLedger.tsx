import { Head, Link, router } from "@inertiajs/react";
import { useState, type FormEvent } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Search } from "lucide-react";

interface AccountOption {
    id: number;
    code: string;
    name: string;
    type: string;
    label: string;
}

interface LedgerLine {
    line_id: number;
    date: string;
    entry_id: number;
    entry_number: string;
    description: string | null;
    source_type: string | null;
    source_id: number | null;
    source_label: string;
    status: string;
    debit: number;
    credit: number;
    running_balance: number;
}

interface Ledger {
    account: {
        id: number;
        code: string;
        name: string;
        type: string;
        type_label: string;
        normal_balance: "debit" | "credit";
    };
    opening_balance: number;
    total_debit: number;
    total_credit: number;
    closing_balance: number;
    lines: LedgerLine[];
}

interface Filters {
    from: string;
    to: string;
    account_id: number | null;
    include_voided: boolean;
}

interface Props {
    accounts: AccountOption[];
    ledger: Ledger | null;
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

export default function GeneralLedger({ accounts, ledger, filters }: Props) {
    const [accountId, setAccountId] = useState<string>(
        filters.account_id ? String(filters.account_id) : ""
    );
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [includeVoided, setIncludeVoided] = useState(filters.include_voided);

    const apply = (e?: FormEvent) => {
        e?.preventDefault();
        router.get(
            "/laporan/buku-besar",
            {
                account_id: accountId || undefined,
                from,
                to,
                include_voided: includeVoided ? 1 : undefined,
            },
            { preserveScroll: true, preserveState: true }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Laporan – Buku Besar" />

            <Breadcrumb
                items={[{ label: "Laporan" }, { label: "Buku Besar" }]}
            />

            <div className="flex items-center gap-2 mb-5">
                <BookOpen className="text-indigo-500" size={22} />
                <h1 className="text-xl font-bold text-gray-900">
                    Buku Besar
                </h1>
            </div>

            {/* Filter */}
            <form
                onSubmit={apply}
                className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-gray-50 rounded-lg border"
            >
                <div className="min-w-64">
                    <label className="block text-xs text-gray-500 mb-1">
                        Akun
                    </label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                    >
                        <option value="">— Pilih Akun —</option>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">
                        Dari Tanggal
                    </label>
                    <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-40"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">
                        Sampai Tanggal
                    </label>
                    <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-40"
                    />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 h-9">
                    <input
                        type="checkbox"
                        checked={includeVoided}
                        onChange={(e) => setIncludeVoided(e.target.checked)}
                        className="rounded"
                    />
                    Sertakan jurnal dibatalkan
                </label>
                <Button type="submit" className="gap-1.5">
                    <Search size={16} />
                    Tampilkan
                </Button>
            </form>

            {!ledger ? (
                <Card>
                    <CardContent className="p-10 text-center text-gray-500 text-sm">
                        Pilih akun terlebih dahulu untuk menampilkan mutasi
                        buku besar.
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Header akun */}
                    <div className="mb-5">
                        <div className="text-sm text-gray-500">
                            {ledger.account.type_label}
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                            <span className="text-gray-400">
                                {ledger.account.code}
                            </span>{" "}
                            {ledger.account.name}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Periode: {fmtDate(filters.from)} –{" "}
                            {fmtDate(filters.to)} · Saldo normal:{" "}
                            {ledger.account.normal_balance === "debit"
                                ? "Debit"
                                : "Kredit"}
                        </p>
                    </div>

                    {/* Ringkasan */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500">
                                    Saldo Awal
                                </div>
                                <div className="text-lg font-semibold text-gray-900">
                                    {fmt(ledger.opening_balance)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500">
                                    Total Debit
                                </div>
                                <div className="text-lg font-semibold text-blue-700">
                                    {fmt(ledger.total_debit)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500">
                                    Total Kredit
                                </div>
                                <div className="text-lg font-semibold text-amber-700">
                                    {fmt(ledger.total_credit)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500">
                                    Saldo Akhir
                                </div>
                                <div className="text-lg font-semibold text-green-700">
                                    {fmt(ledger.closing_balance)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabel mutasi */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-28">
                                            Tanggal
                                        </TableHead>
                                        <TableHead className="w-36">
                                            No. Jurnal
                                        </TableHead>
                                        <TableHead>Deskripsi</TableHead>
                                        <TableHead className="w-36">
                                            Sumber
                                        </TableHead>
                                        <TableHead className="text-right w-32">
                                            Debit
                                        </TableHead>
                                        <TableHead className="text-right w-32">
                                            Kredit
                                        </TableHead>
                                        <TableHead className="text-right w-36">
                                            Saldo
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-gray-50">
                                        <TableCell
                                            colSpan={6}
                                            className="text-sm font-medium text-gray-600"
                                        >
                                            Saldo Awal
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {fmt(ledger.opening_balance)}
                                        </TableCell>
                                    </TableRow>

                                    {ledger.lines.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="text-center text-sm text-gray-400 py-6"
                                            >
                                                Tidak ada mutasi pada periode ini
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ledger.lines.map((row) => {
                                            const isVoided =
                                                row.status === "voided";
                                            return (
                                                <TableRow
                                                    key={row.line_id}
                                                    className={
                                                        isVoided
                                                            ? "line-through opacity-60"
                                                            : ""
                                                    }
                                                >
                                                    <TableCell className="text-sm">
                                                        {fmtDate(row.date)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Link
                                                            href={`/jurnal/${row.entry_id}`}
                                                            className="text-indigo-600 hover:underline text-sm font-mono"
                                                        >
                                                            {row.entry_number}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {row.description ?? "—"}
                                                        {isVoided && (
                                                            <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 no-underline">
                                                                Dibatalkan
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-500">
                                                        {row.source_label}
                                                    </TableCell>
                                                    <TableCell className="text-right text-blue-700 tabular-nums">
                                                        {row.debit > 0
                                                            ? fmt(row.debit)
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right text-amber-700 tabular-nums">
                                                        {row.credit > 0
                                                            ? fmt(row.credit)
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums font-medium">
                                                        {fmt(
                                                            row.running_balance
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}

                                    <TableRow className="bg-gray-50 font-semibold border-t-2">
                                        <TableCell colSpan={4}>
                                            Total Mutasi
                                        </TableCell>
                                        <TableCell className="text-right text-blue-700 tabular-nums">
                                            {fmt(ledger.total_debit)}
                                        </TableCell>
                                        <TableCell className="text-right text-amber-700 tabular-nums">
                                            {fmt(ledger.total_credit)}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {fmt(ledger.closing_balance)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </AuthenticatedLayout>
    );
}
