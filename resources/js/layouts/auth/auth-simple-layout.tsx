import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import { Archive } from 'lucide-react';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-0 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-6 font-sans">

            {/* Mobile Frame Container */}
            <div className="relative flex h-screen w-full flex-col bg-white sm:h-[844px] sm:max-w-[390px] sm:rounded-[3rem] sm:shadow-2xl sm:ring-8 sm:ring-slate-950/5 dark:bg-slate-900 overflow-y-auto no-scrollbar">

                <div className="flex flex-col gap-6 p-8 pt-12 h-full">
                    {/* Header */}
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium transition-transform hover:scale-105"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
                                <Archive className="h-6 w-6 text-white" />
                            </div>
                            <span className="sr-only">ArsipDesa</span>
                        </Link>

                        <div className="space-y-1 text-center">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
                            <p className="text-center text-sm text-slate-500 dark:text-slate-400 max-w-[250px] mx-auto leading-relaxed">
                                {description}
                            </p>
                        </div>
                    </div>

                    {/* Content / Form */}
                    <div className="flex-1 flex flex-col justify-center">
                        {children}
                    </div>

                    {/* Footer decoration or simplified footer */}
                    <div className="mt-auto pt-4 text-center">
                        <p className="text-xs text-slate-400">
                            &copy; {new Date().getFullYear()} ArsipDesa
                        </p>
                    </div>
                </div>
            </div>
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
