/**
 * Shared formatting utilities for Indonesian (id-ID) locale.
 * Consistent Rupiah, date, and number formatting for the entire app.
 */

/** Format number as Rupiah: Rp 1.500.000 */
export function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/** Short date: 15 Apr 2024 */
export function formatTanggal(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/** Long date: 15 April 2024 */
export function formatTanggalPanjang(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/** Compact date for dashboard: 15 Apr */
export function formatTanggalSingkat(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
    });
}

/** Format date safely for income statement etc (avoids timezone shift) */
export function formatTanggalISO(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
