import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface CustomerData {
    id: number;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    credit_limit?: number;
    notes?: string;
    is_active: boolean;
}

interface Props {
    customer?: CustomerData;
}

export default function Form({ customer }: Props) {
    const isEdit = !!customer;

    const { data, setData, post, put, processing, errors } = useForm({
        name: customer?.name ?? '',
        code: customer?.code ?? '',
        email: customer?.email ?? '',
        phone: customer?.phone ?? '',
        address: customer?.address ?? '',
        tax_id: customer?.tax_id ?? '',
        credit_limit: customer?.credit_limit?.toString() ?? '',
        notes: customer?.notes ?? '',
        is_active: customer?.is_active ?? true,
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(`/master/pelanggan/${customer.id}`);
        } else {
            post('/master/pelanggan');
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan'} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Master Data' },
                    { label: 'Pelanggan', href: '/master/pelanggan' },
                    { label: isEdit ? 'Edit' : 'Tambah' },
                ]} />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
                    </h1>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Nama Pelanggan" error={errors.name} required>
                                    <Input
                                        placeholder="Nama lengkap pelanggan"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                    />
                                </FormField>

                                <FormField label="Kode" error={errors.code} hint="Opsional – kode unik pelanggan">
                                    <Input
                                        placeholder="Contoh: CUST-001"
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

                                <FormField label="Limit Kredit (Rp)" error={errors.credit_limit} hint="Batas maksimal piutang pelanggan">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="0 = tidak ada limit"
                                        value={data.credit_limit}
                                        onChange={(e) => setData('credit_limit', e.target.value)}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Catatan" error={errors.notes}>
                                <Textarea
                                    placeholder="Catatan internal tentang pelanggan (opsional)"
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
                                    {isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                                </Button>
                                <Link href="/master/pelanggan">
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
