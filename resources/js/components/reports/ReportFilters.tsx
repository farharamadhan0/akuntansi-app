import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Props {
    url: string;
    from?: string;
    to?: string;
    asOf?: string;
    mode?: 'range' | 'asOf';
    extra?: React.ReactNode;
    query?: Record<string, string | number | boolean | null | undefined>;
}

export default function ReportFilters({ url, from = '', to = '', asOf = '', mode = 'range', extra, query = {} }: Props) {
    const [dateFrom, setDateFrom] = useState(from);
    const [dateTo, setDateTo] = useState(to);
    const [dateAsOf, setDateAsOf] = useState(asOf);

    useEffect(() => {
        setDateFrom(from);
        setDateTo(to);
    }, [from, to]);

    useEffect(() => {
        setDateAsOf(asOf);
    }, [asOf]);

    const apply = () => {
        if (mode === 'asOf') {
            router.get(url, { as_of: dateAsOf, ...query }, { preserveScroll: true });
        } else {
            router.get(url, { from: dateFrom, to: dateTo, ...query }, { preserveScroll: true });
        }
    };

    return (
        <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-gray-50 rounded-lg border">
            {mode === 'asOf' ? (
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Per Tanggal</label>
                    <Input type="date" value={dateAsOf} onChange={(e) => setDateAsOf(e.target.value)} className="w-40" />
                </div>
            ) : (
                <>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                    </div>
                </>
            )}
            {extra}
            <Button onClick={apply} className="gap-1.5">
                <Search size={16} />
                Tampilkan
            </Button>
        </div>
    );
}
