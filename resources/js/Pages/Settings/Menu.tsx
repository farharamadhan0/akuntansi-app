import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SlidersHorizontal, Check, Lock } from 'lucide-react';
import {
    getConfigurableMenuGroups,
    DEFAULT_MENU_KEYS,
} from '@/lib/navigation.config';

interface Props {
    enabledMenus: string[] | null;
}

type FormShape = {
    enabled_menus: string[];
};

export default function Menu({ enabledMenus }: Props) {
    const groups = getConfigurableMenuGroups();

    // Hanya simpan menu non-default yang diaktifkan.
    const initialEnabled = (enabledMenus ?? []).filter(
        (id) => !DEFAULT_MENU_KEYS.includes(id),
    );

    const { data, setData, put, processing } = useForm<FormShape>({
        enabled_menus: initialEnabled,
    });

    const isOn = (id: string, isDefault: boolean) =>
        isDefault || data.enabled_menus.includes(id);

    const toggle = (id: string, isDefault: boolean) => {
        if (isDefault) return;
        const next = data.enabled_menus.includes(id)
            ? data.enabled_menus.filter((m) => m !== id)
            : [...data.enabled_menus, id];
        setData('enabled_menus', next);
    };

    const toggleGroupAll = (
        items: { id: string; isDefault: boolean }[],
        turnOn: boolean,
    ) => {
        const optional = items.filter((i) => !i.isDefault).map((i) => i.id);
        const next = turnOn
            ? Array.from(new Set([...data.enabled_menus, ...optional]))
            : data.enabled_menus.filter((m) => !optional.includes(m));
        setData('enabled_menus', next);
    };

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        put('/pengaturan/fitur', { preserveScroll: true });
    };

    const totalOptional = groups.reduce(
        (sum, g) => sum + g.items.filter((i) => !i.isDefault).length,
        0,
    );

    return (
        <AuthenticatedLayout>
            <Head title="Fitur Aplikasi" />

            <div className="max-w-3xl mx-auto">
                <Breadcrumb
                    items={[
                        { label: 'Pengaturan' },
                        { label: 'Fitur Aplikasi' },
                    ]}
                />

                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                        <SlidersHorizontal size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Fitur Aplikasi
                        </h1>
                        <p className="text-sm text-gray-500">
                            Atur fitur dan menu yang ingin ditampilkan sesuai kebutuhan bisnis Anda.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <Card>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                                    {data.enabled_menus.length} / {totalOptional} aktif
                                </span>
                            </div>

                            <div className="space-y-3">
                                {groups.map((group) => {
                                    const optionalItems = group.items.filter((i) => !i.isDefault);
                                    const allOptionalOn =
                                        optionalItems.length > 0 &&
                                        optionalItems.every((i) =>
                                            data.enabled_menus.includes(i.id),
                                        );
                                    const someOptionalOn = optionalItems.some((i) =>
                                        data.enabled_menus.includes(i.id),
                                    );

                                    return (
                                        <div
                                            key={group.key}
                                            className={`rounded-lg border transition-colors ${
                                                someOptionalOn
                                                    ? 'border-blue-200 bg-blue-50/30'
                                                    : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-inherit">
                                                <span className="text-sm font-medium text-gray-800">
                                                    {group.label}
                                                </span>
                                                {optionalItems.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleGroupAll(group.items, !allOptionalOn)
                                                        }
                                                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                                    >
                                                        {allOptionalOn ? 'Matikan semua' : 'Aktifkan semua'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-x divide-gray-100">
                                                {group.items.map((item) => {
                                                    const on = isOn(item.id, item.isDefault);
                                                    return (
                                                        <label
                                                            key={item.id}
                                                            className={`flex items-center gap-2.5 px-3 py-2.5 select-none transition-colors ${
                                                                item.isDefault
                                                                    ? 'text-gray-500 cursor-not-allowed bg-gray-50/60'
                                                                    : on
                                                                    ? 'bg-blue-50/60 text-blue-800 cursor-pointer'
                                                                    : 'text-gray-600 hover:bg-gray-50 cursor-pointer'
                                                            }`}
                                                            title={
                                                                item.isDefault
                                                                    ? 'Fitur wajib, selalu aktif'
                                                                    : undefined
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={on}
                                                                disabled={item.isDefault}
                                                                onChange={() =>
                                                                    toggle(item.id, item.isDefault)
                                                                }
                                                                className="sr-only"
                                                            />
                                                            <div
                                                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                                    on
                                                                        ? item.isDefault
                                                                            ? 'bg-gray-300 border-gray-300'
                                                                            : 'bg-blue-600 border-blue-600'
                                                                        : 'border-gray-300 bg-white'
                                                                }`}
                                                            >
                                                                {on && (
                                                                    <Check
                                                                        size={10}
                                                                        className="text-white"
                                                                        strokeWidth={3}
                                                                    />
                                                                )}
                                                            </div>
                                                            <span className="text-sm flex items-center gap-1.5">
                                                                {item.label}
                                                                {item.isDefault && (
                                                                    <Lock size={11} className="text-gray-400" />
                                                                )}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center gap-3 pt-1 pb-4">
                        <Button type="submit" disabled={processing}>
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
