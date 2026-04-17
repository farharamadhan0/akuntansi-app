import { Head, Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Plus,
    ArrowRight,
    LucideIcon,
    HandCoins,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface Stats {
    incomeThisMonth: number;
    expenseThisMonth: number;
    netProfit: number;
    totalCashBank: number;
}

interface CashBankAccount {
    id: number;
    name: string;
    type: 'cash' | 'bank';
    balance: number;
}

interface RecentTransaction {
    id: number;
    transaction_number: string;
    type: 'income' | 'expense';
    date: string;
    amount: number;
    description: string;
    cash_bank_name: string;
    category_name?: string;
}

interface Company {
    name: string;
}

interface Props {
    stats: Stats;
    cashBankAccounts: CashBankAccount[];
    recentTransactions: RecentTransaction[];
    company?: Company;
    currentMonth: string;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
    });
}

export default function Dashboard({
    stats,
    cashBankAccounts,
    recentTransactions,
    company,
    currentMonth,
}: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Halo, {company?.name}
                </h1>
                <p className="text-gray-500 text-sm">
                    Ringkasan keuangan {currentMonth}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Uang Masuk"
                    value={formatCurrency(stats.incomeThisMonth)}
                    icon={TrendingUp}
                    iconBg="bg-green-100"
                    iconColor="text-green-600"
                    valueColor="text-green-700"
                />
                <StatCard
                    title="Uang Keluar"
                    value={formatCurrency(stats.expenseThisMonth)}
                    icon={TrendingDown}
                    iconBg="bg-red-100"
                    iconColor="text-red-600"
                    valueColor="text-red-700"
                />
                <StatCard
                    title="Saldo Kas & Bank"
                    value={formatCurrency(stats.totalCashBank)}
                    icon={Wallet}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                    valueColor="text-blue-700"
                />
                <StatCard
                    title="Laba Bulan Ini"
                    value={formatCurrency(stats.netProfit)}
                    icon={HandCoins}
                    iconBg={stats.netProfit >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}
                    iconColor={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}
                    valueColor={stats.netProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'}
                />
            </div>

            {/* Quick Actions */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">
                        Aksi Cepat
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/transaksi/uang-masuk/catat">
                            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                                <Plus size={14} />
                                Uang Masuk
                            </Button>
                        </Link>
                        <Link href="/transaksi/uang-keluar/catat">
                            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                                <Plus size={14} />
                                Uang Keluar
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cash & Bank Balances */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-700">
                                Saldo Kas & Bank
                            </h2>
                            <Link href="/master/kas-bank" className="text-xs text-blue-600 hover:underline">
                                Kelola
                            </Link>
                        </div>
                        {cashBankAccounts.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">
                                Belum ada akun kas/bank
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {cashBankAccounts.map((acc) => (
                                    <div
                                        key={acc.id}
                                        className="flex items-center justify-between py-2 border-b last:border-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded ${acc.type === 'cash' ? 'bg-green-50' : 'bg-blue-50'}`}>
                                                <Wallet size={14} className={acc.type === 'cash' ? 'text-green-600' : 'text-blue-600'} />
                                            </div>
                                            <span className="text-sm text-gray-700">{acc.name}</span>
                                        </div>
                                        <span className={`text-sm font-semibold ${acc.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                            {formatCurrency(acc.balance)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Transactions */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-700">
                                Transaksi Terakhir
                            </h2>
                            <Link href="/transaksi/uang-masuk" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                                Lihat semua <ArrowRight size={12} />
                            </Link>
                        </div>
                        {recentTransactions.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">
                                Belum ada transaksi
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {recentTransactions.map((t) => (
                                    <Link
                                        key={t.id}
                                        href={`/transaksi/${t.type === 'income' ? 'uang-masuk' : 'uang-keluar'}/${t.id}`}
                                        className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`p-1.5 rounded ${t.type === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
                                                {t.type === 'income' ? (
                                                    <TrendingUp size={14} className="text-green-600" />
                                                ) : (
                                                    <TrendingDown size={14} className="text-red-600" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-700 truncate">
                                                    {t.description}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {formatDate(t.date)} · {t.cash_bank_name}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-semibold whitespace-nowrap ml-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    iconBg,
    iconColor,
    valueColor,
}: {
    title: string;
    value: string;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
    valueColor: string;
}) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${iconBg}`}>
                        <Icon size={16} className={iconColor} />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{title}</span>
                </div>
                <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
            </CardContent>
        </Card>
    );
}
