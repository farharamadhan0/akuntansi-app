import { Head, Link, router } from "@inertiajs/react";
import { useState, type FormEvent } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
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
import { formatDateDDMMYYYY } from "@/lib/format";
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

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedLedgerLines {
    data: LedgerLine[];
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    links: PaginationLink[];
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
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
    lines: PaginatedLedgerLines;
}

interface Filters {
    from: string;
    to: string;
    account_id: number | null;
    include_voided: boolean;
    per_page: number;
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

const fmtDate = (d: string) => formatDateDDMMYYYY(d);

export default function GeneralLedger({ accounts, ledger, filters }: Props) {
    const [accountId, setAccountId] = useState<string>(
        filters.account_id ? String(filters.account_id) : ""
    );
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [includeVoided, setIncludeVoided] = useState(filters.include_voided);
    const perPage = filters?.per_page ?? 25;

    const navigate = (overrides: Record<string, string | number | undefined>) => {
        router.get(
            "/laporan/buku-besar",
            {
                account_id: accountId || undefined,
                from,
                to,
                include_voided: includeVoided ? 1 : undefined,
                per_page: perPage,
                ...overrides,
            },
            { preserveScroll: true, preserveState: true }
        );
    };

    const apply = (e?: FormEvent) => {
        e?.preventDefault();
        navigate({ account_id: accountId || undefined, from, to, include_voided: includeVoided ? 1 : undefined });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Laporan - Buku Besar" />

            <Breadcrumb
                items={[{ label: "Laporan" }, { label: "Buku Besar" }]}
            />

            <div className="mb-5 flex items-center gap-2">
                <BookOpen className="text-indigo-500" size={22} />
                <h1 className="text-xl font-bold text-gray-900">
                    Buku Besar
                </h1>
            </div>

            <form
                onSubmit={apply}
                className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border bg-gray-50 p-4"
            >
                <div className="min-w-64">
                    <label className="mb-1 block text-xs text-gray-500">
                        Akun
                    </label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                    >
                        <option value="">- Pilih Akun -</option>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs text-gray-500">
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
                    <label className="mb-1 block text-xs text-gray-500">
                        Sampai Tanggal
                    </label>
                    <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-40"
                    />
                </div>
                <label className="flex h-9 items-center gap-2 text-sm text-gray-700">
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
                    <CardContent className="p-10 text-center text-sm text-gray-500">
                        Pilih akun terlebih dahulu untuk menampilkan mutasi
                        buku besar.
                    </CardContent>
                </Card>
            ) : (
                <>
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
                        <p className="mt-1 text-xs text-gray-400">
                            Periode: {fmtDate(filters.from)} -{" "}
                            {fmtDate(filters.to)} - Saldo normal:{" "}
                            {ledger.account.normal_balance === "debit"
                                ? "Debit"
                                : "Kredit"}
                        </p>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500">
                                    Saldo Awal Periode
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
                                        <TableHead className="w-32 text-right">
                                            Debit
                                        </TableHead>
                                        <TableHead className="w-32 text-right">
                                            Kredit
                                        </TableHead>
                                        <TableHead className="w-36 text-right">
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
                                            Saldo Awal Periode
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {fmt(ledger.opening_balance)}
                                        </TableCell>
                                    </TableRow>

                                    {ledger.lines.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="py-6 text-center text-sm text-gray-400"
                                            >
                                                Tidak ada mutasi pada periode ini
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ledger.lines.data.map((row) => {
                                            const isVoided =
                                                row.status === "voided";
                                            return (
                                                <TableRow
                                                    key={row.line_id}
                                                    className={
                                                        isVoided
                                                            ? "opacity-60 line-through"
                                                            : ""
                                                    }
                                                >
                                                    <TableCell className="text-sm">
                                                        {fmtDate(row.date)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Link
                                                            href={`/jurnal/${row.entry_id}`}
                                                            className="font-mono text-sm text-indigo-600 hover:underline"
                                                        >
                                                            {row.entry_number}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {row.description ?? "-"}
                                                        {isVoided && (
                                                            <span className="ml-2 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700 no-underline">
                                                                Dibatalkan
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-500">
                                                        {row.source_label}
                                                    </TableCell>
                                                    <TableCell className="tabular-nums text-right text-blue-700">
                                                        {row.debit > 0
                                                            ? fmt(row.debit)
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="tabular-nums text-right text-amber-700">
                                                        {row.credit > 0
                                                            ? fmt(row.credit)
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="tabular-nums text-right font-medium">
                                                        {fmt(
                                                            row.running_balance
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}

                                </TableBody>
                            </Table>
                            <Pagination transactions={ledger.lines} perPage={perPage} onPerPageChange={(val) => navigate({ per_page: val })} />
                        </CardContent>
                    </Card>
                </>
            )}
        </AuthenticatedLayout>
    );
}
