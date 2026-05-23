import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ShieldCheck, Check } from 'lucide-react';

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

    const isModuleSomeChecked = (module: string, group: PermissionGroup) =>
        moduleKeys(module, group).some((k) => data.permissions.includes(k));

    const toggleModule = (module: string, group: PermissionGroup) => {
        const keys = moduleKeys(module, group);
        const allChecked = isModuleAllChecked(module, group);
        const next = allChecked
            ? data.permissions.filter((p) => !keys.includes(p))
            : Array.from(new Set([...data.permissions, ...keys]));
        setData('permissions', next);
    };

    const totalPermissions = Object.values(permissionGroups).reduce(
        (sum, g) => sum + Object.keys(g.actions).length,
        0,
    );

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

                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                        <ShieldCheck size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            {isEdit ? 'Edit Role' : 'Tambah Role'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Tentukan permission secara granular per modul.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <Card>
                        <CardContent className="p-5">
                            <FormField label="Nama Role" error={errors.name} required>
                                <Input
                                    placeholder="Contoh: Akuntan, Kasir, Manajer Cabang"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                            </FormField>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-800">
                                        Permission
                                        <span className="ml-0.5 text-destructive">*</span>
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Pilih aksi yang diizinkan untuk setiap modul
                                    </p>
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                                    {data.permissions.length} / {totalPermissions}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {Object.entries(permissionGroups).map(([module, group]) => {
                                    const allChecked = isModuleAllChecked(module, group);
                                    const someChecked = isModuleSomeChecked(module, group);
                                    const checkedCount = moduleKeys(module, group).filter((k) =>
                                        data.permissions.includes(k),
                                    ).length;
                                    const totalCount = Object.keys(group.actions).length;

                                    return (
                                        <div
                                            key={module}
                                            className={`rounded-lg border transition-colors ${
                                                someChecked
                                                    ? 'border-blue-200 bg-blue-50/30'
                                                    : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-inherit">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleModule(module, group)}
                                                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                            allChecked
                                                                ? 'bg-blue-600 border-blue-600'
                                                                : someChecked
                                                                ? 'bg-blue-200 border-blue-400'
                                                                : 'border-gray-300 bg-white'
                                                        }`}
                                                    >
                                                        {allChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                                                        {someChecked && !allChecked && (
                                                            <span className="block w-2 h-0.5 bg-blue-600 rounded-full" />
                                                        )}
                                                    </button>
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {group.label}
                                                    </span>
                                                </div>
                                                <span className={`text-xs font-medium ${someChecked ? 'text-blue-600' : 'text-gray-400'}`}>
                                                    {checkedCount}/{totalCount}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 divide-x divide-y divide-gray-100">
                                                {Object.entries(group.actions).map(([action, label]) => {
                                                    const key = `${module}.${action}`;
                                                    const checked = data.permissions.includes(key);
                                                    return (
                                                        <label
                                                            key={key}
                                                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors ${
                                                                checked
                                                                    ? 'bg-blue-50/60 text-blue-800'
                                                                    : 'text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => togglePermission(key)}
                                                                className="sr-only"
                                                            />
                                                            <div
                                                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                                    checked
                                                                        ? 'bg-blue-600 border-blue-600'
                                                                        : 'border-gray-300 bg-white'
                                                                }`}
                                                            >
                                                                {checked && <Check size={9} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                            <span className="text-xs">{label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {permissionsError && (
                                <p className="text-xs text-destructive mt-3">{permissionsError}</p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center gap-3 pt-1 pb-4">
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
            </div>
        </AuthenticatedLayout>
    );
}
