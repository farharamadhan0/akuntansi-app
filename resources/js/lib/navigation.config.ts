import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Users,
    CreditCard,
    ShoppingCart,
    ScanLine,
    Boxes,
    BookOpen,
    UserCheck,
    Truck,
    Package,
    Wallet,
    Tags,
    List,
    BarChart2,
    Scale,
    UserCog,
    ShieldCheck,
    Building2,
    Activity,
    Lightbulb,
    FileText,
    Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
    key: string;
    label: string;
    href: string;
    icon: LucideIcon;
    permission?: string;
    ownerOnly?: boolean;
    disabled?: boolean;
}

export interface TopNavCategory {
    key: string;
    label: string;
    href: string;
    icon: LucideIcon;
    /** Route prefixes that belong to this category */
    matchPaths: string[];
    permission?: string;
    ownerOnly?: boolean;
}

export interface QuickAction {
    key: string;
    label: string;
    href: string;
    icon: LucideIcon;
    permission?: string;
}

// ============================================================================
// Top Navigation Categories
// ============================================================================

export const topNavCategories: TopNavCategory[] = [
    {
        key: "dashboard",
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        matchPaths: ["/"],
        permission: "dashboard.view",
    },
    {
        key: "transaksi",
        label: "Transaksi",
        href: "/transaksi/uang-masuk",
        icon: TrendingUp,
        matchPaths: ["/transaksi", "/jurnal"],
    },
    {
        key: "master-data",
        label: "Master Data",
        href: "/master/mitra",
        icon: Package,
        matchPaths: ["/master"],
    },
    {
        key: "laporan",
        label: "Laporan",
        href: "/laporan/transaksi",
        icon: BarChart2,
        matchPaths: ["/laporan"],
    },
    {
        key: "pengaturan",
        label: "Pengaturan",
        href: "/pengaturan/pengguna",
        icon: UserCog,
        matchPaths: ["/pengaturan"],
        ownerOnly: true,
    },
];

// ============================================================================
// Contextual Sidebar Items per Category
// ============================================================================

export const contextualSidebarItems: Record<string, NavItem[]> = {
    // Dashboard tidak memiliki sidebar (empty array)
    dashboard: [],
    transaksi: [
        { key: "uang-masuk", label: "Uang Masuk", href: "/transaksi/uang-masuk", icon: TrendingUp, permission: "income.view" },
        { key: "uang-keluar", label: "Uang Keluar", href: "/transaksi/uang-keluar", icon: TrendingDown, permission: "expense.view" },
        { key: "piutang", label: "Piutang", href: "/transaksi/piutang", icon: Users, permission: "receivables.view" },
        { key: "hutang", label: "Hutang", href: "/transaksi/hutang", icon: CreditCard, permission: "payables.view" },
        { key: "pembelian", label: "Pembelian", href: "/transaksi/pembelian", icon: ShoppingCart, permission: "purchases.view" },
        { key: "penjualan", label: "Penjualan", href: "/transaksi/penjualan", icon: ScanLine, permission: "sales.view" },
        { key: "stok-penyesuaian", label: "Penyesuaian Stok", href: "/transaksi/stok-penyesuaian", icon: Boxes, permission: "inventory_adjustments.view" },
        { key: "jurnal", label: "Jurnal Umum", href: "/jurnal", icon: BookOpen, permission: "journals.view" },
    ],
    "master-data": [
        { key: "mitra", label: "Mitra", href: "/master/mitra", icon: UserCheck, permission: "partners.view" },
        { key: "produk", label: "Produk", href: "/master/produk", icon: Package, permission: "products.view" },
        { key: "kas-bank", label: "Kas & Bank", href: "/master/kas-bank", icon: Wallet, permission: "cash_bank.view" },
        { key: "kategori", label: "Kategori Transaksi", href: "/master/kategori", icon: Tags, permission: "accounts.view" },
    ],
    laporan: [
        { key: "transaksi", label: "Daftar Transaksi", href: "/laporan/transaksi", icon: List, permission: "reports.transactions" },
        { key: "buku-besar", label: "Buku Besar", href: "/laporan/buku-besar", icon: BookOpen, permission: "reports.general_ledger" },
        { key: "laba-rugi", label: "Laba Rugi", href: "/laporan/laba-rugi", icon: BarChart2, permission: "reports.income_statement" },
        { key: "neraca", label: "Neraca", href: "/laporan/neraca", icon: Scale, permission: "reports.balance_sheet" },
        { key: "arus-kas", label: "Arus Kas", href: "/laporan/arus-kas", icon: TrendingUp, permission: "reports.cash_flow" },
        { key: "piutang", label: "Laporan Piutang", href: "/laporan/piutang", icon: Users, permission: "reports.receivables" },
        { key: "hutang", label: "Laporan Hutang", href: "/laporan/hutang", icon: CreditCard, permission: "reports.payables" },
    ],
    pengaturan: [
        { key: "pengguna", label: "Pengguna", href: "/pengaturan/pengguna", icon: UserCog, ownerOnly: true },
        { key: "role", label: "Role", href: "/pengaturan/role", icon: ShieldCheck, ownerOnly: true },
    ],
};

// ============================================================================
// Quick Actions
// ============================================================================

export const quickActions: QuickAction[] = [
    { key: "uang-masuk", label: "Uang Masuk", href: "/transaksi/uang-masuk/catat", icon: TrendingUp, permission: "income.create" },
    { key: "uang-keluar", label: "Uang Keluar", href: "/transaksi/uang-keluar/catat", icon: TrendingDown, permission: "expense.create" },
    { key: "penjualan", label: "Penjualan", href: "/transaksi/penjualan/buat", icon: ScanLine, permission: "sales.create" },
    { key: "pembelian", label: "Pembelian", href: "/transaksi/pembelian/buat", icon: ShoppingCart, permission: "purchases.create" },
    { key: "jurnal", label: "Jurnal Umum", href: "/jurnal/buat", icon: BookOpen, permission: "journals.create" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine the active top navigation category based on current pathname
 */
export function getActiveCategoryKey(pathname: string): string {
    // Exact match for dashboard
    if (pathname === "/") return "dashboard";

    // Find matching category by path prefix
    for (const category of topNavCategories) {
        if (category.key === "dashboard") continue;
        for (const matchPath of category.matchPaths) {
            if (pathname.startsWith(matchPath)) {
                return category.key;
            }
        }
    }

    return "dashboard";
}

/**
 * Check if a specific sidebar item is active based on pathname
 */
export function isSidebarItemActive(itemHref: string, pathname: string): boolean {
    if (itemHref === "/") return pathname === "/";
    return pathname.startsWith(itemHref);
}

/**
 * Get the first available href for a category (used when clicking top nav)
 */
export function getCategoryDefaultHref(categoryKey: string): string {
    const category = topNavCategories.find((c) => c.key === categoryKey);
    return category?.href ?? "/";
}
