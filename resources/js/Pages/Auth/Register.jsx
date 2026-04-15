import { Head, Link, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register');
    };

    return (
        <GuestLayout>
            <Head title="Daftar" />

            <Card className="shadow-lg">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold text-center mb-6">
                        Buat Akun Baru
                    </h2>

                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Nama Lengkap" required error={errors.name}>
                            <Input
                                type="text"
                                placeholder="Masukkan nama lengkap"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                aria-invalid={!!errors.name}
                            />
                        </FormField>

                        <FormField label="Email" required error={errors.email}>
                            <Input
                                type="email"
                                placeholder="nama@email.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                aria-invalid={!!errors.email}
                            />
                        </FormField>

                        <FormField label="Password" required error={errors.password}>
                            <Input
                                type="password"
                                placeholder="Minimal 8 karakter"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                aria-invalid={!!errors.password}
                            />
                        </FormField>

                        <FormField label="Konfirmasi Password" required error={errors.password_confirmation}>
                            <Input
                                type="password"
                                placeholder="Ulangi password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                aria-invalid={!!errors.password_confirmation}
                            />
                        </FormField>

                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? 'Memproses...' : 'Daftar'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Sudah punya akun?{' '}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            Masuk di sini
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
