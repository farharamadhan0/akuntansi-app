import { Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Building2, ChevronDown, LayoutDashboard, Wallet, Tags, TrendingUp, TrendingDown, Users, UserCheck, CreditCard, BarChart2, List, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect, ReactNode } from 'react';

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
    prefix: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        label: 'Transaksi',
        prefix: '/transaksi',
        items: [
            { href: '/transaksi/uang-masuk', label: 'Uang Masuk', icon: TrendingUp },
            { href: '/transaksi/uang-keluar', label: 'Uang Keluar', icon: TrendingDown },
            { href: '/transaksi/piutang', label: 'Piutang', icon: Users },
            { href: '/transaksi/hutang', label: 'Hutang', icon: CreditCard },
        ],
    },
    {
        label: 'Master Data',
        prefix: '/master',
        items: [
            { href: '/master/pelanggan', label: 'Pelanggan', icon: UserCheck },
            { href: '/master/kas-bank', label: 'Kas & Bank', icon: Wallet },
            { href: '/master/kategori', label: 'Kategori', icon: Tags },
        ],
    },
    {
        label: 'Laporan',
        prefix: '/laporan',
        items: [
            { href: '/laporan/transaksi', label: 'Daftar Transaksi', icon: List },
            { href: '/laporan/piutang', label: 'Daftar Piutang', icon: Users },
            { href: '/laporan/hutang', label: 'Daftar Hutang', icon: CreditCard },
            { href: '/laporan/laba-rugi', label: 'Laba Rugi', icon: BarChart2 },
            { href: '/laporan/arus-kas', label: 'Arus Kas', icon: TrendingUp },
        ],
    },
];

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const { auth, company } = usePage<PageProps>().props;
    const [showMenu, setShowMenu] = useState(false);
    const [showMobileNav, setShowMobileNav] = useState(false);
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        router.post('/logout');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setOpenGroup(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isActive = (href: string) => {
        const currentPath = window.location.pathname;
        if (href === '/') return currentPath === '/';
        return currentPath.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-8">
                            <Link href="/" className="flex items-center gap-2">
                                <span className="text-xl font-bold text-primary-600">
                                    Akuntansi
                                </span>
                            </Link>
                            
                            <div className="hidden md:flex items-center gap-1" ref={navRef}>
                                {/* Dashboard direct link */}
                                <Link
                                    href="/"
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        isActive('/')
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <LayoutDashboard size={18} />
                                    Dashboard
                                </Link>

                                {/* Grouped dropdowns */}
                                {navGroups.map((group) => {
                                    const groupActive = window.location.pathname.startsWith(group.prefix);
                                    const isOpen = openGroup === group.label;
                                    return (
                                        <div key={group.label} className="relative">
                                            <button
                                                onClick={() => setOpenGroup(isOpen ? null : group.label)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                    groupActive
                                                        ? 'bg-primary-50 text-primary-700'
                                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                }`}
                                            >
                                                {group.label}
                                                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isOpen && (
                                                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                                    {group.items.map((item) => (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            onClick={() => setOpenGroup(null)}
                                                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                                                                isActive(item.href)
                                                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                                                    : 'text-gray-700 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            <item.icon size={16} />
                                                            {item.label}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {company && (
                                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                                    <Building2 size={16} />
                                    <span>{company.name}</span>
                                </div>
                            )}

                            <button
                                className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                                onClick={() => setShowMobileNav(!showMobileNav)}
                            >
                                {showMobileNav ? <X size={24} /> : <Menu size={24} />}
                            </button>

                            <div className="relative hidden md:block" ref={menuRef}>
                                <Button
                                    variant="ghost"
                                    className="flex items-center gap-2"
                                    onClick={() => setShowMenu(!showMenu)}
                                >
                                    <Avatar className="w-8 h-8">
                                        <AvatarFallback>
                                            {auth.user.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden sm:inline">
                                        {auth.user.name}
                                    </span>
                                    <ChevronDown size={16} />
                                </Button>

                                {showMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                        <button
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                            onClick={() => setShowMenu(false)}
                                        >
                                            <User size={16} />
                                            Profil
                                        </button>
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
                        </div>
                    </div>
                </div>

                {showMobileNav && (
                    <div className="md:hidden border-t border-gray-200 bg-white">
                        <div className="px-4 py-3 space-y-1">
                            {/* Dashboard */}
                            <Link
                                href="/"
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                                    isActive('/') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                onClick={() => setShowMobileNav(false)}
                            >
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>

                            {navGroups.map((group) => (
                                <div key={group.label}>
                                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        {group.label}
                                    </p>
                                    {group.items.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                                                isActive(item.href)
                                                    ? 'bg-primary-50 text-primary-700'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                            onClick={() => setShowMobileNav(false)}
                                        >
                                            <item.icon size={18} />
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            ))}
                            <hr className="my-2" />
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                                onClick={handleLogout}
                            >
                                <LogOut size={18} />
                                Keluar
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
