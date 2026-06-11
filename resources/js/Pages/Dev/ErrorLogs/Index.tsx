import { FormEvent, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlertOctagon, ChevronDown, ChevronUp, Clock, Search, ServerCrash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from '@/components/ui/select';
import DevLayout from "@/Layouts/DevLayout";
import { cn } from "@/lib/utils";

interface ErrorLogItem {
    id: number;
    level: string;
    message: string;
    exception_class: string | null;
    file: string | null;
    line: number | null;
    trace: string | null;
    context: Record<string, unknown> | null;
    request_method: string | null;
    request_url: string | null;
    route_name: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string | null;
    user: {
        name: string;
        email: string;
    } | null;
    company: {
        name: string;
        email: string | null;
    } | null;
}

interface PaginatedErrorLogs {
    data: ErrorLogItem[];
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
    errorLogs: PaginatedErrorLogs;
    filters: {
        search: string;
        level: string;
    };
}

const levelStyles: Record<string, string> = {
    CRITICAL: "border-red-200 bg-red-50 text-red-700",
    ALERT: "border-rose-200 bg-rose-50 text-rose-700",
    EMERGENCY: "border-gray-900 bg-gray-900 text-white",
};

function formatContext(context: Record<string, unknown> | null): string {
    if (!context || Object.keys(context).length === 0) {
        return "-";
    }

    return JSON.stringify(context, null, 2);
}

function ErrorLogRow({ item }: { item: ErrorLogItem }) {
    const [isOpen, setIsOpen] = useState(false);
    const level = item.level.toUpperCase();

    return (
        <div className="border-b border-gray-100 py-4 last:border-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700">
                            #{item.id}
                        </span>
                        <span
                            className={cn(
                                "border px-2 py-1 text-xs font-medium",
                                levelStyles[level] ?? "border-red-200 bg-red-50 text-red-700"
                            )}
                        >
                            {level}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={13} />
                            {item.created_at ?? "-"}
                        </span>
                    </div>

                    <div>
                        <p className="font-mono text-xs text-red-700">
                            {item.exception_class ?? "Log message"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-5 text-gray-900">
                            {item.message}
                        </p>
                    </div>

                    <div className="grid gap-3 text-xs text-gray-500 md:grid-cols-3">
                        <div>
                            <p className="font-medium text-gray-700">Company</p>
                            <p className="mt-1 text-gray-900">{item.company?.name ?? "-"}</p>
                            <p className="truncate">{item.company?.email ?? "-"}</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-700">User</p>
                            <p className="mt-1 text-gray-900">{item.user?.name ?? "-"}</p>
                            <p className="truncate">{item.user?.email ?? "-"}</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-700">Request</p>
                            <p className="mt-1 text-gray-900">
                                {item.request_method ?? "-"} {item.route_name ?? ""}
                            </p>
                            <p className="truncate">{item.ip_address ?? "-"}</p>
                        </div>
                    </div>

                    {(item.file || item.request_url) && (
                        <div className="space-y-1 text-xs text-gray-500">
                            {item.file && (
                                <p className="truncate">
                                    <span className="font-medium text-gray-700">File:</span>{" "}
                                    {item.file}
                                    {item.line ? `:${item.line}` : ""}
                                </p>
                            )}
                            {item.request_url && (
                                <p className="truncate">
                                    <span className="font-medium text-gray-700">URL:</span>{" "}
                                    {item.request_url}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen((value) => !value)}
                    className="shrink-0"
                >
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    Detail
                </Button>
            </div>

            {isOpen && (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="min-w-0 border border-gray-200 bg-gray-50 p-3">
                        <p className="mb-2 text-xs font-medium text-gray-700">Context</p>
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-3 text-xs leading-5 text-gray-700">
                            {formatContext(item.context)}
                        </pre>
                    </div>
                    <div className="min-w-0 border border-gray-200 bg-gray-50 p-3">
                        <p className="mb-2 text-xs font-medium text-gray-700">Trace</p>
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-3 text-xs leading-5 text-gray-700">
                            {item.trace ?? "-"}
                        </pre>
                    </div>
                    {item.user_agent && (
                        <div className="border border-gray-200 bg-gray-50 p-3 lg:col-span-2">
                            <p className="mb-1 text-xs font-medium text-gray-700">User Agent</p>
                            <p className="break-words text-xs text-gray-500">{item.user_agent}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function DevErrorLogsIndex({ errorLogs, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [level, setLevel] = useState(filters.level ?? "");

    const submit = (event: FormEvent) => {
        event.preventDefault();

        router.get(
            "/dev/error-logs",
            { search, level },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    return (
        <DevLayout>
            <Head title="Dev Error Logs" />

            <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600">
                            <AlertOctagon size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Error Logs
                            </h1>
                            <p className="text-xs text-gray-500">
                                Log critical dari exception dan pemanggilan Log::critical
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="grid w-full gap-2 sm:grid-cols-[1fr_160px_40px] lg:w-[560px]">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari error..."
                            className="h-9"
                        />
                        <Select
                            value={level}
                            onChange={(event) => setLevel(event.target.value)}
                            className="h-9 border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                        >
                            <option value="">Semua level</option>
                            <option value="CRITICAL">Critical</option>
                            <option value="ALERT">Alert</option>
                            <option value="EMERGENCY">Emergency</option>
                        </Select>
                        <Button type="submit" size="lg" className="h-9">
                            <Search size={16} />
                        </Button>
                    </form>
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <ServerCrash size={16} />
                            Total {errorLogs.total} error
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {errorLogs.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-400">
                                Error log tidak ditemukan.
                            </p>
                        ) : (
                            <div>
                                {errorLogs.data.map((item) => (
                                    <ErrorLogRow key={item.id} item={item} />
                                ))}
                            </div>
                        )}

                        {errorLogs.links.length > 3 && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                                <p className="text-xs text-gray-500">
                                    Menampilkan {errorLogs.from ?? 0}-{errorLogs.to ?? 0} dari {errorLogs.total}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {errorLogs.links.map((link, index) => (
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
