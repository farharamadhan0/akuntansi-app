import type { ReactNode } from "react";
import { Head, Link } from "@inertiajs/react";
import {
    ArrowRight,
    ArrowUpRight,
    BarChart3,
    BookOpen,
    Calculator,
    Clock3,
    CircleDollarSign,
    ClipboardList,
    DollarSign,
    Gauge,
    Headphones,
    LayoutDashboard,
    MenuSquare,
    PackageCheck,
    Percent,
    PiggyBank,
    ReceiptText,
    Settings,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
    WalletCards,
} from "lucide-react";
import logo from "@/assets/logo.png";


const modules = [
    { icon: WalletCards, title: "Uang Masuk & Keluar", text: "Catat arus kas harian tanpa spreadsheet yang tercecer." },
    { icon: ReceiptText, title: "Penjualan & Pembelian", text: "Kelola transaksi utama bisnis dari satu tempat." },
    { icon: PackageCheck, title: "Stok & Penyesuaian", text: "Pantau pergerakan barang dan koreksi stok dengan rapi." },
    { icon: Users, title: "Hutang Piutang", text: "Lihat tagihan, jatuh tempo, dan pembayaran yang perlu ditindaklanjuti." },
    { icon: BookOpen, title: "Jurnal & Buku Besar", text: "Data operasional tersusun menjadi catatan akuntansi yang siap diperiksa." },
    { icon: BarChart3, title: "Laporan Keuangan", text: "Neraca, cash flow, dan laba rugi untuk keputusan yang lebih tenang." },
];

const advantages = [
    {
        icon: MenuSquare,
        title: "Menu sesuai kebutuhan",
        text: "Aktifkan hanya modul yang dipakai, sehingga tim tidak terdistraksi oleh fitur yang belum relevan.",
    },
    {
        icon: LayoutDashboard,
        title: "Custom dashboard",
        text: "Susun widget penting seperti kas, piutang, penjualan, stok, dan tren agar tampilan kerja terasa milik bisnis Anda.",
    },
    {
        icon: Headphones,
        title: "Support yang responsif",
        text: "Dapatkan bantuan yang jelas saat setup, migrasi kebiasaan pencatatan, atau ketika tim butuh arahan.",
    },
];

const audiences = ["Toko retail", "Distributor kecil", "Jasa profesional", "Warung & kafe", "Bisnis online", "UMKM bertumbuh"];

const steps = [
    { title: "Pilih fitur", text: "Tentukan menu yang dibutuhkan oleh bisnis dan tim Anda." },
    { title: "Catat transaksi", text: "Masukkan transaksi kas, penjualan, pembelian, stok, hutang, dan piutang." },
    { title: "Pantau laporan", text: "Gunakan dashboard dan laporan untuk melihat kondisi bisnis dengan cepat." },
];

const summaryCards = [
    {
        title: "Uang Masuk",
        value: "Rp 84.200.000",
        icon: TrendingUp,
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        valueColor: "text-green-700",
        delta: "12.4%",
        deltaColor: "text-emerald-600",
    },
    {
        title: "Uang Keluar",
        value: "Rp 51.800.000",
        icon: TrendingDown,
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        valueColor: "text-red-700",
        delta: "4.2%",
        deltaColor: "text-emerald-600",
    },
    {
        title: "Penjualan",
        value: "Rp 126.000.000",
        icon: TrendingUp,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        valueColor: "text-blue-700",
        delta: "18.0%",
        deltaColor: "text-emerald-600",
    },
    {
        title: "Laba Bulan Ini",
        value: "Rp 32.400.000",
        icon: DollarSign,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-700",
        subtitle: "Margin 25.7%",
    },
];

const salesMetrics = [
    { label: "Penjualan", value: "Rp 126.000.000", icon: Wallet, iconBg: "bg-blue-100", iconColor: "text-blue-600", valueColor: "text-blue-700" },
    { label: "HPP", value: "Rp 78.300.000", icon: Calculator, iconBg: "bg-amber-100", iconColor: "text-amber-600", valueColor: "text-amber-700" },
    { label: "Laba Kotor", value: "Rp 47.700.000", icon: BarChart3, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", valueColor: "text-emerald-700" },
];

const recentTransactions = [
    { title: "Penjualan INV-0241", meta: "10 Jun 2026 · UM-1024 · Penjualan", amount: "+Rp 8.400.000", tone: "income" },
    { title: "Pembelian bahan baku", meta: "09 Jun 2026 · UK-0817 · Persediaan", amount: "-Rp 3.250.000", tone: "expense" },
    { title: "Pembayaran piutang", meta: "08 Jun 2026 · UM-1023 · Piutang", amount: "+Rp 5.000.000", tone: "income" },
];

function SectionHeader({ eyebrow, title, text, inverse = false }: { eyebrow: string; title: string; text?: string; inverse?: boolean }) {
    return (
        <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981]">{eyebrow}</p>
            <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${inverse ? "text-white" : "text-[#0F172A]"}`}>{title}</h2>
            {text ? <p className={`mt-4 text-base leading-7 ${inverse ? "text-slate-300" : "text-[#64748B]"}`}>{text}</p> : null}
        </div>
    );
}

function MockCard({ className = "", children }: { className?: string; children: ReactNode }) {
    return (
        <div className={`flex flex-col gap-4 overflow-hidden rounded-none bg-white py-4 text-xs/relaxed text-slate-900 ring-1 ring-slate-900/10 ${className}`}>
            {children}
        </div>
    );
}

function DashboardMockup({ compact = false, hero = false }: { compact?: boolean; hero?: boolean }) {
    return (
        <div className={`rounded-lg border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 sm:p-4 ${hero ? "lg:w-[780px] xl:w-[880px]" : ""}`}>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-gray-50 p-4 sm:p-5">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Dashboard</h3>
                        <p className="mt-0.5 text-xs text-gray-500">
                            Periode: <span className="font-medium">Juni 2026</span>
                        </p>
                    </div>
                    <div className="inline-flex h-7 items-center justify-center gap-1 rounded-none border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm">
                        <Settings size={14} />
                        Sesuaikan
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {summaryCards.map((item) => {
                            const Icon = item.icon;

                            return (
                                <MockCard key={item.title}>
                                    <div className="px-4">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`rounded-lg p-1.5 ${item.iconBg}`}>
                                                    <Icon size={14} className={item.iconColor} />
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">{item.title}</span>
                                            </div>
                                            <span className="text-xs text-blue-600">Detail</span>
                                        </div>
                                        <p className={`break-words text-base font-bold sm:text-lg ${item.valueColor}`}>{item.value}</p>
                                        <div className="mt-0.5 flex min-h-4 items-center gap-2">
                                            {item.delta ? (
                                                <>
                                                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${item.deltaColor}`}>
                                                        <ArrowUpRight size={12} />
                                                        {item.delta}
                                                    </span>
                                                    <span className="text-xs text-gray-400">vs bulan lalu</span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-400">{item.subtitle}</span>
                                            )}
                                        </div>
                                    </div>
                                </MockCard>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
                        <div className="lg:col-span-3">
                            <MockCard>
                                <div className="px-4">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500">Margin Penjualan</p>
                                            <p className="mt-0.5 text-xs text-gray-400">Periode Juni 2026</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-100 p-2">
                                            <Percent size={16} className="text-slate-600" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {salesMetrics.map((item) => {
                                            const Icon = item.icon;

                                            return (
                                                <div key={item.label} className="rounded-lg border border-gray-200 p-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`rounded-md p-1.5 ${item.iconBg}`}>
                                                            <Icon size={14} className={item.iconColor} />
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-500">{item.label}</span>
                                                    </div>
                                                    <p className={`mt-3 text-base font-bold sm:text-lg ${item.valueColor}`}>{item.value}</p>
                                                </div>
                                            );
                                        })}

                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-md bg-slate-200 p-1.5">
                                                    <Percent size={14} className="text-slate-700" />
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">Margin</span>
                                            </div>
                                            <p className="mt-3 text-2xl font-bold text-slate-900">37.9%</p>
                                            <p className="mt-1 text-xs text-gray-400">Laba kotor dibagi total penjualan</p>
                                        </div>
                                    </div>
                                </div>
                            </MockCard>
                        </div>

                        <div className="lg:col-span-3">
                            <MockCard>
                                <div className="px-4">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500">Cash Runway</p>
                                            <p className="mt-0.5 text-xs text-gray-400">Berdasarkan rata-rata harian aktual</p>
                                        </div>
                                        <div className="rounded-lg bg-cyan-100 p-2">
                                            <Clock3 size={16} className="text-cyan-700" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-md bg-emerald-100 p-1.5">
                                                    <PiggyBank size={14} className="text-emerald-600" />
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">Saldo kas &amp; bank</span>
                                            </div>
                                            <p className="mt-3 text-base font-bold text-emerald-700 sm:text-lg">Rp 84.200.000</p>
                                        </div>
                                        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                                            <p className="text-xs font-medium text-gray-500">Estimasi cukup untuk</p>
                                            <p className="mt-2 text-2xl font-bold text-cyan-900">2.8 bulan</p>
                                            <p className="mt-1 text-xs text-gray-400">Estimasi berdasarkan saldo saat ini dan pengeluaran rata-rata harian</p>
                                        </div>
                                    </div>
                                </div>
                            </MockCard>
                        </div>
                    </div>

                    {!compact ? null : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
                            <div className="lg:col-span-3">
                                <MockCard>
                                    <div className="px-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-gray-700">Transaksi Terakhir</h4>
                                            <span className="text-xs text-blue-600">Lihat semua</span>
                                        </div>
                                        <div className="space-y-2">
                                            {recentTransactions.map((item) => (
                                                <div key={item.title} className="flex flex-col gap-1 border-b px-2 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <div className={`rounded p-1.5 ${item.tone === "income" ? "bg-green-50" : "bg-red-50"}`}>
                                                            {item.tone === "income" ? (
                                                                <TrendingUp size={14} className="text-green-600" />
                                                            ) : (
                                                                <TrendingDown size={14} className="text-red-600" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm text-gray-700">{item.title}</p>
                                                            <p className="truncate text-xs text-gray-400">{item.meta}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`ml-8 text-sm font-semibold sm:ml-2 sm:whitespace-nowrap ${item.tone === "income" ? "text-green-600" : "text-red-600"}`}>
                                                        {item.amount}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </MockCard>
                            </div>
                            <div className="lg:col-span-3">
                                <MockCard>
                                    <div className="px-4">
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">Cash Flow Bulan Ini</p>
                                                <p className="mt-0.5 text-xs text-gray-400">Ringkasan arus kas bulan berjalan</p>
                                            </div>
                                            <div className="rounded-lg bg-slate-100 p-2">
                                                <Wallet size={16} className="text-slate-700" />
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                            <p className="text-xs font-medium text-gray-500">Net cash flow</p>
                                            <p className="mt-2 text-2xl font-bold text-emerald-800">Rp 32.400.000</p>
                                        </div>
                                    </div>
                                </MockCard>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Landing() {
    return (
        <>
            <Head title="Emwal - Aplikasi Akuntansi Fleksibel untuk UMKM" />
            <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
                <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#F8FAFC]/90 backdrop-blur">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
                        <a href="#hero" className="flex items-center gap-3">
                        <img src={logo} alt="Emwal" className="h-9" />
                        </a>
                        <div className="hidden items-center gap-7 text-sm font-medium text-[#64748B] md:flex">
                            <a className="hover:text-[#0F172A]" href="#fitur">Fitur</a>
                            <a className="hover:text-[#0F172A]" href="#keunggulan">Keunggulan</a>
                            <a className="hover:text-[#0F172A]" href="#cara-kerja">Cara kerja</a>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link className="hidden text-sm font-semibold text-[#0F172A] sm:inline-flex" href="/dashboard">Masuk</Link>
                            <a target="_blank" className="inline-flex h-10 items-center justify-center rounded-lg bg-[#10B981] px-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600" href="https://api.whatsapp.com/send?phone=6285230811625&text=Halo%2C%20saya%20mau%20konsultasi%20soal%20emwal.%20">
                                Konsultasi
                            </a>
                        </div>
                    </div>
                </nav>

                <section id="hero" className="overflow-hidden">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:py-24 xl:max-w-[88rem] xl:grid-cols-[0.68fr_1.32fr]">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700">
                                <ShieldCheck className="size-4" />
                                Akuntansi ramah untuk UMKM
                            </div>
                            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
                                Aplikasi Pencatatan Keuangan Fleksibel
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#64748B]">
                                Catat uang masuk dan keluar, kelola penjualan, pembelian, stok, hutang piutang, hingga laporan keuangan dalam satu aplikasi yang bisa disesuaikan dengan kebutuhan bisnis Anda.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <a target="_blank" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#10B981] px-6 text-sm font-bold text-white shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-600" href="https://api.whatsapp.com/send?phone=6285230811625&text=Halo%2C%20saya%20mau%20konsultasi%20soal%20emwal.%20">
                                    Konsultasi
                                    <ArrowRight className="size-4" />
                                </a>
                                <a className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-bold text-[#0F172A] transition hover:border-slate-400" href="/dashboard">
                                    Mulai Menggunakan
                                </a>
                            </div>
                        </div>
                        <div className="lg:-mr-24 xl:-mr-36">
                            <DashboardMockup hero />
                        </div>
                    </div>
                </section>

                <section className="bg-white py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <SectionHeader
                            eyebrow="Masalah UMKM"
                            title="Pencatatan keuangan sering rapi di awal, lalu berantakan saat bisnis makin ramai"
                            text="Data kas, stok, hutang piutang, dan laporan sering tersebar di buku, chat, spreadsheet, atau aplikasi yang terlalu kaku."
                        />
                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {["Sulit tahu berapa uang yang benar-benar tersedia", "Fitur terlalu banyak untuk usaha kecil", "Laporan terlambat saat dibutuhkan"].map((item) => (
                                <div key={item} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-6">
                                    <CircleDollarSign className="size-7 text-[#10B981]" />
                                    <p className="mt-5 text-lg font-bold text-[#0F172A]">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="fitur" className="py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <SectionHeader eyebrow="Fitur" title="Semua pencatatan penting UMKM dalam satu alur kerja" />
                        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {modules.map((feature) => (
                                <div key={feature.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                    <feature.icon className="size-7 text-[#10B981]" />
                                    <h3 className="mt-5 text-lg font-bold text-[#0F172A]">{feature.title}</h3>
                                    <p className="mt-2 leading-7 text-[#64748B]">{feature.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="keunggulan" className="bg-[#0F172A] py-16 text-white sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <SectionHeader inverse eyebrow="Keunggulan" title="Emwal menyesuaikan diri dengan cara bisnis Anda bekerja" text="Mulai dari menu, tampilan dashboard, sampai bantuan penggunaan, Emwal dibuat supaya tim UMKM bisa cepat nyaman." />
                        <div className="mt-10 grid gap-4 lg:grid-cols-3">
                            {advantages.map((item) => (
                                <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 p-6">
                                    <item.icon className="size-8 text-[#10B981]" />
                                    <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                                    <p className="mt-3 leading-7 text-slate-300">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981]">Untuk siapa</p>
                                <h2 className="mt-3 text-3xl font-bold text-[#0F172A] sm:text-4xl">Dibuat untuk pemilik dan tim UMKM yang ingin angka bisnis mudah dibaca</h2>
                                <p className="mt-4 leading-7 text-[#64748B]">Emwal cocok untuk bisnis yang butuh pencatatan lebih rapi tanpa kehilangan kesederhanaan operasional harian.</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {audiences.map((item) => (
                                    <div key={item} className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-[#0F172A] shadow-sm">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="dashboard" className="bg-white py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <SectionHeader
                            eyebrow="Dashboard preview"
                            title="Ringkasan bisnis yang bisa Anda susun sendiri"
                            text="Terinspirasi dari dashboard Emwal, user dapat memilih widget yang tampil agar halaman utama langsung menjawab pertanyaan terpenting hari itu."
                        />
                        <div className="mt-10">
                            <DashboardMockup compact />
                        </div>
                    </div>
                </section>

                <section id="cara-kerja" className="py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
                        <SectionHeader eyebrow="Cara kerja" title="Mulai lebih rapi dalam 3 langkah" />
                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {steps.map((step, index) => (
                                <div key={step.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#0F172A] text-sm font-bold text-white">{index + 1}</div>
                                    <h3 className="mt-5 text-xl font-bold text-[#0F172A]">{step.title}</h3>
                                    <p className="mt-3 leading-7 text-[#64748B]">{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="demo" className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
                    <div className="mx-auto max-w-5xl rounded-lg bg-[#0F172A] px-6 py-12 text-center text-white sm:px-10">
                        <ClipboardList className="mx-auto size-10 text-[#10B981]" />
                        <h2 className="mt-5 text-3xl font-bold sm:text-4xl">Siap membuat keuangan bisnis lebih rapi?</h2>
                        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">Diskusikan kebutuhan menu, dashboard, dan alur pencatatan yang paling pas untuk UMKM Anda.</p>
                        <a target="_blank" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#10B981] px-6 text-sm font-bold text-white transition hover:bg-emerald-600" href="https://api.whatsapp.com/send?phone=6285230811625&text=Halo%2C%20saya%20mau%20konsultasi%20soal%20emwal.%20">
                            Konsultasi
                            <ArrowRight className="size-4" />
                        </a>
                    </div>
                </section>

                <footer className="border-t border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#64748B] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                        <div className="flex items-center gap-3">
                            <div>
                                <img src={logo} alt="Emwal" className="h-7 mb-1" />
                                <p>Aplikasi akuntansi fleksibel untuk UMKM.</p>
                            </div>
                        </div>
                        <p>© 2026 Emwal. Semua hak dilindungi.</p>
                    </div>
                </footer>
            </main>
        </>
    );
}
