import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface PartnerData {
    id: number;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    credit_limit?: number | string | null;
    notes?: string;
    is_active: boolean;
    types: string[];
}

interface Props {
    partner?: PartnerData;
}

const ALL_TYPES = [
    { value: 'customer', label: 'Pelanggan' },
    { value: 'supplier', label: 'Supplier' },
] as const;

export default function Form({ partner }: Props) {
    const isEdit = !!partner;

    const { data, setData, post, put, processing, errors } = useForm({
        name: partner?.name ?? '',
        code: partner?.code ?? '',
        email: partner?.email ?? '',
        phone: partner?.phone ?? '',
        address: partner?.address ?? '',
        tax_id: partner?.tax_id ?? '',
        credit_limit: partner?.credit_limit != null ? String(partner.credit_limit) : '',
        notes: partner?.notes ?? '',
        is_active: partner?.is_active ?? true,
        types: (partner?.types ?? ['customer']) as string[],
    });

    const toggleType = (type: string) => {
        if (data.types.includes(type)) {
            setData('types', data.types.filter((t) => t !== type));
        } else {
            setData('types', [...data.types, type]);
        }
    };

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit && partner) {
            put(`/master/mitra/${partner.id}`);
        } else {
            post('/master/mitra');
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? 'Edit Mitra' : 'Tambah Mitra'} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Master Data' },
                    { label: 'Mitra', href: '/master/mitra' },
                    { label: isEdit ? 'Edit' : 'Tambah' },
                ]} />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Edit Mitra' : 'Tambah Mitra'}
                    </h1>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <FormField label="Tipe Mitra" error={errors.types} required hint="Pilih minimal satu tipe">
                                <div className="flex flex-wrap gap-3">
                                    {ALL_TYPES.map((t) => (
                                        <label
                                            key={t.value}
                                            className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                                                data.types.includes(t.value)
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={data.types.includes(t.value)}
                                                onChange={() => toggleType(t.value)}
                                                className="h-4 w-4"
                                            />
                                            {t.label}
                                        </label>
                                    ))}
                                </div>
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Nama Mitra" error={errors.name} required>
                                    <Input
                                        placeholder="Nama lengkap mitra"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                    />
                                </FormField>

                                <FormField label="Kode" error={errors.code} hint="Opsional – kode unik mitra">
                                    <Input
                                        placeholder="Contoh: MTR-001"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Email" error={errors.email}>
                                    <Input
                                        type="email"
                                        placeholder="email@domain.com"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                </FormField>

                                <FormField label="Telepon" error={errors.phone}>
                                    <Input
                                        placeholder="08xx-xxxx-xxxx"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Alamat" error={errors.address}>
                                <Textarea
                                    placeholder="Alamat lengkap"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    rows={3}
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="NPWP" error={errors.tax_id}>
                                    <Input
                                        placeholder="Nomor NPWP (opsional)"
                                        value={data.tax_id}
                                        onChange={(e) => setData('tax_id', e.target.value)}
                                    />
                                </FormField>

                                <FormField label="Limit Kredit (Rp)" error={errors.credit_limit} hint="Hanya berlaku untuk pelanggan">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="Kosongkan jika tidak ada limit"
                                        value={data.credit_limit}
                                        onChange={(e) => setData('credit_limit', e.target.value)}
                                        disabled={!data.types.includes('customer')}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Catatan" error={errors.notes}>
                                <Textarea
                                    placeholder="Catatan internal tentang mitra (opsional)"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={2}
                                />
                            </FormField>

                            {isEdit && (
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-gray-700">Status</label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={(e) => setData('is_active', e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Aktif</span>
                                    </label>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button type="submit" disabled={processing}>
                                    {isEdit ? 'Simpan Perubahan' : 'Tambah Mitra'}
                                </Button>
                                <Link href="/master/mitra">
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
