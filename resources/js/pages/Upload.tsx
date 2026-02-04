import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Category } from '@/types';
import { FileText, ChevronLeft, Upload as UploadIcon, X, Check, Loader2, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/dashboard' },
    { title: 'Upload Dokumen', href: '/upload' },
];

export default function Upload({ categories = [] }: { categories: Category[] }) {
    const [file, setFile] = useState<File | null>(null);
    const [stage, setStage] = useState<'select' | 'details' | 'uploading' | 'success'>('select');
    const [progress, setProgress] = useState(0);
    const [formData, setFormData] = useState({
        title: '',
        year: new Date().getFullYear().toString(),
        category_id: ''
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                alert('Hanya file PDF yang diperbolehkan.');
                return;
            }
            if (selectedFile.size > 10 * 1024 * 1024) {
                alert('Ukuran file melebihi batas 10MB.');
                return;
            }
            setFile(selectedFile);
            setFormData(prev => ({ ...prev, title: selectedFile.name.replace(/\.[^/.]+$/, "") }));
            setStage('details');
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setStage('uploading');

        const payload = new FormData();
        payload.append('file', file);
        payload.append('title', formData.title);
        payload.append('year', formData.year);
        payload.append('category_id', formData.category_id);

        try {
            await axios.post('/api/archives', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
                    setProgress(percentCompleted);
                }
            });
            setStage('success');
        } catch (error: any) {
            console.error(error);
            let msg = 'Upload gagal. Pastikan ukuran file tidak melebihi batas dan coba lagi.';

            if (error.response && error.response.data) {
                if (error.response.data.message) {
                    msg = `Error: ${error.response.data.message}`;
                    if (error.response.data.errors) {
                        const firstError = Object.values(error.response.data.errors)[0];
                        if (Array.isArray(firstError)) msg += ` (${firstError[0]})`;
                    }
                } else if (error.response.data.error) {
                    msg = `Server Error: ${error.response.data.error}`;
                }
            }
            alert(msg);
            setStage('details');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Upload Dokumen" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full font-sans">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Upload Dokumen</h1>
                        <p className="text-sm md:text-base text-slate-500">Pilih berkas PDF untuk diarsipkan</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-6 mt-4">

                    {stage === 'select' && (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50 p-12 md:p-24 text-center group hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer relative overflow-hidden">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <UploadIcon className="h-10 w-10 md:h-16 md:w-16 text-slate-400 group-hover:text-blue-600" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Klik atau Seret Berkas</h3>
                            <p className="text-sm md:text-base text-slate-500 max-w-[300px] mx-auto">
                                Pastikan berkas berformat <strong>PDF</strong> dengan ukuran maksimal 10MB.
                            </p>
                        </div>
                    )}

                    {stage === 'details' && file && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                            {/* File Info Card */}
                            <div className="md:col-span-5 space-y-6">
                                <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2.5rem] relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-6">
                                            <FileText className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-bold text-blue-900 truncate pr-8" title={file.name}>{file.name}</h4>
                                            <p className="text-sm text-blue-600 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setFile(null); setStage('select'); }}
                                        className="absolute top-6 right-6 p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors z-20"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>

                                    {/* Decor */}
                                    <File className="absolute -right-8 -bottom-8 h-32 w-32 text-blue-200/30 -rotate-12 transition-transform group-hover:rotate-0 duration-700" />
                                </div>

                                <div className="hidden md:flex bg-amber-50 border border-amber-100 p-6 rounded-[2rem] gap-4">
                                    <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                                    <p className="text-sm text-amber-900 leading-relaxed font-medium">
                                        Pastikan dokumen sudah dalam kualitas yang baik agar mudah dibaca oleh sistem di masa mendatang.
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="md:col-span-7 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-6">
                                <div className="space-y-3">
                                    <Label htmlFor="title" className="text-slate-600 ml-2 font-bold text-sm">NAMA DOKUMEN</Label>
                                    <Input
                                        id="title"
                                        placeholder="Contoh: Akta Kelahiran Budi"
                                        className="rounded-2xl border-slate-200 h-14 text-lg px-6 focus:ring-blue-500 bg-slate-50 border-none"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="year" className="text-slate-600 ml-2 font-bold text-sm">TAHUN BERKAS</Label>
                                        <Input
                                            id="year"
                                            type="number"
                                            className="rounded-2xl border-slate-200 h-14 text-lg px-6 focus:ring-blue-500 bg-slate-50 border-none"
                                            value={formData.year}
                                            onChange={e => setFormData({ ...formData, year: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-slate-600 ml-2 font-bold text-sm">KATEGORI</Label>
                                        <Select
                                            value={formData.category_id}
                                            onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                                        >
                                            <SelectTrigger className="rounded-2xl border-slate-200 h-14 text-lg px-6 focus:ring-blue-500 bg-slate-50 border-none">
                                                <SelectValue placeholder="Pilih..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                {categories.map(c => (
                                                    <SelectItem key={c.id} value={c.id.toString()} className="rounded-xl">{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 rounded-[1.5rem] shadow-xl shadow-blue-600/20 font-bold text-xl mt-4 transition-transform active:scale-95"
                                    onClick={handleUpload}
                                    disabled={!formData.category_id || !formData.title}
                                >
                                    <UploadIcon className="mr-3 h-6 w-6" /> Unggah Sekarang
                                </Button>
                            </div>
                        </div>
                    )}

                    {stage === 'uploading' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="relative h-32 w-32 mb-8">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                                <div
                                    className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-blue-600">{progress}%</span>
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Mengirim Berkas</h2>
                            <p className="text-slate-500 max-w-[240px] mt-2">
                                Jangan tutup halaman ini sampai proses unggah selesai.
                            </p>
                        </div>
                    )}

                    {stage === 'success' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
                            <div className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 text-white">
                                <Check className="h-12 w-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Upload Berhasil!</h2>
                            <p className="text-slate-500 max-w-[240px] mt-2 mb-8">
                                Berkas telah disimpan di Google Drive Desa.
                            </p>
                            <div className="flex flex-col gap-3 w-full max-w-[200px] mx-auto">
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold h-12 shadow-lg"
                                    onClick={() => { setFile(null); setStage('select'); setProgress(0); }}
                                >
                                    Upload Lagi
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="text-slate-500 hover:text-slate-900"
                                    asChild
                                >
                                    <Link href="/dashboard">Ke Dashboard</Link>
                                </Button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Info Card */}
                {stage === 'select' && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-900 leading-relaxed">
                            Pastikan dokumen sudah dalam kualitas yang baik agar mudah dibaca oleh sistem di masa mendatang.
                        </p>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Nav Spacer */}
            <div className="h-20 md:hidden"></div>

        </AppLayout>
    );
}
