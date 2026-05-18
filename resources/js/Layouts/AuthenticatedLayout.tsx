import { Link, usePage, router } from "@inertiajs/react";
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
} from "lucide-react";
import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PageProps {
    auth: { user: { name: string; is_owner?: boolean } };
    company?: { name: string };
    [key: string]: unknown;
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
    const { auth } = usePage<PageProps>().props;
    const { can, isOwner } = usePermissions();

    const visibleCategories = topNavCategories.filter((cat) => {
        if (cat.ownerOnly && !auth.user.is_owner) return false;
        if (cat.permission && !isOwner && !can(cat.permission)) return false;
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

    const visibleActions = quickActions.filter((action) => {
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
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
                <Plus size={16} />
                <span className="hidden sm:inline">Tambah</span>
            </button>

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
    const { auth } = usePage<PageProps>().props;
    const { can, isOwner } = usePermissions();
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

    const sidebarItems = contextualSidebarItems[activeCategoryKey] ?? [];

    const visibleItems = sidebarItems.filter((item) => {
        if (item.ownerOnly && !auth.user.is_owner) return false;
        if (item.permission && !isOwner && !can(item.permission)) return false;
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
    const { auth } = usePage<PageProps>().props;
    const { can, isOwner } = usePermissions();
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

    const visibleCategories = topNavCategories.filter((cat) => {
        if (cat.ownerOnly && !auth.user.is_owner) return false;
        if (cat.permission && !isOwner && !can(cat.permission)) return false;
        return true;
    });

    const sidebarItems = contextualSidebarItems[activeCategoryKey] ?? [];
    const visibleSidebarItems = sidebarItems.filter((item) => {
        if (item.ownerOnly && !auth.user.is_owner) return false;
        if (item.permission && !isOwner && !can(item.permission)) return false;
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
                    <Link href="/" className="text-lg font-bold text-primary" onClick={onClose}>
                        Emwal
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Categories */}
                <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Menu Utama
                    </p>
                    <div className="space-y-1">
                        {visibleCategories.map((category) => (
                            <Link
                                key={category.key}
                                href={category.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    activeCategoryKey === category.key
                                        ? "bg-primary/10 text-primary"
                                        : "text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <category.icon size={18} />
                                {category.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Contextual Items */}
                {visibleSidebarItems.length > 0 && (
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {topNavCategories.find((c) => c.key === activeCategoryKey)?.label ?? "Menu"}
                        </p>
                        <div className="space-y-1">
                            {visibleSidebarItems.map((item) => {
                                const isActive = isSidebarItemActive(item.href, pathname);
                                const Icon = item.icon;

                                if (item.disabled) {
                                    return (
                                        <span
                                            key={item.key}
                                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 cursor-not-allowed rounded-md"
                                        >
                                            <Icon size={18} />
                                            {item.label}
                                        </span>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        onClick={onClose}
                                        className={cn(
                                            "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-gray-600 hover:bg-gray-100"
                                        )}
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 md:px-6 py-3">
            {/* Mobile menu button */}
            <button
                onClick={onMobileMenuToggle}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-md md:hidden"
            >
                <Menu size={20} />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 me-4">
                <span className="text-lg font-bold text-primary">Emwal</span>
            </Link>

            {/* Top Navigation (Desktop) */}
            <TopNavigation
                activeCategoryKey={activeCategoryKey}
                onMobileMenuToggle={onMobileMenuToggle}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            <div className="flex-1" />

            {/* Quick Action Button */}
            <QuickActionButton />

            {/* Tenant Selector */}
            {company && (
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md bg-gray-50">
                    <Building2 size={14} className="text-gray-500" />
                    <span className="truncate max-w-[200px] font-medium">{company.name}</span>
                </div>
            )}

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                    <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                            {auth.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline truncate max-w-[140px]">{auth.user.name}</span>
                    <ChevronDown size={14} />
                </button>

                {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-3 py-2 border-b border-gray-200 sm:hidden">
                            <div className="text-sm font-medium text-gray-800 truncate">{auth.user.name}</div>
                            {company && (
                                <div className="text-xs text-gray-500 truncate">{company.name}</div>
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
            <div className="flex">
                {/* Contextual Sidebar (Desktop) */}
                <div className="hidden md:block">
                    <div className="sticky top-[61px] h-[calc(100vh-61px)]">
                        <ContextualSidebar activeCategoryKey={activeCategoryKey} />
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 px-4 md:px-8 py-6 min-h-[calc(100vh-61px)]">
                    {children}
                </main>
            </div>
        </div>
    );
}
