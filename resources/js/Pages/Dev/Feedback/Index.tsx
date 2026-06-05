import { FormEvent, useState } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import {
    CheckCircle2,
    Clock,
    ImageIcon,
    MessageSquare,
    Search,
    User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DevLayout from "@/Layouts/DevLayout";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
    error: "Terjadi error",
    data_mismatch: "Data tidak sesuai",
    feature_request: "Permintaan fitur",
    question: "Pertanyaan",
};

const statusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "Diproses",
    resolved: "Selesai",
    closed: "Ditutup",
};

const statusStyles: Record<string, string> = {
    open: "border-red-200 bg-red-50 text-red-700",
    in_progress: "border-amber-200 bg-amber-50 text-amber-700",
    resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    closed: "border-gray-200 bg-gray-50 text-gray-600",
};

interface FeedbackItem {
    id: number;
    category: string;
    status: string;
    message: string;
    image_url: string | null;
    user_agent: string | null;
    developer_response: string | null;
    created_at: string | null;
    responded_at: string | null;
    user: {
        name: string;
        email: string;
    } | null;
    company: {
        name: string;
        email: string | null;
    } | null;
    responder: {
        name: string;
        email: string;
    } | null;
}

interface PaginatedFeedback {
    data: FeedbackItem[];
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
    feedback: PaginatedFeedback;
    filters: {
        search: string;
        status: string;
    };
}

function TicketItem({ item }: { item: FeedbackItem }) {
    const { data, setData, put, processing, errors } = useForm({
        status: item.status,
        developer_response: item.developer_response ?? "",
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        put(`/dev/feedback/${item.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="border-b border-gray-100 py-4 last:border-0">
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700">
                            #{item.id}
                        </span>
                        <span className="border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                            {categoryLabels[item.category] ?? item.category}
                        </span>
                        <span
                            className={cn(
                                "border px-2 py-1 text-xs font-medium",
                                statusStyles[item.status] ?? statusStyles.open
                            )}
                        >
                            {statusLabels[item.status] ?? item.status}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={13} />
                            {item.created_at ?? "-"}
                        </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                        {item.message}
                    </p>

                    {item.image_url && (
                        <a
                            href={item.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <ImageIcon size={15} />
                            Lihat lampiran
                        </a>
                    )}

                    <div className="grid gap-3 text-xs text-gray-500 md:grid-cols-3">
                        <div>
                            <p className="font-medium text-gray-700">User</p>
                            <p className="mt-1 text-gray-900">{item.user?.name ?? "-"}</p>
                            <p className="truncate">{item.user?.email ?? "-"}</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-700">Company</p>
                            <p className="mt-1 text-gray-900">{item.company?.name ?? "-"}</p>
                            <p className="truncate">{item.company?.email ?? "-"}</p>
                        </div>
                    </div>

                    {item.user_agent && (
                        <p className="line-clamp-1 text-xs text-gray-400">
                            {item.user_agent}
                        </p>
                    )}
                </div>

                <form onSubmit={submit} className="space-y-3 border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-medium text-gray-700">
                            Status
                        </label>
                        {item.responder && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                <CheckCircle2 size={13} />
                                {item.responded_at ?? "-"}
                            </span>
                        )}
                    </div>
                    <select
                        value={data.status}
                        onChange={(event) => setData("status", event.target.value)}
                        className="h-9 w-full border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                    >
                        <option value="open">Open</option>
                        <option value="in_progress">Diproses</option>
                        <option value="resolved">Selesai</option>
                        <option value="closed">Ditutup</option>
                    </select>
                    {errors.status && (
                        <p className="text-xs text-red-600">{errors.status}</p>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">
                            Tanggapan dev
                        </label>
                        <Textarea
                            value={data.developer_response}
                            onChange={(event) =>
                                setData("developer_response", event.target.value)
                            }
                            className="min-h-28 resize-y bg-white text-sm"
                            placeholder="Tulis tindak lanjut atau jawaban untuk ticket ini..."
                        />
                        {errors.developer_response && (
                            <p className="text-xs text-red-600">
                                {errors.developer_response}
                            </p>
                        )}
                    </div>

                    {item.responder && (
                        <p className="text-xs text-gray-500">
                            Ditanggapi oleh{" "}
                            <span className="font-medium text-gray-700">
                                {item.responder.name}
                            </span>
                        </p>
                    )}

                    <Button type="submit" size="lg" className="w-full" disabled={processing}>
                        Simpan Ticket
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function DevFeedbackIndex({ feedback, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [status, setStatus] = useState(filters.status ?? "");

    const submit = (event: FormEvent) => {
        event.preventDefault();

        router.get(
            "/dev/feedback",
            { search, status },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    return (
        <DevLayout>
            <Head title="Dev Tickets" />

            <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
                            <MessageSquare size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Ticket Feedback
                            </h1>
                            <p className="text-xs text-gray-500">
                                Kelola laporan, pertanyaan, dan permintaan fitur dari pengguna
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="grid w-full gap-2 sm:grid-cols-[1fr_160px_40px] lg:w-[560px]">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari ticket..."
                            className="h-9"
                        />
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="h-9 border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                        >
                            <option value="">Semua status</option>
                            <option value="open">Open</option>
                            <option value="in_progress">Diproses</option>
                            <option value="resolved">Selesai</option>
                            <option value="closed">Ditutup</option>
                        </select>
                        <Button type="submit" size="lg" className="h-9">
                            <Search size={16} />
                        </Button>
                    </form>
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <User size={16} />
                            Total {feedback.total} ticket
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {feedback.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-400">
                                Ticket tidak ditemukan.
                            </p>
                        ) : (
                            <div>
                                {feedback.data.map((item) => (
                                    <TicketItem key={item.id} item={item} />
                                ))}
                            </div>
                        )}

                        {feedback.links.length > 3 && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                                <p className="text-xs text-gray-500">
                                    Menampilkan {feedback.from ?? 0}-{feedback.to ?? 0} dari {feedback.total}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {feedback.links.map((link, index) => (
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
