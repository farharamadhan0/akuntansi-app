import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Login() {
    const { flash } = usePage<{ flash: { status?: string } }>().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <GuestLayout>
            <Head title="Masuk" />

            <Card className="shadow-lg">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold text-center mb-6">
                        Masuk ke Akun
                    </h2>

                    {flash?.status === 'email-verified' && (
                        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700 text-center">
                            Email kamu berhasil diverifikasi. Silakan masuk.
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

                        <FormField label="Password" required error={errors.password}>
                            <Input
                                type="password"
                                placeholder="Masukkan password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                aria-invalid={!!errors.password}
                            />
                        </FormField>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="remember"
                                checked={data.remember}
                                onCheckedChange={(checked) => setData('remember', checked)}
                            />
                            <label htmlFor="remember" className="text-xs cursor-pointer">
                                Ingat saya
                            </label>
                        </div>

                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? 'Memproses...' : 'Masuk'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Belum punya akun?{' '}
                        <Link href="/register" className="text-primary font-medium hover:underline">
                            Daftar sekarang
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
