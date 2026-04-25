import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface Role {
    id: number;
    name: string;
}

interface MemberData {
    id: number;
    name: string;
    email: string;
    role_id: number;
    is_active: boolean;
}

interface Props {
    member?: MemberData;
    roles: Role[];
}

export default function Form({ member, roles }: Props) {
    const isEdit = !!member;

    const { data, setData, post, put, processing, errors } = useForm({
        name: member?.name ?? '',
        email: member?.email ?? '',
        password: '',
        password_confirmation: '',
        role_id: member?.role_id?.toString() ?? (roles[0]?.id?.toString() ?? ''),
        is_active: member?.is_active ?? true,
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(`/pengaturan/pengguna/${member!.id}`);
        } else {
            post('/pengaturan/pengguna');
        }
    };

    const selectClass = (hasError: boolean) =>
        `h-8 w-full min-w-0 rounded-none border bg-transparent px-2.5 py-1 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 ${hasError ? 'border-destructive' : 'border-input'}`;

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'} />

            <div className="max-w-2xl mx-auto">
                <Breadcrumb items={[
                    { label: 'Pengaturan' },
                    { label: 'Pengguna', href: '/pengaturan/pengguna' },
                    { label: isEdit ? 'Edit' : 'Tambah' },
                ]} />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}
                    </h1>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <FormField label="Nama" error={errors.name} required>
                                <Input
                                    placeholder="Nama lengkap"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                            </FormField>

                            <FormField
                                label="Email"
                                error={errors.email}
                                required={!isEdit}
                                hint={isEdit ? undefined : 'Jika email sudah terdaftar di perusahaan lain, pengguna akan ditambahkan tanpa membuat akun baru.'}
                            >
                                <Input
                                    type="email"
                                    placeholder="email@domain.com"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    disabled={isEdit}
                                />
                            </FormField>

                            {!isEdit && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        label="Password"
                                        error={errors.password}
                                        hint="Wajib diisi untuk pengguna baru. Diabaikan jika email sudah terdaftar."
                                    >
                                        <Input
                                            type="password"
                                            placeholder="Minimal 8 karakter"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                        />
                                    </FormField>
                                    <FormField label="Konfirmasi Password" error={errors.password_confirmation}>
                                        <Input
                                            type="password"
                                            placeholder="Ulangi password"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                        />
                                    </FormField>
                                </div>
                            )}

                            <FormField label="Role" error={errors.role_id} required>
                                <select
                                    value={data.role_id}
                                    onChange={(e) => setData('role_id', e.target.value)}
                                    className={selectClass(!!errors.role_id)}
                                >
                                    <option value="">-- Pilih Role --</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
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
                                    {isEdit ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                                </Button>
                                <Link href="/pengaturan/pengguna">
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
