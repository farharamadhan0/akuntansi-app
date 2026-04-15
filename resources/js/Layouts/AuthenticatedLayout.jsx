import { Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { LogOut, User, Building2, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function AuthenticatedLayout({ children }) {
    const { auth, company } = usePage().props;
    const [showMenu, setShowMenu] = useState(false);
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

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center gap-2">
                                <span className="text-xl font-bold text-primary-600">
                                    Akuntansi
                                </span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-4">
                            {company && (
                                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                                    <Building2 size={16} />
                                    <span>{company.name}</span>
                                </div>
                            )}

                            <div className="relative" ref={menuRef}>
                                <Button
                                    variant="ghost"
                                    className="flex items-center gap-2"
                                    onPress={() => setShowMenu(!showMenu)}
                                >
                                    <Avatar
                                        size="sm"
                                        name={auth.user.name}
                                        className="bg-primary-100 text-primary-600 w-8 h-8 text-sm"
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
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
