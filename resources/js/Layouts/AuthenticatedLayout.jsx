import { Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { LogOut, User, Building2, ChevronDown, LayoutDashboard, Wallet, Tags, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/master/kas-bank', label: 'Kas & Bank', icon: Wallet },
    { href: '/master/kategori', label: 'Kategori', icon: Tags },
];

export default function AuthenticatedLayout({ children }) {
    const { auth, company, url } = usePage().props;
    const [showMenu, setShowMenu] = useState(false);
    const [showMobileNav, setShowMobileNav] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = () => {
        router.post('/logout');
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isActive = (href) => {
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
                            
                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                            isActive(item.href)
                                                ? 'bg-primary-50 text-primary-700'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <item.icon size={18} />
                                        {item.label}
                                    </Link>
                                ))}
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
                                    <Avatar
                                        name={auth.user.name}
                                        className="w-8 h-8 text-sm"
                                    />
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
                            {navItems.map((item) => (
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
