export function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function formatCurrencyCompact(value: number) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (abs >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
    if (abs >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
    return `Rp ${value.toFixed(0)}`;
}
