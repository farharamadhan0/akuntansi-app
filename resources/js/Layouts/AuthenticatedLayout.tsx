import { Link, usePage, router } from "@inertiajs/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/lib/permissions";
import {
    LogOut,
    LayoutDashboard,
    Wallet,
    Package,
    ShoppingCart,
    ScanLine,
    Boxes,
    Tags,
    TrendingUp,
    TrendingDown,
    Users,
    UserCheck,
    CreditCard,
    BarChart2,
    Scale,
    List,
    Truck,
    Building2,
    BookOpen,
    ChevronDown,
    UserCog,
    ShieldCheck,
} from "lucide-react";
import { type ReactNode, useState, useRef, useEffect } from "react";
import {
    SidebarProvider,
    SidebarLayout,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";

interface PageProps {
    auth: { user: { name: string; is_owner?: boolean } };
    company?: { name: string };
    [key: string]: unknown;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    permission?: string;
}

interface NavGroup {
    label: string;
    items: NavItem[];
    ownerOnly?: boolean;
}

const navGroups: NavGroup[] = [
    {
        label: "Transaksi",
        items: [
            { href: "/transaksi/uang-masuk", label: "Uang Masuk", icon: TrendingUp, permission: "income.view" },
            { href: "/transaksi/uang-keluar", label: "Uang Keluar", icon: TrendingDown, permission: "expense.view" },
            { href: "/transaksi/piutang", label: "Piutang", icon: Users, permission: "receivables.view" },
            { href: "/transaksi/hutang", label: "Hutang", icon: CreditCard, permission: "payables.view" },
            { href: "/transaksi/pembelian", label: "Pembelian", icon: ShoppingCart, permission: "purchases.view" },
            { href: "/transaksi/penjualan", label: "Penjualan", icon: ScanLine, permission: "sales.view" },
            { href: "/transaksi/stok-penyesuaian", label: "Penyesuaian Stok", icon: Boxes, permission: "inventory_adjustments.view" },
            { href: "/jurnal", label: "Jurnal Umum", icon: BookOpen, permission: "journals.view" },
        ],
    },
    {
        label: "Master Data",
        items: [
            { href: "/master/pelanggan", label: "Pelanggan", icon: UserCheck, permission: "customers.view" },
            { href: "/master/pemasok", label: "Pemasok", icon: Truck, permission: "suppliers.view" },
            { href: "/master/produk", label: "Produk", icon: Package, permission: "products.view" },
            { href: "/master/kas-bank", label: "Kas & Bank", icon: Wallet, permission: "cash_bank.view" },
            { href: "/master/kategori", label: "Daftar Akun", icon: Tags, permission: "accounts.view" },
        ],
    },
    {
        label: "Pengaturan",
        ownerOnly: true,
        items: [
            { href: "/pengaturan/pengguna", label: "Pengguna", icon: UserCog },
            { href: "/pengaturan/role", label: "Role", icon: ShieldCheck },
        ],
    },
    {
        label: "Laporan",
        items: [
            { href: "/laporan/transaksi", label: "Daftar Transaksi", icon: List, permission: "reports.transactions" },
            { href: "/laporan/piutang", label: "Daftar Piutang", icon: Users, permission: "reports.receivables" },
            { href: "/laporan/hutang", label: "Daftar Hutang", icon: CreditCard, permission: "reports.payables" },
            { href: "/laporan/buku-besar", label: "Buku Besar", icon: BookOpen, permission: "reports.general_ledger" },
            { href: "/laporan/laba-rugi", label: "Laba Rugi", icon: BarChart2, permission: "reports.income_statement" },
            { href: "/laporan/neraca", label: "Neraca", icon: Scale, permission: "reports.balance_sheet" },
            { href: "/laporan/arus-kas", label: "Arus Kas", icon: TrendingUp, permission: "reports.cash_flow" },
        ],
    },
];

function isActive(href: string) {
    const currentPath = window.location.pathname;
    if (href === "/") return currentPath === "/";
    return currentPath.startsWith(href);
}

function SidebarNav() {
    const { auth } = usePage<PageProps>().props;
    const { setOpen } = useSidebar();
    const { can, isOwner } = usePermissions();

    const visibleGroups = navGroups
        .filter((g) => !g.ownerOnly || auth.user.is_owner)
        .map((g) => ({
            ...g,
            items: g.ownerOnly
                ? g.items
                : g.items.filter((i) => !i.permission || can(i.permission)),
        }))
        .filter((g) => g.items.length > 0);

    const showDashboard = isOwner || can("dashboard.view");

    return (
        <Sidebar className="md:w-54">
            <SidebarHeader>
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary-600">Emwal</span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {/* Dashboard */}
                {showDashboard && (
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
                )}

                {/* Grouped items */}
                {visibleGroups.map((group) => (
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
        </Sidebar>
    );
}

function TopBar() {
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
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background px-4 md:px-8 py-3">
            <div className="flex items-center gap-2 md:hidden">
                <SidebarTrigger />
                <span className="text-sm font-bold text-primary-600">Emwal</span>
            </div>

            <div className="flex-1" />

            {company && (
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-600 border border-border rounded-md bg-gray-50">
                    <Building2 size={14} className="text-gray-500" />
                    <span className="truncate max-w-[200px] font-medium">{company.name}</span>
                </div>
            )}

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
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-border py-1 z-50">
                        <div className="px-3 py-2 border-b border-border sm:hidden">
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

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider>
            <SidebarLayout>
                <SidebarNav />

                {/* Main content area */}
                <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                    <TopBar />

                    <main className="flex-1 px-4 md:px-8 py-8 w-full">
                        {children}
                    </main>
                </div>
            </SidebarLayout>
        </SidebarProvider>
    );
}
