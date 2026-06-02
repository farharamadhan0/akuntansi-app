import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Building2, SlidersHorizontal, Check, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';
import {
    getConfigurableMenuGroups,
    DEFAULT_MENU_KEYS,
} from '@/lib/navigation.config';

export default function Setup() {
    const [step, setStep] = useState<1 | 2>(1);
    const groups = getConfigurableMenuGroups();

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        legal_name: '',
        tax_id: '',
        address: '',
        phone: '',
        email: '',
        enabled_menus: [] as string[],
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

    const handleNext = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!data.name.trim()) return;
        setStep(2);
    };

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/company/setup');
    };

    const totalOptional = groups.reduce(
        (sum, g) => sum + g.items.filter((i) => !i.isDefault).length,
        0,
    );

    return (
        <GuestLayout>
            <Head title="Buat Usaha" />

            <Card className="shadow-lg">
                <CardContent className="p-8">
                    {/* Step indicator */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                                step === 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
                            }`}>
                                {step === 2 ? <Check size={14} strokeWidth={3} /> : '1'}
                            </div>
                            <span className={`text-xs font-medium ${step === 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                                Data Usaha
                            </span>
                        </div>
                        <div className="w-8 h-px bg-gray-200" />
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                                step === 2 ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-400'
                            }`}>
                                2
                            </div>
                            <span className={`text-xs font-medium ${step === 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                                Pilih Fitur
                            </span>
                        </div>
                    </div>

                    {/* Step 1: Company info */}
                    {step === 1 && (
                        <>
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                                    <Building2 className="text-primary" size={24} />
                                </div>
                                <h2 className="text-2xl font-bold">Buat Usaha Baru</h2>
                                <p className="text-muted-foreground mt-1">
                                    Lengkapi data usaha Anda untuk mulai mencatat keuangan
                                </p>
                            </div>

                            <form onSubmit={handleNext} className="space-y-4">
                                <FormField label="Nama Usaha" required error={errors.name}>
                                    <Input
                                        type="text"
                                        placeholder="Contoh: Toko Berkah Jaya"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        aria-invalid={!!errors.name}
                                        autoFocus
                                    />
                                </FormField>

                                <FormField label="Nama Badan Hukum (Opsional)" error={errors.legal_name}>
                                    <Input
                                        type="text"
                                        placeholder="Contoh: PT Berkah Jaya Indonesia"
                                        value={data.legal_name}
                                        onChange={(e) => setData('legal_name', e.target.value)}
                                        aria-invalid={!!errors.legal_name}
                                    />
                                </FormField>

                                <FormField label="NPWP (Opsional)" error={errors.tax_id} hint="Nomor Pokok Wajib Pajak usaha Anda">
                                    <Input
                                        type="text"
                                        placeholder="00.000.000.0-000.000"
                                        value={data.tax_id}
                                        onChange={(e) => setData('tax_id', e.target.value)}
                                        aria-invalid={!!errors.tax_id}
                                    />
                                </FormField>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField label="Telepon (Opsional)" error={errors.phone}>
                                        <Input
                                            type="tel"
                                            placeholder="08xxxxxxxxxx"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            aria-invalid={!!errors.phone}
                                        />
                                    </FormField>

                                    <FormField label="Email Usaha (Opsional)" error={errors.email}>
                                        <Input
                                            type="email"
                                            placeholder="usaha@email.com"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            aria-invalid={!!errors.email}
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Alamat (Opsional)" error={errors.address}>
                                    <Textarea
                                        placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        aria-invalid={!!errors.address}
                                    />
                                </FormField>

                                <Button type="submit" className="w-full mt-6" size="lg" disabled={!data.name.trim()}>
                                    Lanjut Pilih Fitur <ArrowRight size={16} className="ml-1" />
                                </Button>
                            </form>
                        </>
                    )}

                    {/* Step 2: Feature selection */}
                    {step === 2 && (
                        <>
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 border border-blue-100 mb-4">
                                    <SlidersHorizontal className="text-blue-500" size={22} />
                                </div>
                                <h2 className="text-2xl font-bold">Pilih Fitur Usaha</h2>
                                <p className="text-muted-foreground mt-1">
                                    Aktifkan fitur yang sesuai dengan kebutuhan usaha <span className="font-medium text-gray-700">{data.name}</span>
                                </p>
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-gray-500">Fitur berlambang <Lock size={10} className="inline mx-0.5" /> selalu aktif dan tidak dapat dinonaktifkan.</p>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1 shrink-0">
                                        {data.enabled_menus.filter(m => !DEFAULT_MENU_KEYS.includes(m)).length} / {totalOptional} aktif
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {groups.map((group) => {
                                        const optionalItems = group.items.filter((i) => !i.isDefault);
                                        const allOptionalOn =
                                            optionalItems.length > 0 &&
                                            optionalItems.every((i) => data.enabled_menus.includes(i.id));
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
                                                                    onChange={() => toggle(item.id, item.isDefault)}
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

                                <div className="flex gap-3 mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        className="flex-1"
                                        onClick={() => setStep(1)}
                                        disabled={processing}
                                    >
                                        <ArrowLeft size={16} className="mr-1" /> Kembali
                                    </Button>
                                    <Button type="submit" size="lg" className="flex-1" disabled={processing}>
                                        {processing ? 'Memproses...' : 'Mulai Gunakan Aplikasi'}
                                    </Button>
                                </div>
                            </form>
                        </>
                    )}
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
