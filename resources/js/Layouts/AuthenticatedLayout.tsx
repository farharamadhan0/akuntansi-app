import { Link, usePage, router } from "@inertiajs/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    LogOut,
    LayoutDashboard,
    Wallet,
    Tags,
    TrendingUp,
    TrendingDown,
    Users,
    UserCheck,
    CreditCard,
    BarChart2,
    List,
    Truck,
    Building2,
    ChevronDown,
} from "lucide-react";
import { type ReactNode, useState, useRef, useEffect } from "react";
import {
    SidebarProvider,
    SidebarLayout,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";

interface PageProps {
    auth: { user: { name: string } };
    company?: { name: string };
    [key: string]: unknown;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        label: "Transaksi",
        items: [
            { href: "/transaksi/uang-masuk", label: "Uang Masuk", icon: TrendingUp },
            { href: "/transaksi/uang-keluar", label: "Uang Keluar", icon: TrendingDown },
            { href: "/transaksi/piutang", label: "Piutang", icon: Users },
            { href: "/transaksi/hutang", label: "Hutang", icon: CreditCard },
        ],
    },
    {
        label: "Master Data",
        items: [
            { href: "/master/pelanggan", label: "Pelanggan", icon: UserCheck },
            { href: "/master/pemasok", label: "Pemasok", icon: Truck },
            { href: "/master/kas-bank", label: "Kas & Bank", icon: Wallet },
            { href: "/master/kategori", label: "Kategori", icon: Tags },
        ],
    },
    {
        label: "Laporan",
        items: [
            { href: "/laporan/transaksi", label: "Daftar Transaksi", icon: List },
            { href: "/laporan/piutang", label: "Daftar Piutang", icon: Users },
            { href: "/laporan/hutang", label: "Daftar Hutang", icon: CreditCard },
            { href: "/laporan/laba-rugi", label: "Laba Rugi", icon: BarChart2 },
            { href: "/laporan/arus-kas", label: "Arus Kas", icon: TrendingUp },
        ],
    },
];

function isActive(href: string) {
    const currentPath = window.location.pathname;
    if (href === "/") return currentPath === "/";
    return currentPath.startsWith(href);
}

function SidebarNav() {
    const { auth, company } = usePage<PageProps>().props;
    const { setOpen } = useSidebar();
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
        <Sidebar className="md:w-54">
            <SidebarHeader>
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary-600">Akuntansi</span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {/* Dashboard */}
                <SidebarMenu className="mb-4">
                    <SidebarMenuItem>
                        <Link href="/" className="block" onClick={() => setOpen(false)}>
                            <SidebarMenuButton isActive={isActive("/")}>
                                <LayoutDashboard size={18} />
                                Dashboard
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Grouped items */}
                {navGroups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel className="text-xs">{group.label}</SidebarGroupLabel>
                        <SidebarMenu>
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href} className="block" onClick={() => setOpen(false)}>
                                        <SidebarMenuButton isActive={isActive(item.href)}>
                                            <item.icon size={18} />
                                            {item.label}
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                {company && (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/50">
                        <Building2 size={14} />
                        <span className="truncate">{company.name}</span>
                    </div>
                )}

                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
                    >
                        <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs">
                                {auth.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-left">{auth.user.name}</span>
                        <ChevronDown size={14} />
                    </button>

                    {showUserMenu && (
                        <div className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-lg shadow-lg border border-sidebar-border py-1 z-50">
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
            </SidebarFooter>
        </Sidebar>
    );
}

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider>
            <SidebarLayout>
                <SidebarNav />

                {/* Main content area */}
                <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                    {/* Mobile top bar */}
                    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background px-4 py-3 md:hidden">
                        <SidebarTrigger />
                        <span className="text-sm font-bold text-primary-600">Akuntansi</span>
                    </header>

                    <main className="flex-1 px-4 md:px-8 py-8 w-full">
                        {children}
                    </main>
                </div>
            </SidebarLayout>
        </SidebarProvider>
    );
}
