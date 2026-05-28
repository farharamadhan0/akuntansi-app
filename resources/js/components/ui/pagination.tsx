import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface FlatPaginator {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    links: PaginationLink[];
    prev_page_url: string | null;
    next_page_url: string | null;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

interface PaginationProps {
    transactions: FlatPaginator;
    perPage?: number;
    onPerPageChange?: (value: number) => void;
}

export function Pagination({ transactions: t, perPage, onPerPageChange }: PaginationProps) {
    const showPerPage = !!onPerPageChange;

    if (!t || (t.last_page <= 1 && !showPerPage)) return null;

    const allLinks = t.links ?? [];
    const numberLinks = allLinks.filter((l) => {
        const html = l.label;
        return !html.includes('&laquo;') && !html.includes('&raquo;') &&
               !html.toLowerCase().includes('previous') && !html.toLowerCase().includes('next');
    });

    const MAX_VISIBLE = 5;
    let visiblePages = numberLinks;
    if (numberLinks.length > MAX_VISIBLE) {
        const currentIndex = numberLinks.findIndex((l) => l.active);
        const half = Math.floor(MAX_VISIBLE / 2);
        let start = Math.max(0, currentIndex - half);
        let end = start + MAX_VISIBLE;
        if (end > numberLinks.length) {
            end = numberLinks.length;
            start = Math.max(0, end - MAX_VISIBLE);
        }
        visiblePages = numberLinks.slice(start, end);
    }

    const firstPage = numberLinks[0];
    const lastPage = numberLinks[numberLinks.length - 1];
    const showLeftEllipsis = visiblePages.length > 0 && numberLinks.indexOf(visiblePages[0]) > 0;
    const showRightEllipsis =
        visiblePages.length > 0 &&
        numberLinks.indexOf(visiblePages[visiblePages.length - 1]) < numberLinks.length - 1;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-white gap-4">
            <div className="flex items-center gap-3">
                {showPerPage && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Tampilkan</span>
                        <select
                            value={perPage}
                            onChange={(e) => onPerPageChange!(Number(e.target.value))}
                            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            {PER_PAGE_OPTIONS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">per halaman</span>
                    </div>
                )}
                <p className="text-sm text-muted-foreground">
                    {t.from && t.to ? (
                        <>
                            <span className="font-medium text-gray-700">{t.from}–{t.to}</span>
                            {' '}dari{' '}
                            <span className="font-medium text-gray-700">{t.total}</span> data
                        </>
                    ) : (
                        <>{t.total} data</>
                    )}
                </p>
            </div>

            <div className="flex items-center gap-1">
                {t.prev_page_url ? (
                    <Link href={t.prev_page_url} preserveScroll>
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <ChevronLeft size={14} />
                            <span className="hidden sm:inline">Sebelumnya</span>
                        </button>
                    </Link>
                ) : (
                    <button disabled className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed">
                        <ChevronLeft size={14} />
                        <span className="hidden sm:inline">Sebelumnya</span>
                    </button>
                )}

                <div className="hidden sm:flex items-center gap-1">
                    {showLeftEllipsis && firstPage?.url && (
                        <>
                            <Link href={firstPage.url} preserveScroll>
                                <button className="inline-flex items-center justify-center w-8 h-8 text-sm rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                                    {firstPage.label}
                                </button>
                            </Link>
                            <span className="px-1 text-gray-400 text-sm select-none">…</span>
                        </>
                    )}

                    {visiblePages.map((page) =>
                        page.active ? (
                            <button
                                key={page.label}
                                className="inline-flex items-center justify-center w-8 h-8 text-sm rounded-md bg-primary text-primary-foreground font-medium shadow-sm cursor-default"
                            >
                                {page.label}
                            </button>
                        ) : page.url ? (
                            <Link key={page.label} href={page.url} preserveScroll>
                                <button className="inline-flex items-center justify-center w-8 h-8 text-sm rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                                    {page.label}
                                </button>
                            </Link>
                        ) : null
                    )}

                    {showRightEllipsis && lastPage?.url && (
                        <>
                            <span className="px-1 text-gray-400 text-sm select-none">…</span>
                            <Link href={lastPage.url} preserveScroll>
                                <button className="inline-flex items-center justify-center w-8 h-8 text-sm rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                                    {lastPage.label}
                                </button>
                            </Link>
                        </>
                    )}
                </div>

                <span className="sm:hidden text-sm text-muted-foreground px-2">
                    {t.current_page} / {t.last_page}
                </span>

                {t.next_page_url ? (
                    <Link href={t.next_page_url} preserveScroll>
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <span className="hidden sm:inline">Berikutnya</span>
                            <ChevronRight size={14} />
                        </button>
                    </Link>
                ) : (
                    <button disabled className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed">
                        <span className="hidden sm:inline">Berikutnya</span>
                        <ChevronRight size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
