import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GuestLayout from '@/Layouts/GuestLayout';

export default function VerifyEmail() {
    const { flash } = usePage<{ flash: { status?: string } }>().props;
    const { post, processing } = useForm({});
    const { post: logout, processing: loggingOut } = useForm({});

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/email/verification-notification');
    };

    const handleLogout = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        logout('/logout');
    };

    return (
        <GuestLayout>
            <Head title="Verifikasi Email" />

            <Card className="shadow-lg">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold text-center mb-4">
                        Verifikasi Email Kamu
                    </h2>

                    <p className="text-sm text-muted-foreground text-center mb-6">
                        Terima kasih sudah mendaftar! Sebelum melanjutkan, harap verifikasi email kamu
                        dengan mengklik link yang sudah kami kirimkan. Cek folder spam jika tidak menemukan emailnya.
                    </p>

                    {flash?.status === 'verification-link-sent' && (
                        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700 text-center">
                            Link verifikasi baru telah dikirim ke email kamu.
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing ? 'Mengirim...' : 'Kirim Ulang Email Verifikasi'}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <form onSubmit={handleLogout}>
                            <button
                                type="submit"
                                disabled={loggingOut}
                                className="text-sm text-muted-foreground hover:text-primary hover:underline disabled:opacity-50"
                            >
                                Keluar
                            </button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
