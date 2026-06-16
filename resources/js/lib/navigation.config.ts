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
    SlidersHorizontal,
    Building2,
    Activity,
    Lightbulb,
    FileText,
    Plus,
    CookingPot,
    ChartNoAxesColumnIncreasing,
    ClipboardList,
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
        label: "Master",
        href: "/master/mitra",
        icon: Package,
        matchPaths: ["/master"],
    },
    {
        key: "fnb",
        label: "F&B",
        href: "/fnb/resep",
        icon: CookingPot,
        matchPaths: ["/fnb"],
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
    fnb: [
        { key: "resep", label: "Resep Menu", href: "/fnb/resep", icon: CookingPot, permission: "recipes.view" },
        { key: "produksi", label: "Produksi / Prep", href: "/fnb/produksi", icon: ClipboardList, permission: "productions.view" },
        { key: "analitik", label: "Analitik F&B", href: "/fnb/analitik", icon: ChartNoAxesColumnIncreasing, permission: "recipes.view" },
    ],
    laporan: [
        { key: "transaksi", label: "Daftar Transaksi", href: "/laporan/transaksi", icon: List, permission: "reports.transactions" },
        { key: "buku-besar", label: "Buku Besar", href: "/laporan/buku-besar", icon: BookOpen, permission: "reports.general_ledger" },
        { key: "laba-rugi", label: "Laba Rugi", href: "/laporan/laba-rugi", icon: BarChart2, permission: "reports.income_statement" },
        { key: "neraca", label: "Neraca", href: "/laporan/neraca", icon: Scale, permission: "reports.balance_sheet" },
        { key: "arus-kas", label: "Arus Kas", href: "/laporan/arus-kas", icon: TrendingUp, permission: "reports.cash_flow" },
    ],
    pengaturan: [
        { key: "pengguna", label: "Pengguna", href: "/pengaturan/pengguna", icon: UserCog, ownerOnly: true },
        { key: "role", label: "Role", href: "/pengaturan/role", icon: ShieldCheck, ownerOnly: true },
        { key: "fitur", label: "Fitur Aplikasi", href: "/pengaturan/fitur", icon: SlidersHorizontal, ownerOnly: true },
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

// ============================================================================
// Konfigurasi Tampilan Menu (per perusahaan)
// ============================================================================

/**
 * Identitas unik sebuah item menu = "<categoryKey>.<itemKey>".
 * Menghindari tabrakan key antar kategori (mis. "transaksi" di laporan).
 */
export function menuId(categoryKey: string, itemKey: string): string {
    return `${categoryKey}.${itemKey}`;
}

/**
 * Menu default yang SELALU tampil dan tidak dapat dimatikan owner.
 */
export const DEFAULT_MENU_KEYS: string[] = [
    "transaksi.uang-masuk",
    "transaksi.uang-keluar",
    "master-data.mitra",
    "master-data.kas-bank",
    "master-data.kategori",
    "laporan.transaksi",
    "laporan.laba-rugi",
    "pengaturan.pengguna",
    "pengaturan.role",
    "pengaturan.fitur",
];

export function isDefaultMenu(id: string): boolean {
    return DEFAULT_MENU_KEYS.includes(id);
}

/**
 * Tentukan apakah sebuah menu tampil berdasarkan preferensi perusahaan.
 * - Menu default selalu tampil.
 * - enabledMenus null/undefined (belum diatur) => hanya menu default.
 * - enabledMenus array => default + key yang dipilih owner.
 */
export function isMenuEnabled(
    id: string,
    enabledMenus: string[] | null | undefined,
): boolean {
    if (isDefaultMenu(id)) return true;
    if (enabledMenus == null) return false;
    return enabledMenus.includes(id);
}

/**
 * Definisi grup fungsional untuk halaman "Tampilan Menu".
 * Mengelompokkan menu yang berkaitan secara fungsi, lintas kategori nav.
 * `category`/`item` merujuk ke entry pada contextualSidebarItems.
 */
interface MenuSettingGroupDef {
    key: string;
    label: string;
    members: { category: string; item: string }[];
}

export const menuSettingGroups: MenuSettingGroupDef[] = [
    {
        key: "kas-harian",
        label: "Kas & Transaksi Harian",
        members: [
            { category: "transaksi", item: "uang-masuk" },
            { category: "transaksi", item: "uang-keluar" },
            { category: "master-data", item: "kas-bank" },
            { category: "master-data", item: "kategori" },
        ],
    },
    {
        key: "produk-jual-beli",
        label: "Produk, Penjualan & Pembelian",
        members: [
            { category: "master-data", item: "produk" },
            { category: "transaksi", item: "penjualan" },
            { category: "transaksi", item: "pembelian" },
            { category: "transaksi", item: "stok-penyesuaian" },
            { category: "master-data", item: "mitra" },
        ],
    },
    {
        key: "fnb",
        label: "F&B",
        members: [
            { category: "fnb", item: "resep" },
            { category: "fnb", item: "produksi" },
            { category: "fnb", item: "analitik" },
            { category: "master-data", item: "produk" },
            { category: "transaksi", item: "pembelian" },
            { category: "transaksi", item: "penjualan" },
            { category: "transaksi", item: "stok-penyesuaian" },
        ],
    },
    {
        key: "piutang-hutang",
        label: "Piutang & Hutang",
        members: [
            { category: "transaksi", item: "piutang" },
            { category: "transaksi", item: "hutang" },
        ],
    },
    {
        key: "akuntansi",
        label: "Akuntansi",
        members: [
            { category: "transaksi", item: "jurnal" },
            { category: "laporan", item: "buku-besar" },
        ],
    },
    {
        key: "laporan-keuangan",
        label: "Laporan Keuangan",
        members: [
            { category: "laporan", item: "transaksi" },
            { category: "laporan", item: "laba-rugi" },
            { category: "laporan", item: "neraca" },
            { category: "laporan", item: "arus-kas" },
        ],
    },
    {
        key: "pengaturan",
        label: "Pengaturan",
        members: [
            { category: "pengaturan", item: "pengguna" },
            { category: "pengaturan", item: "role" },
            { category: "pengaturan", item: "menu" },
        ],
    },
];

/**
 * Daftar item menu yang dapat dikonfigurasi, dikelompokkan secara fungsional
 * (berdasarkan menuSettingGroups), untuk dirender di halaman pengaturan.
 */
export function getConfigurableMenuGroups(): {
    key: string;
    label: string;
    items: { id: string; key: string; label: string; isDefault: boolean }[];
}[] {
    const findItem = (category: string, itemKey: string): NavItem | undefined =>
        (contextualSidebarItems[category] ?? []).find((i) => i.key === itemKey);

    return menuSettingGroups
        .map((group) => ({
            key: group.key,
            label: group.label,
            items: group.members
                .map((m) => {
                    const item = findItem(m.category, m.item);
                    if (!item) return null;
                    const id = menuId(m.category, m.item);
                    return {
                        id,
                        key: item.key,
                        label: item.label,
                        isDefault: isDefaultMenu(id),
                    };
                })
                .filter(
                    (x): x is { id: string; key: string; label: string; isDefault: boolean } =>
                        x !== null,
                ),
        }))
        .filter((group) => group.items.length > 0);
}

/**
 * Seluruh id menu yang valid (whitelist untuk validasi backend bila perlu).
 */
export function allMenuIds(): string[] {
    return getConfigurableMenuGroups().flatMap((g) => g.items.map((i) => i.id));
}
