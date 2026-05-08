<?php

namespace App\Support;

class Permissions
{
    /**
     * Single source of truth untuk seluruh permission yang dapat diberikan
     * kepada custom role. Dikelompokkan per modul; setiap modul memiliki
     * label (untuk UI) dan daftar action.
     *
     * Format key permission: "<module>.<action>" (contoh: "accounts.view").
     */
    public static function groups(): array
    {
        $crud = [
            'view' => 'Lihat',
            'create' => 'Tambah',
            'edit' => 'Ubah',
            'delete' => 'Hapus',
        ];

        return [
            'dashboard' => [
                'label' => 'Dashboard',
                'actions' => [
                    'view' => 'Lihat',
                ],
            ],
            'income' => [
                'label' => 'Uang Masuk',
                'actions' => $crud,
            ],
            'expense' => [
                'label' => 'Uang Keluar',
                'actions' => $crud,
            ],
            'receivables' => [
                'label' => 'Piutang',
                'actions' => $crud,
            ],
            'payables' => [
                'label' => 'Hutang',
                'actions' => $crud,
            ],
            'journals' => [
                'label' => 'Jurnal Umum',
                'actions' => $crud,
            ],
            'customers' => [
                'label' => 'Pelanggan',
                'actions' => $crud,
            ],
            'suppliers' => [
                'label' => 'Pemasok',
                'actions' => $crud,
            ],
            'cash_bank' => [
                'label' => 'Kas & Bank',
                'actions' => $crud,
            ],
            'accounts' => [
                'label' => 'Daftar Akun',
                'actions' => $crud,
            ],
            'products' => [
                'label' => 'Produk',
                'actions' => $crud,
            ],
            'purchases' => [
                'label' => 'Pembelian',
                'actions' => $crud,
            ],
            'sales' => [
                'label' => 'Penjualan',
                'actions' => $crud,
            ],
            'inventory_adjustments' => [
                'label' => 'Penyesuaian Stok',
                'actions' => $crud,
            ],
            'reports' => [
                'label' => 'Laporan',
                'actions' => [
                    'transactions' => 'Daftar Transaksi',
                    'receivables' => 'Daftar Piutang',
                    'payables' => 'Daftar Hutang',
                    'general_ledger' => 'Buku Besar',
                    'income_statement' => 'Laba Rugi',
                    'balance_sheet' => 'Neraca',
                    'cash_flow' => 'Arus Kas',
                ],
            ],
        ];
    }

    /**
     * Seluruh kunci permission yang valid (flat).
     *
     * @return array<int, string>
     */
    public static function all(): array
    {
        $keys = [];
        foreach (self::groups() as $module => $group) {
            foreach (array_keys($group['actions']) as $action) {
                $keys[] = "{$module}.{$action}";
            }
        }

        return $keys;
    }

    public static function isValid(string $permission): bool
    {
        return in_array($permission, self::all(), true);
    }
}
