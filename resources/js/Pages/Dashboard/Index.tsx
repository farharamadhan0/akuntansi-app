import { Head } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Users, Truck, Plus, ArrowRight, LucideIcon } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface Stats {
    incomeThisMonth: number;
    expenseThisMonth: number;
    totalReceivables: number;
    totalPayables: number;
}

interface Company {
    name: string;
}
export default function Dashboard({ stats, company }: { stats: Stats; company?: Company }) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                    Selamat Datang, {company?.name}
                </h1>
                <p className="mt-1 text-gray-600">
                    Ringkasan keuangan bulan ini
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Uang Masuk"
                    value={formatCurrency(stats.incomeThisMonth)}
                    subtitle="Bulan ini"
                    icon={TrendingUp}
                    color="success"
                />
                <StatCard
                    title="Uang Keluar"
                    value={formatCurrency(stats.expenseThisMonth)}
                    subtitle="Bulan ini"
                    icon={TrendingDown}
                    color="danger"
                />
                <StatCard
                    title="Piutang"
                    value={formatCurrency(stats.totalReceivables)}
                    subtitle="Belum dibayar"
                    icon={Users}
                    color="warning"
                />
                <StatCard
                    title="Hutang"
                    value={formatCurrency(stats.totalPayables)}
                    subtitle="Belum dibayar"
                    icon={Truck}
                    color="primary"
                />
            </div>

            <Card>
                <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Aksi Cepat
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <QuickActionButton
                            icon={Plus}
                            title="Catat Uang Masuk"
                            color="bg-green-100 text-green-700 hover:bg-green-200"
                        />
                        <QuickActionButton
                            icon={Plus}
                            title="Catat Uang Keluar"
                            color="bg-red-100 text-red-700 hover:bg-red-200"
                        />
                        <QuickActionButton
                            icon={Plus}
                            title="Buat Piutang"
                            color="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        />
                        <QuickActionButton
                            icon={ArrowRight}
                            title="Lihat Laporan"
                            color="bg-primary-100 text-primary-700 hover:bg-primary-200"
                        />
                    </div>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: {
    title: string;
    value: string;
    subtitle: string;
    icon: LucideIcon;
    color: 'success' | 'danger' | 'warning' | 'primary';
}) {
    const colorClasses = {
        success: 'bg-green-50 text-green-600',
        danger: 'bg-red-50 text-red-600',
        warning: 'bg-yellow-50 text-yellow-600',
        primary: 'bg-primary-50 text-primary-600',
    };

    const valueColorClasses = {
        success: 'text-green-700',
        danger: 'text-red-700',
        warning: 'text-yellow-700',
        primary: 'text-primary-700',
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">
                        {title}
                    </span>
                    <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                        <Icon size={20} />
                    </div>
                </div>
                <p className={`text-2xl font-bold ${valueColorClasses[color]}`}>
                    {value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function QuickActionButton({ icon: Icon, title, color }: {
    icon: LucideIcon;
    title: string;
    color: string;
}) {
    return (
        <Button
            variant="ghost"
            className={`h-auto py-4 flex flex-col gap-2 w-full ${color}`}
        >
            <Icon size={24} />
            <span>{title}</span>
        </Button>
    );
}
