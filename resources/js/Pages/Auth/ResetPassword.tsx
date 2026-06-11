import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import GuestLayout from '@/Layouts/GuestLayout';

type ResetPasswordProps = {
    token: string;
    email: string;
};

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/reset-password');
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <Card className="shadow-lg">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold text-center mb-6">
                        Reset Password
                    </h2>

                    <form onSubmit={submit} className="space-y-4">
                        <input type="hidden" value={data.token} readOnly />

                        <FormField label="Email" required error={errors.email}>
                            <Input
                                type="email"
                                placeholder="nama@email.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                aria-invalid={!!errors.email}
                            />
                        </FormField>

                        <FormField label="Password Baru" required error={errors.password}>
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
                                placeholder="Ulangi password baru"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                aria-invalid={!!errors.password_confirmation}
                            />
                        </FormField>

                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan Password Baru'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Kembali ke{' '}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            halaman masuk
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
