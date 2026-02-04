import { Head, Link } from '@inertiajs/react';
import { Archive, Cloud } from 'lucide-react';
import { login, register } from '@/routes';

export default function Welcome() {
    return (
        <>
            <Head title="Selamat Datang di Sistem Arsip Digital Desa" />

            <div className="flex min-h-screen items-center justify-center bg-gray-100 p-0 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-6 font-sans">

                {/* Mobile Frame (Desktop: Phone Mockup, Mobile: Full Screen) */}
                <div className="relative flex h-screen w-full flex-col justify-between overflow-hidden bg-white sm:h-[844px] sm:max-w-[390px] sm:rounded-[3rem] sm:shadow-2xl sm:ring-8 sm:ring-slate-950/5 dark:bg-slate-900 transition-all duration-300">

                    {/* Abstract Illustration Section */}
                    <div className="relative flex h-[60%] w-full items-center justify-center px-6 pt-12 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                        {/* Background Blobs */}
                        <div className="absolute top-[-10%] left-[-20%] h-64 w-64 rounded-full bg-blue-100 dark:bg-blue-900/20 blur-3xl animate-blob" />
                        <div className="absolute bottom-[10%] right-[-10%] h-64 w-64 rounded-full bg-cyan-100 dark:bg-cyan-900/20 blur-3xl animate-blob animation-delay-2000" />

                        {/* Composition */}
                        <div className="relative z-10 w-full max-w-[280px] aspect-square">
                            {/* Main Folder */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-40 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-2xl shadow-blue-900/30 transform -rotate-12 z-20 flex items-center justify-center transition-transform hover:scale-105 duration-500">
                                <div className="absolute inset-x-0 top-0 h-4 bg-white/20 rounded-t-2xl" />
                                <Archive className="text-white/90 w-16 h-16 drop-shadow-md" strokeWidth={1.5} />
                            </div>

                            {/* Floating Paper/File */}
                            <div className="absolute top-1/3 right-[5%] w-32 h-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 transform rotate-12 z-10 opacity-95 backdrop-blur-sm transition-transform hover:rotate-6 duration-500">
                                <div className="p-4 space-y-3">
                                    <div className="h-2 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-full" />
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full" />
                                    <div className="h-2 w-5/6 bg-slate-100 dark:bg-slate-700 rounded-full" />
                                    <div className="h-2 w-4/6 bg-slate-100 dark:bg-slate-700 rounded-full" />
                                </div>
                            </div>

                            {/* Floating Cloud */}
                            <div className="absolute bottom-[15%] left-[-5%] z-30 animate-pulse-slow">
                                <Cloud className="text-white fill-blue-50 dark:text-slate-700 dark:fill-slate-800 w-24 h-24 drop-shadow-xl" strokeWidth={1} />
                            </div>

                            {/* Floating Cloud Small */}
                            <div className="absolute top-[10%] right-0 z-0 opacity-60">
                                <Cloud className="text-blue-200 fill-blue-50 dark:text-blue-900 dark:fill-blue-900 w-14 h-14" strokeWidth={1} />
                            </div>

                            {/* Deco Lines */}
                            <div className="absolute top-1/2 left-[-15%] w-24 h-[2px] bg-gradient-to-r from-transparent to-blue-200 dark:to-blue-800 rotate-12" />
                            <div className="absolute bottom-[20%] right-[-15%] w-16 h-[2px] bg-gradient-to-l from-transparent to-blue-200 dark:to-blue-800 -rotate-12" />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col px-8 pb-12 pt-8 z-20 bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] -mt-10">
                        {/* Logo Small */}
                        {/* <div className="mb-6 flex items-center gap-2 self-start">
                            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                                <Archive className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white tracking-tight text-lg">Sistem Arsip Digital Desa</span>
                        </div> */}

                        <h1 className="text-[2.5rem] font-extrabold text-slate-900 dark:text-white leading-[1.1] mb-4 tracking-tight">
                            Sistem Arsip<br />
                            <span className="text-blue-600">Digital Desa.</span>
                        </h1>

                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed text-base">
                            Penyimpanan aman yang memudahkan administrasi desa Anda.
                        </p>

                        <div className="space-y-4 mt-auto">
                            <Link
                                href={register().url}
                                className="flex w-full items-center justify-center rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-bold h-14 text-lg shadow-xl shadow-slate-900/20 dark:shadow-blue-900/20 transition-all active:scale-95 hover:bg-slate-800 dark:hover:bg-blue-500"
                            >
                                Mulai Sekarang
                            </Link>

                            <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                Sudah punya akun?
                                <Link
                                    href={login().url}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-colors"
                                >
                                    Masuk
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                 @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animate-pulse-slow {
                    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </>
    );
}
