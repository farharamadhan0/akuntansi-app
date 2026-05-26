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

function parseDateValue(dateStr: string): Date | null {
    if (!dateStr) {
        return null;
    }

    const trimmed = dateStr.trim();

    if (!trimmed) {
        return null;
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);

    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

export function formatDateDDMMYYYY(dateStr: string): string {
    const date = parseDateValue(dateStr);

    if (!date) {
        return '-';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
}

export function formatDateTime(input: string): string {
  const date = new Date(input.replace(" ", "T"));

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}