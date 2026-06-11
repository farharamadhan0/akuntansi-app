import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import GuestLayout from '@/Layouts/GuestLayout';

export default function ForgotPassword() {
    const { flash } = usePage<{ flash: { status?: string } }>().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/forgot-password');
    };

    return (
        <GuestLayout>
            <Head title="Lupa Password" />

            <Card className="shadow-lg">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold text-center mb-3">
                        Lupa Password
                    </h2>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                        Masukkan email akun kamu untuk menerima link reset password.
                    </p>

                    {flash?.status && (
                        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700 text-center">
                            {flash.status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Email" required error={errors.email}>
                            <Input
                                type="email"
                                placeholder="nama@email.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                aria-invalid={!!errors.email}
                            />
                        </FormField>

                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? 'Mengirim...' : 'Kirim Link Reset'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Ingat password?{' '}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            Masuk di sini
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
