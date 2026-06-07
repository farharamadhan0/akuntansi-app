import { Link, usePage, router } from "@inertiajs/react";
import { Toaster } from "sonner";
import { useFlashToast } from "@/hooks/useFlashToast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, AlertOctagon, Building2, ChevronDown, LogOut, LayoutDashboard, MessageSquare } from "lucide-react";
import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PageProps {
    auth: { user: { name: string } };
    [key: string]: unknown;
}

const devNavItems = [
    { key: "dashboard", label: "Dashboard", href: "/dev/dashboard", icon: LayoutDashboard },
    { key: "companies", label: "Companies", href: "/dev/companies", icon: Building2 },
    { key: "feedback", label: "Feedback", href: "/dev/feedback", icon: MessageSquare },
    { key: "error-logs", label: "Error Logs", href: "/dev/error-logs", icon: AlertOctagon },
];

function FlashToastHandler() {
    useFlashToast();
    return null;
}

function DevHeader() {
    const { auth } = usePage<PageProps>().props;
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

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
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-violet-200 bg-violet-950 px-4 md:px-6 py-3">
            {/* Logo / Brand */}
            <div className="flex items-center gap-2 me-4 shrink-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500">
                    <Activity size={15} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white">Dev Console</span>
            </div>

            {/* Nav Items */}
            <nav className="flex items-center gap-1">
                {devNavItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-violet-700 text-white"
                                    : "text-violet-300 hover:bg-violet-800 hover:text-white"
                            )}
                        >
                            <item.icon size={15} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="flex-1" />

            {/* Back to App */}
            <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-white transition-colors"
            >
                ← Kembali ke Aplikasi
            </Link>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-800 transition-colors"
                >
                    <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-violet-600 text-white">
                            {auth.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline truncate max-w-[140px]">
                        {auth.user.name}
                    </span>
                    <ChevronDown size={14} />
                </button>

                {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
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

export default function DevLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50">
            <FlashToastHandler />
            <Toaster position="top-right" richColors closeButton />
            <DevHeader />
            <main className="px-4 md:px-8 py-6">
                {children}
            </main>
        </div>
    );
}
