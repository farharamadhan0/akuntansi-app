import { FormEvent, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import { ArrowLeft, ImageIcon, LifeBuoy, Send, X } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
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

interface TicketMessage {
    id: number;
    sender_type: "user" | "developer";
    message: string;
    created_at: string | null;
    user: {
        name: string;
        email: string;
    } | null;
}

interface Ticket {
    id: number;
    category: string;
    status: string;
    message: string;
    image_url: string | null;
    created_at: string | null;
    can_reply: boolean;
    messages: TicketMessage[];
}

interface Props {
    ticket: Ticket;
}

export default function FeedbackShow({ ticket }: Props) {
    const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        message: "",
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        post(`/bantuan/ticket/${ticket.id}/messages`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Ticket #${ticket.id}`} />

            <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 sm:h-10 sm:w-10">
                            <LifeBuoy size={20} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
                                Ticket #{ticket.id}
                            </h1>
                            <p className="text-xs text-gray-500">
                                Detail ticket dan percakapan dengan tim dev
                            </p>
                        </div>
                    </div>

                    <Link href="/bantuan" className={buttonLikeClass}>
                        <ArrowLeft size={16} />
                        Kembali
                    </Link>
                </div>

                <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Detail Ticket
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
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
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-700">Dibuat</p>
                                <p className="mt-1 text-sm text-gray-600">{ticket.created_at ?? "-"}</p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-700">Detail</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                    {ticket.message}
                                </p>
                            </div>

                            {ticket.image_url && (
                                <button
                                    type="button"
                                    onClick={() => setIsAttachmentOpen(true)}
                                    className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <ImageIcon size={15} />
                                    Lihat lampiran
                                </button>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-700">
                                Percakapan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[52vh] min-h-48 space-y-3 overflow-y-auto border border-gray-100 bg-gray-50 p-2 sm:max-h-[58vh] sm:p-3">
                                {ticket.messages.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-gray-400">
                                        Belum ada percakapan. Tunggu dev menanggapi ticket ini.
                                    </p>
                                ) : (
                                    ticket.messages.map((message) => {
                                        const isUser = message.sender_type === "user";

                                        return (
                                            <div
                                                key={`${message.sender_type}-${message.id}-${message.created_at}`}
                                                className={cn("flex", isUser ? "justify-end" : "justify-start")}
                                            >
                                                <div
                                                    className={cn(
                                                        "max-w-[92%] border px-3 py-2 sm:max-w-[82%]",
                                                        isUser
                                                            ? "border-primary/20 bg-primary/10 text-gray-900"
                                                            : "border-emerald-200 bg-emerald-50 text-emerald-950"
                                                    )}
                                                >
                                                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="font-medium">
                                                            {isUser ? "Kamu" : "Dev"}
                                                        </span>
                                                        <span className={isUser ? "text-gray-500" : "text-emerald-700"}>
                                                            {message.created_at ?? "-"}
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap text-sm leading-5">
                                                        {message.message}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <form onSubmit={submit} className="mt-4 space-y-2">
                                <Textarea
                                    value={data.message}
                                    onChange={(event) => setData("message", event.target.value)}
                                    className="min-h-24 resize-y text-sm"
                                    placeholder={
                                        ticket.can_reply
                                            ? "Tulis balasan kamu..."
                                            : "Menunggu tanggapan dev."
                                    }
                                    disabled={!ticket.can_reply || processing}
                                />
                                {errors.message && (
                                    <p className="text-xs text-red-600">{errors.message}</p>
                                )}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-gray-400">
                                        {ticket.can_reply
                                            ? "Kamu bisa membalas karena dev sudah menanggapi."
                                            : "Kamu bisa membalas setelah dev menanggapi."}
                                    </p>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full sm:w-auto"
                                        disabled={!ticket.can_reply || processing}
                                    >
                                        <Send size={16} />
                                        Kirim Balasan
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {isAttachmentOpen && ticket.image_url && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
                    <div className="flex max-h-[92vh] w-full max-w-4xl flex-col border border-gray-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    Lampiran Ticket #{ticket.id}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Gambar yang dikirim saat ticket dibuat
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAttachmentOpen(false)}
                                className="p-1.5 text-gray-500 hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-gray-950 p-2 sm:p-4">
                            <img
                                src={ticket.image_url}
                                alt={`Lampiran ticket #${ticket.id}`}
                                className="max-h-[78vh] max-w-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

const buttonLikeClass =
    "inline-flex h-9 w-full items-center justify-center gap-1.5 border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto";
