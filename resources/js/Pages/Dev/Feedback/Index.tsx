import { FormEvent, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { MessageSquare, Search, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DevLayout from "@/Layouts/DevLayout";
import { cn } from "@/lib/utils";

interface FeedbackItem {
    id: number;
    message: string;
    page_url: string | null;
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
    };
}

export default function DevFeedbackIndex({ feedback, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? "");

    const submit = (event: FormEvent) => {
        event.preventDefault();

        router.get(
            "/dev/feedback",
            { search },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    return (
        <DevLayout>
            <Head title="Dev Feedback" />

            <div className="space-y-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
                            <MessageSquare size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Feedback
                            </h1>
                            <p className="text-xs text-gray-500">
                                Masukan dan laporan dari pengguna aplikasi
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="flex w-full gap-2 md:w-80">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari feedback..."
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
                            <User size={16} />
                            Total {feedback.total} feedback
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {feedback.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-400">
                                Feedback tidak ditemukan.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                                            <th className="pb-2 pr-4 font-medium">Feedback</th>
                                            <th className="pb-2 pr-4 font-medium">User</th>
                                            <th className="pb-2 pr-4 font-medium">Company</th>
                                            <th className="pb-2 pr-4 font-medium">Halaman</th>
                                            <th className="pb-2 font-medium">Dikirim</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {feedback.data.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-b border-gray-50 align-top last:border-0"
                                            >
                                                <td className="max-w-md py-3 pr-4">
                                                    <p className="whitespace-pre-wrap text-gray-800">
                                                        {item.message}
                                                    </p>
                                                    {item.user_agent && (
                                                        <p className="mt-2 line-clamp-1 text-xs text-gray-400">
                                                            {item.user_agent}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-3 pr-4 text-gray-600">
                                                    <div className="font-medium text-gray-900">
                                                        {item.user?.name ?? "-"}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {item.user?.email ?? "-"}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-gray-600">
                                                    <div>{item.company?.name ?? "-"}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {item.company?.email ?? "-"}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-gray-500">
                                                    {item.page_url ?? "-"}
                                                </td>
                                                <td className="py-3 text-gray-500">
                                                    {item.created_at ?? "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
