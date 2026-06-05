import { Link, useForm, usePage, router } from "@inertiajs/react";
import { Toaster } from "sonner";
import { useFlashToast } from "@/hooks/useFlashToast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/lib/permissions";
import {
    topNavCategories,
    contextualSidebarItems,
    quickActions,
    getActiveCategoryKey,
    isSidebarItemActive,
    isMenuEnabled,
    menuId,
    type NavItem,
    type TopNavCategory,
} from "@/lib/navigation.config";
import {
    LogOut,
    Building2,
    ChevronDown,
    Plus,
    Menu,
    X,
    Send,
    ImageUp,
    LifeBuoy,
    RefreshCw,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

interface PageProps {
    auth: { user: { name: string; is_owner?: boolean } };
    company?: { name: string; enabled_menus?: string[] | null };
    [key: string]: unknown;
}

// ============================================================================
// Helpers: visibilitas kategori berdasarkan permission + preferensi menu
// ============================================================================

function categoryHasVisibleItems(
    categoryKey: string,
    enabledMenus: string[] | null | undefined,
    can: (p: string) => boolean,
    isOwner: boolean,
    isCompanyOwner: boolean,
): boolean {
    const items = contextualSidebarItems[categoryKey] ?? [];
    // Kategori tanpa sidebar (mis. dashboard) selalu dianggap tampil.
    if (items.length === 0) return true;

    return items.some((item) => {
        if (item.ownerOnly && !isCompanyOwner) return false;
        if (item.permission && !isOwner && !can(item.permission)) return false;
        if (!isMenuEnabled(menuId(categoryKey, item.key), enabledMenus)) return false;
        return true;
    });
}

// ============================================================================
// Top Navigation Component
// ============================================================================

function TopNavigation({
    activeCategoryKey,
    onMobileMenuToggle,
    isMobileMenuOpen,
}: {
    activeCategoryKey: string;
    onMobileMenuToggle: () => void;
    isMobileMenuOpen: boolean;
}) {
    const { auth, company } = usePage<PageProps>().props;
    const { can, isOwner } = usePermissions();
    const enabledMenus = company?.enabled_menus ?? null;

    const visibleCategories = topNavCategories.filter((cat) => {
        if (cat.ownerOnly && !auth.user.is_owner) return false;
        if (cat.permission && !isOwner && !can(cat.permission)) return false;
        if (!categoryHasVisibleItems(cat.key, enabledMenus, can, isOwner, !!auth.user.is_owner)) return false;
        return true;
    });

    return (
        <nav className="hidden md:flex items-center gap-1">
            {visibleCategories.map((category) => (
                <Link
                    key={category.key}
                    href={category.href}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        activeCategoryKey === category.key
                            ? "bg-primary/10 text-primary"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                >
                    <category.icon size={16} />
                    <span>{category.label}</span>
                </Link>
            ))}
        </nav>
    );
}

// ============================================================================
// Quick Action Button Component
// ============================================================================

function QuickActionButton() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { can, isOwner } = usePermissions();
    const { company } = usePage<PageProps>().props;
    const enabledMenus = company?.enabled_menus ?? null;

    const visibleActions = quickActions.filter((action) => {
        if (!isMenuEnabled(menuId("transaksi", action.key), enabledMenus)) return false;
        if (!action.permission) return true;
        return isOwner || can(action.permission);
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (visibleActions.length === 0) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <Button onClick={() => setIsOpen(!isOpen)} className="gap-2">
                <Plus size={16} />
                <span className="hidden sm:inline">Tambah</span>
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {visibleActions.map((action) => (
                        <Link
                            key={action.key}
                            href={action.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <action.icon size={16} className="text-gray-500" />
                            {action.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

const ticketCategoryLabels: Record<string, string> = {
    error: "Terjadi error",
    data_mismatch: "Data tidak sesuai",
    feature_request: "Permintaan fitur",
    question: "Pertanyaan",
};

const ticketStatusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "Diproses",
    resolved: "Selesai",
    closed: "Ditutup",
};

const ticketStatusStyles: Record<string, string> = {
    open: "border-red-200 bg-red-50 text-red-700",
    in_progress: "border-amber-200 bg-amber-50 text-amber-700",
    resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    closed: "border-gray-200 bg-gray-50 text-gray-600",
};

interface UserTicket {
    id: number;
    category: string;
    status: string;
    message: string;
    image_url: string | null;
    developer_response: string | null;
    created_at: string | null;
    responded_at: string | null;
}

function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"create" | "tickets">("create");
    const [tickets, setTickets] = useState<UserTicket[]>([]);
    const [isLoadingTickets, setIsLoadingTickets] = useState(false);
    const [ticketLoadError, setTicketLoadError] = useState("");
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<{
        category: string;
        message: string;
        image: File | null;
    }>({
        category: "error",
        message: "",
        image: null,
    });

    const close = () => {
        setIsOpen(false);
        setActiveTab("create");
        reset();
        clearErrors();
    };

    const loadTickets = async () => {
        setIsLoadingTickets(true);
        setTicketLoadError("");

        try {
            const response = await fetch("/feedback/tickets", {
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Tidak bisa memuat ticket.");
            }

            const payload = (await response.json()) as { tickets: UserTicket[] };
            setTickets(payload.tickets);
        } catch (error) {
            setTicketLoadError(
                error instanceof Error ? error.message : "Tidak bisa memuat ticket."
            );
        } finally {
            setIsLoadingTickets(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === "tickets") {
            void loadTickets();
        }
    }, [isOpen, activeTab]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        post("/feedback", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
                setActiveTab("tickets");
                void loadTickets();
            },
        });
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-9 gap-2"
                onClick={() => setIsOpen(true)}
            >
                <LifeBuoy size={16} />
                <span className="hidden sm:inline">Bantuan</span>
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="flex w-full max-w-2xl flex-col border border-gray-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">
                                    Bantuan
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Buat ticket baru atau pantau status ticket yang sudah dikirim.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={close}
                                className="p-1.5 text-gray-500 hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="border-b border-gray-200 px-4 pt-3">
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("create")}
                                    className={cn(
                                        "border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                                        activeTab === "create"
                                            ? "border-primary text-primary"
                                            : "border-transparent text-gray-500 hover:text-gray-800"
                                    )}
                                >
                                    Buat Ticket
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("tickets")}
                                    className={cn(
                                        "border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                                        activeTab === "tickets"
                                            ? "border-primary text-primary"
                                            : "border-transparent text-gray-500 hover:text-gray-800"
                                    )}
                                >
                                    Ticket Saya
                                </button>
                            </div>
                        </div>

                        <div className="h-[clamp(460px,70vh,640px)] overflow-hidden">
                            {activeTab === "create" ? (
                                <form onSubmit={submit} className="flex h-full flex-col">
                                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
                                                className="min-h-32 resize-y text-sm"
                                                placeholder="Tulis kronologi, data yang terkait, atau hasil yang kamu harapkan..."
                                                autoFocus
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
                                    </div>

                                    <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="lg"
                                            onClick={close}
                                            disabled={processing}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="lg"
                                            disabled={processing}
                                        >
                                            <Send size={16} />
                                            Kirim
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="h-full overflow-y-auto p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <p className="text-xs text-gray-500">
                                            Menampilkan 20 ticket terbaru kamu.
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void loadTickets()}
                                            disabled={isLoadingTickets}
                                        >
                                            <RefreshCw size={14} />
                                            Refresh
                                        </Button>
                                    </div>

                                    {ticketLoadError && (
                                        <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                            {ticketLoadError}
                                        </p>
                                    )}

                                    {isLoadingTickets ? (
                                        <p className="py-8 text-center text-sm text-gray-400">
                                            Memuat ticket...
                                        </p>
                                    ) : tickets.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-gray-400">
                                            Belum ada ticket.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {tickets.map((ticket) => (
                                                <div
                                                    key={ticket.id}
                                                    className="border border-gray-200 bg-white p-3"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                                                            #{ticket.id}
                                                        </span>
                                                        <span className="border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                                                            {ticketCategoryLabels[ticket.category] ?? ticket.category}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "border px-2 py-1 text-xs font-medium",
                                                                ticketStatusStyles[ticket.status] ?? ticketStatusStyles.open
                                                            )}
                                                        >
                                                            {ticketStatusLabels[ticket.status] ?? ticket.status}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {ticket.created_at ?? "-"}
                                                        </span>
                                                    </div>

                                                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-gray-800">
                                                        {ticket.message}
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                    {ticket.image_url && (
                                                        <a
                                                            href={ticket.image_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                                        >
                                                            Lampiran
                                                        </a>
                                                    )}
                                                    </div>

                                                    {ticket.developer_response ? (
                                                        <div className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2">
                                                            <p className="text-xs font-medium text-emerald-800">
                                                                Tanggapan dev
                                                                {ticket.responded_at ? ` - ${ticket.responded_at}` : ""}
                                                            </p>
                                                            <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                                                                {ticket.developer_response}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="mt-3 text-xs text-gray-400">
                                                            Belum ada tanggapan dev.
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ============================================================================
// Contextual Sidebar Component
// ============================================================================

function ContextualSidebar({
    activeCategoryKey,
    onItemClick,
}: {
    activeCategoryKey: string;
    onItemClick?: () => void;
}) {
    const { auth, company } = usePage<PageProps>().props;
    const { can, isOwner } = usePermissions();
    const enabledMenus = company?.enabled_menus ?? null;
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

    const sidebarItems = contextualSidebarItems[activeCategoryKey] ?? [];

    const visibleItems = sidebarItems.filter((item) => {
        if (item.ownerOnly && !auth.user.is_owner) return false;
        if (item.permission && !isOwner && !can(item.permission)) return false;
        if (!isMenuEnabled(menuId(activeCategoryKey, item.key), enabledMenus)) return false;
        return true;
    });

    if (visibleItems.length === 0) return null;

    return (
        <aside className="w-56 border-r border-gray-200 bg-gray-50/50 shrink-0">
            <div className="p-4">
                <ul className="space-y-1">
                    {visibleItems.map((item) => {
                        const isActive = isSidebarItemActive(item.href, pathname);
                        const Icon = item.icon;

                        if (item.disabled) {
                            return (
                                <li key={item.key}>
                                    <span
                                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md"
                                        title="Segera hadir"
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </span>
                                </li>
                            );
                        }

                        return (
                            <li key={item.key}>
                                <Link
                                    href={item.href}
                                    onClick={onItemClick}
                                    className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                >
                                    <Icon size={18} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </aside>
    );
}

// ============================================================================
// Mobile Navigation Drawer
// ============================================================================

function MobileNavDrawer({
    isOpen,
    onClose,
    activeCategoryKey,
}: {
    isOpen: boolean;
    onClose: () => void;
    activeCategoryKey: string;
}) {
    const { auth, company } = usePage<PageProps>().props;
    const { can, isOwner } = usePermissions();
    const enabledMenus = company?.enabled_menus ?? null;
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

    const visibleCategories = topNavCategories.filter((cat) => {
        if (cat.ownerOnly && !auth.user.is_owner) return false;
        if (cat.permission && !isOwner && !can(cat.permission)) return false;
        if (!categoryHasVisibleItems(cat.key, enabledMenus, can, isOwner, !!auth.user.is_owner)) return false;
        return true;
    });

    const getVisibleSidebarItems = (categoryKey: string) =>
        (contextualSidebarItems[categoryKey] ?? []).filter((item) => {
            if (item.ownerOnly && !auth.user.is_owner) return false;
            if (item.permission && !isOwner && !can(item.permission)) return false;
            if (!isMenuEnabled(menuId(categoryKey, item.key), enabledMenus)) return false;
            return true;
        });

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl md:hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                    <Link href="/" onClick={onClose}>
                        <img src={logo} alt="Emwal" className="h-8" />
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Categories */}
                    <div className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Menu Utama
                        </p>
                        <div className="space-y-1">
                            {visibleCategories.map((category) => {
                                const CategoryIcon = category.icon;
                                const categorySidebarItems = getVisibleSidebarItems(category.key);
                                const hasSidebarItems = categorySidebarItems.length > 0;
                                const isCategoryActive = activeCategoryKey === category.key;

                                if (!hasSidebarItems) {
                                    return (
                                        <Link
                                            key={category.key}
                                            href={category.href}
                                            onClick={onClose}
                                            className={cn(
                                                "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                                isCategoryActive
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-gray-600 hover:bg-gray-100"
                                            )}
                                        >
                                            <CategoryIcon size={18} />
                                            {category.label}
                                        </Link>
                                    );
                                }

                                return (
                                    <DropdownMenu key={category.key}>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className={cn(
                                                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium rounded-md transition-colors",
                                                    isCategoryActive
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-gray-600 hover:bg-gray-100"
                                                )}
                                            >
                                                <CategoryIcon size={18} className="shrink-0" />
                                                <span className="min-w-0 flex-1 truncate">
                                                    {category.label}
                                                </span>
                                                <ChevronDown size={14} className="shrink-0" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="start"
                                            side="bottom"
                                            className="z-[60] w-[var(--radix-dropdown-menu-trigger-width)]"
                                        >
                                            {categorySidebarItems.map((item) => {
                                                const isActive = isSidebarItemActive(item.href, pathname);
                                                const Icon = item.icon;

                                                if (item.disabled) {
                                                    return (
                                                        <DropdownMenuItem
                                                            key={item.key}
                                                            disabled
                                                            className="gap-2.5 py-2"
                                                        >
                                                            <Icon size={16} className="text-gray-400" />
                                                            {item.label}
                                                        </DropdownMenuItem>
                                                    );
                                                }

                                                return (
                                                    <DropdownMenuItem key={item.key} asChild>
                                                        <Link
                                                            href={item.href}
                                                            onClick={onClose}
                                                            className={cn(
                                                                "flex items-center gap-2.5 py-2",
                                                                isActive ? "text-primary" : "text-gray-700"
                                                            )}
                                                        >
                                                            <Icon
                                                                size={16}
                                                                className={
                                                                    isActive ? "text-primary" : "text-gray-500"
                                                                }
                                                            />
                                                            <span className="min-w-0 truncate">
                                                                {item.label}
                                                            </span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================================
// Header Component
// ============================================================================

function Header({
    activeCategoryKey,
    onMobileMenuToggle,
    isMobileMenuOpen,
}: {
    activeCategoryKey: string;
    onMobileMenuToggle: () => void;
    isMobileMenuOpen: boolean;
}) {
    const { auth, company } = usePage<PageProps>().props;
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        router.post("/logout");
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex min-w-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-3 sm:gap-3 sm:px-4 md:px-6">
            {/* Mobile menu button */}
            <button
                onClick={onMobileMenuToggle}
                className="shrink-0 p-2 text-gray-500 hover:bg-gray-100 rounded-md md:hidden"
            >
                <Menu size={20} />
            </button>

            {/* Logo */}
            <Link href="/" className="me-auto min-w-0 shrink md:me-3">
                <img src={logo} alt="Emwal" className="h-8 max-w-[132px] object-contain sm:max-w-none" />
            </Link>

            {/* Top Navigation (Desktop) */}
            <TopNavigation
                activeCategoryKey={activeCategoryKey}
                onMobileMenuToggle={onMobileMenuToggle}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            <div className="hidden flex-1 md:block" />

            {/* Quick Action Button */}
            <QuickActionButton />

            <FeedbackButton />

            {/* Tenant Selector */}
            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1 rounded-md px-1 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors sm:gap-2 sm:px-2"
                >
                    <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                            {auth.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline truncate max-w-[140px]">{auth.user.name}</span>
                    <ChevronDown size={14} className="hidden sm:block" />
                </button>

                {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-3 py-2 border-b border-gray-200">
                            <div className="text-sm font-medium text-gray-800 truncate">{auth.user.name}</div>
                            {company && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                                    <Building2 size={12} />
                                    <span>{company.name}</span>
                                </div>
                            )}
                        </div>
                        <button
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            onClick={handleLogout}
                        >
                            <LogOut size={16} />
                            Keluar
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}

// ============================================================================
// Main Layout Component
// ============================================================================

function FlashToastHandler() {
    useFlashToast();
    return null;
}

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
    const activeCategoryKey = getActiveCategoryKey(pathname);

    return (
        <div className="min-h-screen bg-gray-50">
            <FlashToastHandler />
            <Toaster position="top-right" richColors closeButton />
            {/* Header with Top Navigation */}
            <Header
                activeCategoryKey={activeCategoryKey}
                onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            {/* Mobile Navigation Drawer */}
            <MobileNavDrawer
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                activeCategoryKey={activeCategoryKey}
            />

            {/* Main Content Area with Contextual Sidebar */}
            <div className="flex min-w-0">
                {/* Contextual Sidebar (Desktop) */}
                <div className="hidden md:block">
                    <div className="sticky top-[61px] h-[calc(100vh-61px)]">
                        <ContextualSidebar activeCategoryKey={activeCategoryKey} />
                    </div>
                </div>

                {/* Main Content */}
                <main className="min-w-0 flex-1 px-4 md:px-8 py-6 min-h-[calc(100vh-61px)]">
                    {children}
                </main>
            </div>
        </div>
    );
}
