import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';
import logo from '@/assets/logo.png';

export default function GuestLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="flex items-center justify-center">
                        <img src={logo} alt="Emwal" className="h-12" />
                    </Link>
                    <p className="mt-2 text-gray-600">
                        Solusi Pencatatan Keuangan
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
