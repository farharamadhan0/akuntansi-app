import { Head, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Mail, Phone, FileText } from 'lucide-react';
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

    const submit = (e) => {
        e.preventDefault();
        post('/company/setup');
    };

    return (
        <GuestLayout>
            <Head title="Buat Usaha" />

            <Card className="shadow-lg">
                <CardContent className="p-8">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
                            <Building2 className="text-primary-600" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Buat Usaha Baru</h2>
                        <p className="text-gray-600 mt-1">
                            Isi data usaha untuk mulai mencatat keuangan
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <Input
                            type="text"
                            label="Nama Usaha"
                            placeholder="Contoh: Toko Berkah Jaya"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            isInvalid={!!errors.name}
                            errorMessage={errors.name}
                            prefix={<Building2 size={18} />}
                            isRequired
                        />

                        <Input
                            type="text"
                            label="Nama Badan Hukum (Opsional)"
                            placeholder="Contoh: PT Berkah Jaya Indonesia"
                            value={data.legal_name}
                            onChange={(e) => setData('legal_name', e.target.value)}
                            isInvalid={!!errors.legal_name}
                            errorMessage={errors.legal_name}
                        />

                        <Input
                            type="text"
                            label="NPWP (Opsional)"
                            placeholder="00.000.000.0-000.000"
                            value={data.tax_id}
                            onChange={(e) => setData('tax_id', e.target.value)}
                            isInvalid={!!errors.tax_id}
                            errorMessage={errors.tax_id}
                            prefix={<FileText size={18} />}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                type="tel"
                                label="Telepon (Opsional)"
                                placeholder="08xxxxxxxxxx"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                isInvalid={!!errors.phone}
                                errorMessage={errors.phone}
                                prefix={<Phone size={18} />}
                            />

                            <Input
                                type="email"
                                label="Email Usaha (Opsional)"
                                placeholder="usaha@email.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                isInvalid={!!errors.email}
                                errorMessage={errors.email}
                                prefix={<Mail size={18} />}
                            />
                        </div>

                        <Textarea
                            label="Alamat (Opsional)"
                            placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            isInvalid={!!errors.address}
                            errorMessage={errors.address}
                        />

                        <Button
                            type="submit"
                            className="w-full mt-6"
                            size="lg"
                            isLoading={processing}
                        >
                            Mulai Gunakan Aplikasi
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
