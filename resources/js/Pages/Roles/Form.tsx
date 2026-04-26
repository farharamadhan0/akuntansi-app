import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface PermissionGroup {
    label: string;
    actions: Record<string, string>;
}

interface RoleData {
    id: number;
    name: string;
    permissions: string[];
}

interface Props {
    role?: RoleData;
    permissionGroups: Record<string, PermissionGroup>;
}

type FormShape = {
    name: string;
    permissions: string[];
};

export default function Form({ role, permissionGroups }: Props) {
    const isEdit = !!role;

    const { data, setData, post, put, processing, errors } = useForm<FormShape>({
        name: role?.name ?? '',
        permissions: role?.permissions ?? [],
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(`/pengaturan/role/${role!.id}`);
        } else {
            post('/pengaturan/role');
        }
    };

    const togglePermission = (key: string) => {
        const next = data.permissions.includes(key)
            ? data.permissions.filter((p) => p !== key)
            : [...data.permissions, key];
        setData('permissions', next);
    };

    const moduleKeys = (module: string, group: PermissionGroup) =>
        Object.keys(group.actions).map((a) => `${module}.${a}`);

    const isModuleAllChecked = (module: string, group: PermissionGroup) =>
        moduleKeys(module, group).every((k) => data.permissions.includes(k));

    const toggleModule = (module: string, group: PermissionGroup) => {
        const keys = moduleKeys(module, group);
        const allChecked = isModuleAllChecked(module, group);
        const next = allChecked
            ? data.permissions.filter((p) => !keys.includes(p))
            : Array.from(new Set([...data.permissions, ...keys]));
        setData('permissions', next);
    };

    const permissionsError =
        errors.permissions ||
        Object.entries(errors)
            .find(([k]) => k.startsWith('permissions.'))?.[1];

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? 'Edit Role' : 'Tambah Role'} />

            <div className="max-w-3xl mx-auto">
                <Breadcrumb
                    items={[
                        { label: 'Pengaturan' },
                        { label: 'Role', href: '/pengaturan/role' },
                        { label: isEdit ? 'Edit' : 'Tambah' },
                    ]}
                />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Edit Role' : 'Tambah Role'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Tentukan permission secara granular per modul.
                    </p>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-6">
                            <FormField label="Nama Role" error={errors.name} required>
                                <Input
                                    placeholder="Contoh: Akuntan, Kasir, Manajer Cabang"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                            </FormField>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-foreground">
                                        Permission
                                        <span className="ml-0.5 text-destructive">*</span>
                                    </label>
                                    <span className="text-xs text-gray-500">
                                        {data.permissions.length} dipilih
                                    </span>
                                </div>

                                <div className="border border-input rounded-md divide-y">
                                    {Object.entries(permissionGroups).map(([module, group]) => {
                                        const allChecked = isModuleAllChecked(module, group);
                                        return (
                                            <div key={module} className="p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="text-sm font-semibold text-gray-800">
                                                        {group.label}
                                                    </h3>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleModule(module, group)}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        {allChecked ? 'Hapus semua' : 'Pilih semua'}
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                                    {Object.entries(group.actions).map(
                                                        ([action, label]) => {
                                                            const key = `${module}.${action}`;
                                                            const checked =
                                                                data.permissions.includes(key);
                                                            return (
                                                                <label
                                                                    key={key}
                                                                    className="flex items-center gap-2 text-sm cursor-pointer select-none"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() =>
                                                                            togglePermission(key)
                                                                        }
                                                                        className="w-4 h-4"
                                                                    />
                                                                    <span>{label}</span>
                                                                </label>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {permissionsError && (
                                    <p className="text-xs text-destructive">{permissionsError}</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={processing}>
                                    {isEdit ? 'Simpan Perubahan' : 'Tambah Role'}
                                </Button>
                                <Link href="/pengaturan/role">
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
