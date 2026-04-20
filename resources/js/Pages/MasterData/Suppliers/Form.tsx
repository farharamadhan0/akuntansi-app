import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface SupplierData {
    id: number;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    notes?: string;
    is_active: boolean;
}

interface Props {
    supplier?: SupplierData;
}

export default function Form({ supplier }: Props) {
    const isEdit = !!supplier;

    const { data, setData, post, put, processing, errors } = useForm({
        name: supplier?.name ?? '',
        code: supplier?.code ?? '',
        email: supplier?.email ?? '',
        phone: supplier?.phone ?? '',
        address: supplier?.address ?? '',
        tax_id: supplier?.tax_id ?? '',
        notes: supplier?.notes ?? '',
        is_active: supplier?.is_active ?? true,
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(`/master/pemasok/${supplier.id}`);
        } else {
            post('/master/pemasok');
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? 'Edit Pemasok' : 'Tambah Pemasok'} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Master Data' },
                    { label: 'Pemasok', href: '/master/pemasok' },
                    { label: isEdit ? 'Edit' : 'Tambah' },
                ]} />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Edit Pemasok' : 'Tambah Pemasok'}
                    </h1>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Nama Pemasok" error={errors.name} required>
                                    <Input
                                        placeholder="Nama lengkap pemasok"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                    />
                                </FormField>

                                <FormField label="Kode" error={errors.code} hint="Opsional – kode unik pemasok">
                                    <Input
                                        placeholder="Contoh: SUP-001"
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
                                    placeholder="Alamat lengkap pemasok"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    rows={3}
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="NPWP" error={errors.tax_id} hint="Opsional – Nomor Pokok Wajib Pajak pemasok">
                                    <Input
                                        placeholder="00.000.000.0-000.000"
                                        value={data.tax_id}
                                        onChange={(e) => setData('tax_id', e.target.value)}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Catatan" error={errors.notes} hint="Opsional – catatan internal tentang pemasok">
                                <Textarea
                                    placeholder="Catatan internal tentang pemasok"
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
                                    {isEdit ? 'Simpan Perubahan' : 'Tambah Pemasok'}
                                </Button>
                                <Link href="/master/pemasok">
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
