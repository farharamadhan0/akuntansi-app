import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Building2 } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Setup() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        legal_name: '',
        tax_id: '',
        address: '',
        phone: '',
        email: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/company/setup');
    };

    return (
        <GuestLayout>
            <Head title="Buat Usaha" />

            <Card className="shadow-lg">
                <CardContent className="p-8">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                            <Building2 className="text-primary" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Buat Usaha Baru</h2>
                        <p className="text-muted-foreground mt-1">
                            Lengkapi data usaha Anda untuk mulai mencatat keuangan
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Nama Usaha" required error={errors.name}>
                            <Input
                                type="text"
                                placeholder="Contoh: Toko Berkah Jaya"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                aria-invalid={!!errors.name}
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

                        <Button type="submit" className="w-full mt-6" size="lg" disabled={processing}>
                            {processing ? 'Memproses...' : 'Mulai Gunakan Aplikasi'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
