import { FormEvent, useState } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import { ImageUp, LifeBuoy, MessageSquare, Plus, Search } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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

interface Ticket {
    id: number;
    category: string;
    status: string;
    message: string;
    image_url: string | null;
    created_at: string | null;
    messages_count: number;
}

interface PaginatedTickets {
    data: Ticket[];
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
    tickets: PaginatedTickets;
    filters: {
        status: string;
    };
}

export default function FeedbackIndex({ tickets, filters }: Props) {
    const [status, setStatus] = useState(filters.status ?? "");
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<{
        category: string;
        message: string;
        image: File | null;
    }>({
        category: "error",
        message: "",
        image: null,
    });

    const filter = (event: FormEvent) => {
        event.preventDefault();

        router.get(
            "/bantuan",
            { status },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        post("/bantuan/ticket", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Bantuan" />

            <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 sm:h-10 sm:w-10">
                            <LifeBuoy size={20} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Bantuan</h1>
                            <p className="text-xs text-gray-500">
                                Buat ticket dan pantau percakapan dengan tim dev
                            </p>
                        </div>
                    </div>

                    <form onSubmit={filter} className="grid w-full grid-cols-[1fr_40px] gap-2 lg:w-[230px] lg:grid-cols-[180px_40px]">
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

                <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
                    <Card className="order-2 xl:order-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <MessageSquare size={16} />
                                Ticket Saya
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tickets.data.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-400">
                                    Belum ada ticket.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {tickets.data.map((ticket) => (
                                        <Link
                                            key={ticket.id}
                                            href={`/bantuan/ticket/${ticket.id}`}
                                            className="block border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
                                        >
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                <span className="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                                                    #{ticket.id}
                                                </span>
                                                <span className="border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                                                    {categoryLabels[ticket.category] ?? ticket.category}
                                                </span>
                                                <span
                                                    className={cn(
                                                        "border px-2 py-1 text-xs font-medium",
                                                        statusStyles[ticket.status] ?? statusStyles.open
                                                    )}
                                                >
                                                    {statusLabels[ticket.status] ?? ticket.status}
                                                </span>
                                                <span className="basis-full text-xs text-gray-400 sm:basis-auto">
                                                    {ticket.created_at ?? "-"}
                                                </span>
                                            </div>
                                            <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-5 text-gray-800">
                                                {ticket.message}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                                                <span>{ticket.messages_count} pesan percakapan</span>
                                                {ticket.image_url && <span>Lampiran tersedia</span>}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {tickets.links.length > 3 && (
                                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                    <p className="text-xs text-gray-500">
                                        Menampilkan {tickets.from ?? 0}-{tickets.to ?? 0} dari {tickets.total}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {tickets.links.map((link, index) => (
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

                    <Card className="order-1 xl:order-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Plus size={16} />
                                Buat Ticket
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-700">
                                        Kategori
                                    </label>
                                    <select
                                        value={data.category}
                                        onChange={(event) => setData("category", event.target.value)}
                                        className="h-9 w-full border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                    >
                                        <option value="error">Terjadi error</option>
                                        <option value="data_mismatch">Data tidak sesuai</option>
                                        <option value="feature_request">Permintaan fitur</option>
                                        <option value="question">Pertanyaan</option>
                                    </select>
                                    {errors.category && (
                                        <p className="text-xs text-red-600">{errors.category}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-700">
                                        Detail ticket
                                    </label>
                                    <Textarea
                                        value={data.message}
                                        onChange={(event) => setData("message", event.target.value)}
                                        className="min-h-40 resize-y text-sm"
                                        placeholder="Tulis kronologi, data yang terkait, atau hasil yang kamu harapkan..."
                                    />
                                    {errors.message && (
                                        <p className="text-xs text-red-600">{errors.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-700">
                                        Lampiran gambar
                                    </label>
                                    <label className="flex min-h-16 cursor-pointer items-center gap-3 border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-600 hover:border-primary hover:bg-primary/5">
                                        <ImageUp size={18} className="shrink-0 text-gray-500" />
                                        <span className="min-w-0 flex-1 truncate">
                                            {data.image?.name ?? "Pilih gambar JPG, PNG, atau WebP"}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="sr-only"
                                            onChange={(event) =>
                                                setData("image", event.target.files?.[0] ?? null)
                                            }
                                        />
                                    </label>
                                    {errors.image && (
                                        <p className="text-xs text-red-600">{errors.image}</p>
                                    )}
                                </div>

                                <Button type="submit" size="lg" className="w-full" disabled={processing}>
                                    Buat Ticket
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
