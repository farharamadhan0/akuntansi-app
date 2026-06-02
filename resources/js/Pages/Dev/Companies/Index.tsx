import { FormEvent, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { Building2, Eye, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DevLayout from "@/Layouts/DevLayout";
import { cn } from "@/lib/utils";

interface Company {
    id: number;
    name: string;
    legal_name: string | null;
    email: string | null;
    phone: string | null;
    currency: string;
    created_at: string | null;
    users_count: number;
    transactions_count: number;
    cash_bank_accounts_count: number;
    partners_count: number;
}

interface PaginatedCompanies {
    data: Company[];
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    companies: PaginatedCompanies;
    filters: {
        search: string;
    };
}

export default function DevCompaniesIndex({ companies, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? "");

    const submit = (event: FormEvent) => {
        event.preventDefault();

        router.get(
            "/dev/companies",
            { search },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    return (
        <DevLayout>
            <Head title="Dev Companies" />

            <div className="space-y-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                            <Building2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Companies
                            </h1>
                            <p className="text-xs text-gray-500">
                                Daftar company yang terdaftar di aplikasi
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="flex w-full gap-2 md:w-80">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari company..."
                            className="h-9"
                        />
                        <Button type="submit" size="lg" className="h-9">
                            <Search size={16} />
                        </Button>
                    </form>
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Users size={16} />
                            Total {companies.total} company
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {companies.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-400">
                                Company tidak ditemukan.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                                            <th className="pb-2 pr-4 font-medium">Company</th>
                                            <th className="pb-2 pr-4 font-medium">Kontak</th>
                                            <th className="pb-2 pr-4 font-medium">Data</th>
                                            <th className="pb-2 pr-4 font-medium">Terdaftar</th>
                                            <th className="pb-2 font-medium"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {companies.data.map((company) => (
                                            <tr
                                                key={company.id}
                                                className="border-b border-gray-50 last:border-0"
                                            >
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium text-gray-900">
                                                        {company.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {company.legal_name ?? "-"} · {company.currency}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-gray-600">
                                                    <div>{company.email ?? "-"}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {company.phone ?? "-"}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                                            {company.users_count} user
                                                        </span>
                                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                                            {company.transactions_count} transaksi
                                                        </span>
                                                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                                                            {company.partners_count} mitra
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-gray-500">
                                                    {company.created_at ?? "-"}
                                                </td>
                                                <td className="py-3">
                                                    <Link
                                                        href={`/dev/companies/${company.id}`}
                                                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                                                    >
                                                        <Eye size={14} />
                                                        Detail
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {companies.links.length > 3 && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                                <p className="text-xs text-gray-500">
                                    Menampilkan {companies.from ?? 0}-{companies.to ?? 0} dari {companies.total}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {companies.links.map((link, index) => (
                                        <Link
                                            key={`${link.label}-${index}`}
                                            href={link.url ?? "#"}
                                            preserveState
                                            className={cn(
                                                buttonVariants({
                                                    variant: link.active ? "default" : "outline",
                                                    size: "sm",
                                                }),
                                                !link.url && "pointer-events-none opacity-50"
                                            )}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DevLayout>
    );
}
