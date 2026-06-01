<?php

namespace App\Http\Middleware;

use App\Models\PageView;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackPageView
{
    /**
     * Mapping route name prefix → menu_key (category.item).
     * Cocok dengan navigation.config.ts di frontend.
     */
    private const ROUTE_MENU_MAP = [
        'dashboard'                 => 'dashboard',
        'income.'                   => 'transaksi.uang-masuk',
        'expense.'                  => 'transaksi.uang-keluar',
        'receivables.'              => 'transaksi.piutang',
        'receivable-payments.'      => 'transaksi.piutang',
        'payables.'                 => 'transaksi.hutang',
        'payable-payments.'         => 'transaksi.hutang',
        'purchases.'                => 'transaksi.pembelian',
        'sales.'                    => 'transaksi.penjualan',
        'stock-adjustments.'        => 'transaksi.stok-penyesuaian',
        'journals.'                 => 'transaksi.jurnal',
        'partners.'                 => 'master-data.mitra',
        'products.'                 => 'master-data.produk',
        'cash-bank.'                => 'master-data.kas-bank',
        'categories.'               => 'master-data.kategori',
        'reports.transactions'      => 'laporan.transaksi',
        'reports.general-ledger'    => 'laporan.buku-besar',
        'reports.income-statement'  => 'laporan.laba-rugi',
        'reports.balance-sheet'     => 'laporan.neraca',
        'reports.cash-flow'         => 'laporan.arus-kas',
        'users.'                    => 'pengaturan.pengguna',
        'roles.'                    => 'pengaturan.role',
        'settings.menu.'            => 'pengaturan.menu',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($this->shouldTrack($request, $response)) {
            $this->record($request);
        }

        return $response;
    }

    private function shouldTrack(Request $request, Response $response): bool
    {
        if (!$request->isMethod('GET')) {
            return false;
        }

        if (!$request->user()) {
            return false;
        }

        if ($response->getStatusCode() !== 200) {
            return false;
        }

        if (!$request->header('X-Inertia')) {
            $acceptsHtml = str_contains($request->header('Accept', ''), 'text/html');
            if (!$acceptsHtml) {
                return false;
            }
        }

        return true;
    }

    private function record(Request $request): void
    {
        try {
            $routeName = $request->route()?->getName();

            PageView::create([
                'user_id'    => $request->user()->id,
                'company_id' => $request->user()->current_company_id,
                'route_name' => $routeName,
                'path'       => $request->path(),
                'menu_key'   => $this->resolveMenuKey($routeName),
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable) {
            // Tracking tidak boleh mengganggu request utama
        }
    }

    private function resolveMenuKey(?string $routeName): ?string
    {
        if (!$routeName) {
            return null;
        }

        foreach (self::ROUTE_MENU_MAP as $prefix => $menuKey) {
            if (str_starts_with($routeName, $prefix)) {
                return $menuKey;
            }
        }

        return null;
    }
}
