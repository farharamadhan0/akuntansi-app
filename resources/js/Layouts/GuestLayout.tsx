import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';

export default function GuestLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/">
                        <h1 className="text-3xl font-bold text-primary-600">
                            Akuntansi
                        </h1>
                    </Link>
                    <p className="mt-2 text-gray-600">
                        Aplikasi Pembukuan Sederhana
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
