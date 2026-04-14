import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Selamat Datang di Akuntansi App
                        </h1>
                        <p className="mt-1 text-gray-600">
                            Aplikasi pembukuan sederhana untuk UMKM Indonesia
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DashboardCard
                            title="Total Uang Masuk"
                            value="Rp 0"
                            subtitle="Bulan ini"
                            color="green"
                        />
                        <DashboardCard
                            title="Total Uang Keluar"
                            value="Rp 0"
                            subtitle="Bulan ini"
                            color="red"
                        />
                        <DashboardCard
                            title="Piutang"
                            value="Rp 0"
                            subtitle="Belum dibayar"
                            color="yellow"
                        />
                        <DashboardCard
                            title="Hutang"
                            value="Rp 0"
                            subtitle="Belum dibayar"
                            color="blue"
                        />
                    </div>

                    <div className="mt-8 bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Mulai Menggunakan Aplikasi
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <QuickAction
                                icon="💰"
                                title="Catat Uang Masuk"
                                description="Catat pendapatan atau penjualan"
                            />
                            <QuickAction
                                icon="💸"
                                title="Catat Uang Keluar"
                                description="Catat pengeluaran atau pembelian"
                            />
                            <QuickAction
                                icon="📋"
                                title="Buat Piutang"
                                description="Catat tagihan ke pelanggan"
                            />
                            <QuickAction
                                icon="📊"
                                title="Lihat Laporan"
                                description="Lihat laporan keuangan"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function DashboardCard({ title, value, subtitle, color }) {
    const colorClasses = {
        green: 'bg-green-50 border-green-200',
        red: 'bg-red-50 border-red-200',
        yellow: 'bg-yellow-50 border-yellow-200',
        blue: 'bg-blue-50 border-blue-200',
    };

    const valueColorClasses = {
        green: 'text-green-700',
        red: 'text-red-700',
        yellow: 'text-yellow-700',
        blue: 'text-blue-700',
    };

    return (
        <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`mt-2 text-2xl font-bold ${valueColorClasses[color]}`}>
                {value}
            </p>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
    );
}

function QuickAction({ icon, title, description }) {
    return (
        <button className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary-300 transition-colors text-left w-full">
            <span className="text-2xl">{icon}</span>
            <div>
                <p className="font-medium text-gray-900">{title}</p>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </button>
    );
}
