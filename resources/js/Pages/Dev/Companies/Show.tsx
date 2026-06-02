import { Head, Link } from "@inertiajs/react";
import {
    ArrowLeft,
    Building2,
    Calendar,
    Mail,
    MapPin,
    Phone,
    UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import DevLayout from "@/Layouts/DevLayout";
import { cn } from "@/lib/utils";

interface CompanyDetail {
    id: number;
    name: string;
    legal_name: string | null;
    tax_id: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    currency: string;
    timezone: string;
    fiscal_year_start: number;
    logo_path: string | null;
    created_at: string | null;
    updated_at: string | null;
    counts: {
        users: number;
        transactions: number;
        cash_bank_accounts: number;
        partners: number;
        roles: number;
        accounts: number;
    };
}

interface OwnerDetail {
    id: number | null;
    name: string | null;
    email: string | null;
    email_verified_at: string | null;
    current_company_id: number | null;
    role: string | null;
    is_active: boolean;
    joined_at: string | null;
}

interface Props {
    company: CompanyDetail;
    owner: OwnerDetail | null;
}

function DetailRow({ label, value }: { label: string; value: string | number | null }) {
    return (
        <div className="grid gap-1 border-b border-gray-50 py-3 last:border-0 md:grid-cols-[180px_1fr]">
            <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
            <dd className="text-sm text-gray-800">{value ?? "-"}</dd>
        </div>
    );
}

function CountBox({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
}

export default function DevCompanyShow({ company, owner }: Props) {
    return (
        <DevLayout>
            <Head title={`Company - ${company.name}`} />

            <div className="space-y-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                            <Building2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                {company.name}
                            </h1>
                            <p className="text-xs text-gray-500">
                                Detail company dan owner
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/dev/companies"
                        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-9")}
                    >
                        <ArrowLeft size={16} />
                        Kembali
                    </Link>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Building2 size={16} />
                                Data Company
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl>
                                <DetailRow label="Nama" value={company.name} />
                                <DetailRow label="Nama Legal" value={company.legal_name} />
                                <DetailRow label="NPWP / Tax ID" value={company.tax_id} />
                                <DetailRow label="Email" value={company.email} />
                                <DetailRow label="Telepon" value={company.phone} />
                                <DetailRow label="Alamat" value={company.address} />
                                <DetailRow label="Currency" value={company.currency} />
                                <DetailRow label="Timezone" value={company.timezone} />
                                <DetailRow label="Awal Tahun Fiskal" value={`Tanggal ${company.fiscal_year_start}`} />
                                <DetailRow label="Logo Path" value={company.logo_path} />
                                <DetailRow label="Dibuat" value={company.created_at} />
                                <DetailRow label="Diupdate" value={company.updated_at} />
                            </dl>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <UserCheck size={16} />
                                    Owner Company
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {owner ? (
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-base font-semibold text-gray-900">
                                                {owner.name ?? "-"}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {owner.role ?? "Owner"}
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-sm text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <Mail size={15} className="text-gray-400" />
                                                {owner.email ?? "-"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={15} className="text-gray-400" />
                                                Bergabung {owner.joined_at ?? "-"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={15} className="text-gray-400" />
                                                Current company ID: {owner.current_company_id ?? "-"}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className={owner.is_active ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600" : "rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600"}>
                                                {owner.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                            <span className={owner.email_verified_at ? "rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600" : "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600"}>
                                                {owner.email_verified_at ? "Email verified" : "Email belum verified"}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="py-4 text-sm text-gray-400">
                                        Owner company tidak ditemukan.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <Phone size={16} />
                                    Ringkasan Data
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-3">
                                    <CountBox label="User" value={company.counts.users} />
                                    <CountBox label="Role" value={company.counts.roles} />
                                    <CountBox label="Akun" value={company.counts.accounts} />
                                    <CountBox label="Kas/Bank" value={company.counts.cash_bank_accounts} />
                                    <CountBox label="Mitra" value={company.counts.partners} />
                                    <CountBox label="Transaksi" value={company.counts.transactions} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DevLayout>
    );
}
