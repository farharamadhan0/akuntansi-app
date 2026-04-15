import { Head, Link, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
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

                    <form onSubmit={submit} className="space-y-4">
                        <Input
                            type="email"
                            label="Email"
                            placeholder="nama@email.com"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            isInvalid={!!errors.email}
                            errorMessage={errors.email}
                            prefix={<Mail size={18} />}
                            isRequired
                        />

                        <Input
                            type="password"
                            label="Password"
                            placeholder="Masukkan password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            isInvalid={!!errors.password}
                            errorMessage={errors.password}
                            prefix={<Lock size={18} />}
                            isRequired
                        />

                        <div className="flex items-center justify-between">
                            <Checkbox
                                checked={data.remember}
                                onCheckedChange={(checked) => setData('remember', checked)}
                            >
                                Ingat saya
                            </Checkbox>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={processing}
                        >
                            Masuk
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Belum punya akun?{' '}
                        <Link
                            href="/register"
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Daftar sekarang
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
