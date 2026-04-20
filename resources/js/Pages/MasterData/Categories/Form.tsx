import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface Account {
    id: number;
    code: string;
    name: string;
}

interface Category {
    id: number;
    account_id: number;
    name: string;
    type: 'income' | 'expense';
    description: string;
}

interface FormProps {
    category?: Category;
    revenueAccounts: Account[];
    expenseAccounts: Account[];
}

export default function Form({ category, revenueAccounts, expenseAccounts }: FormProps) {
    const isEdit = !!category;

    const { data, setData, post, put, processing, errors } = useForm({
        account_id: category?.account_id || '',
        name: category?.name || '',
        type: category?.type || 'income',
        description: category?.description || '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isEdit) {
            put(`/master/kategori/${category.id}`);
        } else {
            post('/master/kategori');
        }
    };

    const accounts = data.type === 'income' ? revenueAccounts : expenseAccounts;

    return (
        <AuthenticatedLayout>
            <Head title={isEdit ? 'Edit Kategori' : 'Tambah Kategori'} />

            <Breadcrumb items={[
                { label: 'Master Data' },
                { label: 'Kategori', href: '/master/kategori' },
                { label: isEdit ? 'Edit' : 'Tambah' },
            ]} />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
                </h1>
            </div>

            <Card className="max-w-2xl">
                <CardContent className="p-6">
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                                Jenis Kategori <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 ${
                                    data.type === 'income' 
                                        ? 'border-green-500 bg-green-50' 
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="income"
                                        checked={data.type === 'income'}
                                        onChange={(e) => {
                                            setData('type', e.target.value as 'income' | 'expense');
                                            setData('account_id', '');
                                        }}
                                        className="sr-only"
                                    />
                                    <TrendingUp size={20} className={data.type === 'income' ? 'text-green-600' : 'text-gray-400'} />
                                    <span className={data.type === 'income' ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                        Pemasukan
                                    </span>
                                </label>
                                <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 ${
                                    data.type === 'expense' 
                                        ? 'border-red-500 bg-red-50' 
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="expense"
                                        checked={data.type === 'expense'}
                                        onChange={(e) => {
                                            setData('type', e.target.value as 'income' | 'expense');
                                            setData('account_id', '');
                                        }}
                                        className="sr-only"
                                    />
                                    <TrendingDown size={20} className={data.type === 'expense' ? 'text-red-600' : 'text-gray-400'} />
                                    <span className={data.type === 'expense' ? 'text-red-700 font-medium' : 'text-gray-600'}>
                                        Pengeluaran
                                    </span>
                                </label>
                            </div>
                            {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                        </div>

                        <FormField label="Nama Kategori" required error={errors.name}>
                            <Input
                                placeholder={data.type === 'income' ? 'Contoh: Penjualan Produk' : 'Contoh: Biaya Listrik'}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                aria-invalid={!!errors.name}
                            />
                        </FormField>

                        <FormField
                            label="Akun Buku Besar"
                            required
                            error={errors.account_id}
                            hint="Transaksi dengan kategori ini akan dicatat ke akun yang dipilih"
                        >
                            <select
                                value={data.account_id}
                                onChange={(e) => setData('account_id', e.target.value)}
                                className={`h-8 w-full min-w-0 rounded-none border bg-transparent px-2.5 py-1 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 ${errors.account_id ? 'border-destructive' : 'border-input'}`}
                            >
                                <option value="">-- Pilih Akun --</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Keterangan" error={errors.description} hint="Opsional – penjelasan singkat kategori ini">
                            <Textarea
                                placeholder="Deskripsi singkat tentang kategori ini"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                aria-invalid={!!errors.description}
                            />
                        </FormField>

                        <div className="flex gap-3 pt-4">
                            <Button type="submit" disabled={processing}>
                                {isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
                            </Button>
                            <Link href="/master/kategori">
                                <Button type="button" variant="outline">
                                    Batal
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </AuthenticatedLayout>
    );
}
