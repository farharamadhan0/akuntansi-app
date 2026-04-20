import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Props {
    url: string;
    from: string;
    to: string;
    extra?: React.ReactNode;
}

export default function ReportFilters({ url, from, to, extra }: Props) {
    const [dateFrom, setDateFrom] = useState(from);
    const [dateTo, setDateTo] = useState(to);

    const apply = () => router.get(url, { from: dateFrom, to: dateTo }, { preserveScroll: true });

    return (
        <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-gray-50 rounded-lg border">
            <div>
                <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            {extra}
            <Button onClick={apply} className="gap-1.5">
                <Search size={16} />
                Tampilkan
            </Button>
        </div>
    );
}
