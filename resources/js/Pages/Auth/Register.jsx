import { Head, Link, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock, User } from 'lucide-react';
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
                        <Input
                            type="text"
                            label="Nama Lengkap"
                            placeholder="Masukkan nama lengkap"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            isInvalid={!!errors.name}
                            errorMessage={errors.name}
                            prefix={<User size={18} />}
                            isRequired
                        />

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
                            placeholder="Minimal 8 karakter"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            isInvalid={!!errors.password}
                            errorMessage={errors.password}
                            prefix={<Lock size={18} />}
                            isRequired
                        />

                        <Input
                            type="password"
                            label="Konfirmasi Password"
                            placeholder="Ulangi password"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            isInvalid={!!errors.password_confirmation}
                            errorMessage={errors.password_confirmation}
                            prefix={<Lock size={18} />}
                            isRequired
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={processing}
                        >
                            Daftar
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Sudah punya akun?{' '}
                        <Link
                            href="/login"
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Masuk di sini
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
