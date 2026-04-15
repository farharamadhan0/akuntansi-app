import { Head, Link, useForm } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Form({ category, revenueAccounts, expenseAccounts }) {
    const isEdit = !!category;

    const { data, setData, post, put, processing, errors } = useForm({
        account_id: category?.account_id || '',
        name: category?.name || '',
        type: category?.type || 'income',
        description: category?.description || '',
    });

    const submit = (e) => {
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

            <div className="mb-6">
                <Link href="/master/kategori" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft size={18} className="mr-1" />
                    Kembali
                </Link>
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
                                            setData('type', e.target.value);
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
                                            setData('type', e.target.value);
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

                        <Input
                            label="Nama Kategori"
                            placeholder={data.type === 'income' ? 'Contoh: Penjualan Produk' : 'Contoh: Biaya Listrik'}
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            isInvalid={!!errors.name}
                            errorMessage={errors.name}
                            isRequired
                        />

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                                Akun Buku Besar <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={data.account_id}
                                onChange={(e) => setData('account_id', e.target.value)}
                                className={`w-full h-10 px-3 rounded-md border ${errors.account_id ? 'border-red-500' : 'border-gray-300'} bg-white focus:outline-none focus:ring-2 focus:ring-primary-500`}
                            >
                                <option value="">Pilih akun...</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                            {errors.account_id && <p className="text-sm text-red-500">{errors.account_id}</p>}
                            <p className="text-xs text-gray-500">
                                Transaksi dengan kategori ini akan dicatat ke akun yang dipilih
                            </p>
                        </div>

                        <Textarea
                            label="Keterangan (Opsional)"
                            placeholder="Deskripsi singkat tentang kategori ini"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            isInvalid={!!errors.description}
                            errorMessage={errors.description}
                        />

                        <div className="flex gap-3 pt-4">
                            <Button type="submit" isLoading={processing}>
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
