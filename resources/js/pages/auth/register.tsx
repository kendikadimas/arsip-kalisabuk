import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function Register() {
    return (
        <AuthLayout
            title="Daftar Akun Baru"
            description="Silakan isi data diri Anda di bawah ini untuk mulai menggunakan layanan kami"
        >
            <Head title="Daftar" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-8 py-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="ml-1 text-slate-600 font-bold text-xs uppercase tracking-wider">Nama Lengkap</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Contoh: Budi Santoso"
                                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:ring-blue-500 px-4"
                                />
                                <InputError
                                    message={errors.name}
                                    className="mt-2"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="ml-1 text-slate-600 font-bold text-xs uppercase tracking-wider">Alamat Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="nama@email.com"
                                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:ring-blue-500 px-4"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="ml-1 text-slate-600 font-bold text-xs uppercase tracking-wider">Kata Sandi</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Minimal 8 karakter"
                                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:ring-blue-500 px-4"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation" className="ml-1 text-slate-600 font-bold text-xs uppercase tracking-wider">Konfirmasi Kata Sandi</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Ketik ulang kata sandi"
                                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:ring-blue-500 px-4"
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="h-14 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] mt-2"
                                tabIndex={5}
                                data-test="register-user-button"
                                disabled={processing}
                            >
                                {processing && <Spinner className="mr-2 h-5 w-5" />}
                                Daftarkan Sekarang
                            </Button>
                        </div>

                        <div className="text-center text-sm text-slate-500">
                            Sudah punya akun?{' '}
                            <TextLink href={login()} tabIndex={6} className="font-bold text-blue-600">
                                Masuk di sini
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
