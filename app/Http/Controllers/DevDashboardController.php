<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\PageView;
use App\Models\Transaction;
use App\Models\CashBankAccount;
use App\Models\Partner;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DevDashboardController extends Controller
{
    public function index(): Response
    {
        $now = now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // ----------------------------------------------------------------
        // 1. Total Tenant
        // ----------------------------------------------------------------
        $totalTenants = Company::withoutTrashed()->count();

        // ----------------------------------------------------------------
        // 2. Tenant Aktif Bulan Ini (ada transaksi bulan ini)
        // ----------------------------------------------------------------
        $activeTenantsThisMonth = Transaction::withoutGlobalScope('company')
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->distinct('company_id')
            ->count('company_id');

        // ----------------------------------------------------------------
        // 3. Total Transaksi Bulan Ini
        // ----------------------------------------------------------------
        $totalTransactionsThisMonth = Transaction::withoutGlobalScope('company')
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->count();

        // ----------------------------------------------------------------
        // 4. Menu Paling Sering Digunakan (top 10)
        // ----------------------------------------------------------------
        $topMenus = PageView::select('menu_key', DB::raw('COUNT(*) as total'))
            ->whereNotNull('menu_key')
            ->whereBetween('viewed_at', [$startOfMonth, $endOfMonth])
            ->groupBy('menu_key')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'menu_key' => $r->menu_key,
                'label'    => $this->menuLabel($r->menu_key),
                'total'    => (int) $r->total,
            ])
            ->values();

        // ----------------------------------------------------------------
        // 5. Laporan Paling Sering Dibuka (top 5)
        // ----------------------------------------------------------------
        $topReports = PageView::select('route_name', DB::raw('COUNT(*) as total'))
            ->where('route_name', 'like', 'reports.%')
            ->whereBetween('viewed_at', [$startOfMonth, $endOfMonth])
            ->groupBy('route_name')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'route_name' => $r->route_name,
                'label'      => $this->reportLabel($r->route_name),
                'total'      => (int) $r->total,
            ])
            ->values();

        // ----------------------------------------------------------------
        // 6. Tenant Belum Menyelesaikan Setup
        //    Kriteria: belum punya kas/bank ATAU belum punya mitra ATAU belum ada transaksi posted
        // ----------------------------------------------------------------
        $incompleteSetup = $this->getIncompleteSetupTenants();

        // ----------------------------------------------------------------
        // 7. Daily Active Users (14 hari terakhir)
        // ----------------------------------------------------------------
        $dauData = $this->getDailyActiveUsers(14);

        // DAU hari ini memakai page_views agar konsisten dengan data historis.
        $dauToday = $this->countDailyActiveUsers($now);

        return Inertia::render('Dev/Dashboard', [
            'metrics' => [
                'totalTenants'              => $totalTenants,
                'activeTenantsThisMonth'    => $activeTenantsThisMonth,
                'totalTransactionsThisMonth'=> $totalTransactionsThisMonth,
                'dauToday'                  => $dauToday,
                'incompleteSetupCount'      => count($incompleteSetup),
            ],
            'topMenus'        => $topMenus,
            'topReports'      => $topReports,
            'incompleteSetup' => $incompleteSetup,
            'dauChart'        => $dauData,
            'period'          => $now->format('F Y'),
        ]);
    }

    private function getIncompleteSetupTenants(): array
    {
        $companies = Company::withoutTrashed()
            ->select('id', 'name', 'email', 'created_at')
            ->get();

        $result = [];

        foreach ($companies as $company) {
            $hasCashBank = CashBankAccount::withoutGlobalScope('company')
                ->where('company_id', $company->id)
                ->exists();

            $hasPartner = Partner::withoutGlobalScope('company')
                ->where('company_id', $company->id)
                ->exists();

            $hasPostedTransaction = Transaction::withoutGlobalScope('company')
                ->where('company_id', $company->id)
                ->where('status', 'posted')
                ->exists();

            $missing = [];
            if (!$hasCashBank) $missing[] = 'Kas/Bank';
            if (!$hasPartner) $missing[] = 'Mitra';
            if (!$hasPostedTransaction) $missing[] = 'Transaksi';

            if (!empty($missing)) {
                $result[] = [
                    'id'         => $company->id,
                    'name'       => $company->name,
                    'email'      => $company->email,
                    'created_at' => $company->created_at->format('Y-m-d'),
                    'missing'    => $missing,
                ];
            }
        }

        return $result;
    }

    private function getDailyActiveUsers(int $days): array
    {
        $data = [];
        $now = now();

        for ($i = $days - 1; $i >= 0; $i--) {
            $date = $now->copy()->subDays($i);

            $data[] = [
                'date'  => $date->format('Y-m-d'),
                'label' => $date->format('d/m'),
                'dau'   => $this->countDailyActiveUsers($date),
            ];
        }

        return $data;
    }

    private function countDailyActiveUsers(Carbon $date): int
    {
        return PageView::whereNotNull('user_id')
            ->whereBetween('viewed_at', [
                $date->copy()->startOfDay(),
                $date->copy()->endOfDay(),
            ])
            ->distinct('user_id')
            ->count('user_id');
    }

    private function menuLabel(string $menuKey): string
    {
        return match ($menuKey) {
            'dashboard'                  => 'Dashboard',
            'transaksi.uang-masuk'       => 'Uang Masuk',
            'transaksi.uang-keluar'      => 'Uang Keluar',
            'transaksi.piutang'          => 'Piutang',
            'transaksi.hutang'           => 'Hutang',
            'transaksi.pembelian'        => 'Pembelian',
            'transaksi.penjualan'        => 'Penjualan',
            'transaksi.stok-penyesuaian' => 'Penyesuaian Stok',
            'transaksi.jurnal'           => 'Jurnal Umum',
            'master-data.mitra'          => 'Mitra',
            'master-data.produk'         => 'Produk',
            'master-data.kas-bank'       => 'Kas & Bank',
            'master-data.kategori'       => 'Kategori Transaksi',
            'laporan.transaksi'          => 'Laporan Transaksi',
            'laporan.buku-besar'         => 'Buku Besar',
            'laporan.laba-rugi'          => 'Laba Rugi',
            'laporan.neraca'             => 'Neraca',
            'laporan.arus-kas'           => 'Arus Kas',
            'pengaturan.pengguna'        => 'Pengguna',
            'pengaturan.role'            => 'Role',
            'pengaturan.fitur'           => 'Fitur Aplikasi',
            default                      => $menuKey,
        };
    }

    private function reportLabel(?string $routeName): string
    {
        return match ($routeName) {
            'reports.transactions'     => 'Daftar Transaksi',
            'reports.general-ledger'   => 'Buku Besar',
            'reports.income-statement' => 'Laba Rugi',
            'reports.balance-sheet'    => 'Neraca',
            'reports.cash-flow'        => 'Arus Kas',
            default                    => $routeName ?? '-',
        };
    }
}
