import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <AuthLayout
            title="Selamat Datang"
            description="Masukkan email dan kata sandi Anda untuk masuk ke sistem"
        >
            <Head title="Masuk" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-8 py-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="ml-1 text-slate-600 font-bold text-xs uppercase tracking-wider">Alamat Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="nama@email.com"
                                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:ring-blue-500 px-4"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" className="text-slate-600 font-bold text-xs uppercase tracking-wider">Kata Sandi</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs font-bold text-blue-600"
                                            tabIndex={5}
                                        >
                                            Lupa kata sandi?
                                        </TextLink>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:ring-blue-500 px-4"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3 ml-1">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                                />
                                <Label htmlFor="remember" className="text-sm text-slate-500 font-medium">Ingat saya</Label>
                            </div>

                            <Button
                                type="submit"
                                className="h-14 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner className="mr-2 h-5 w-5" />}
                                Masuk Sekarang
                            </Button>
                        </div>

                        {canRegister && (
                            <div className="text-center text-sm text-slate-500">
                                Belum punya akun?{' '}
                                <TextLink href={register()} tabIndex={5} className="font-bold text-blue-600">
                                    Daftar Gratis
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-4 p-4 rounded-xl bg-green-50 text-center text-sm font-semibold text-green-700 border border-green-100 italic">
                    {status}
                </div>
            )}
        </AuthLayout>
    );
}
