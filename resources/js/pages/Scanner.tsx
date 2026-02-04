import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, ChevronLeft, Loader2, X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/dashboard' },
    { title: 'Unggah Arsip', href: '/scanner' },
];

export default function Scanner({ categories = [] }: { categories: Category[] }) {
    // State
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Metadata State
    const [formData, setFormData] = useState({
        title: '',
        year: new Date().getFullYear().toString(),
        uploaded_at: new Date().toISOString().split('T')[0],
        category_id: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (selectedFile: File) => {
        // Allow PDF and Images
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

        // 10MB Limit
        if (selectedFile.size > 10 * 1024 * 1024) {
            setErrorMessage('Ukuran file melebihi batas 10MB.');
            return;
        }

        if (validTypes.includes(selectedFile.type)) {
            setFile(selectedFile);
            setErrorMessage('');
            // Auto-fill title if empty
            if (!formData.title) {
                const name = selectedFile.name.split('.').slice(0, -1).join('.');
                setFormData(prev => ({ ...prev, title: name }));
            }
        } else {
            setErrorMessage('Format file tidak didukung. Harap unggah PDF atau Gambar (JPG/PNG).');
        }
    };

    const handleUpload = async () => {
        if (!file || !formData.title || !formData.category_id) return;

        setIsUploading(true);
        setErrorMessage('');

        try {
            const payload = new FormData();
            payload.append('file', file);
            payload.append('title', formData.title);
            payload.append('year', formData.year);
            if (formData.uploaded_at) {
                payload.append('uploaded_at', formData.uploaded_at);
            }
            payload.append('category_id', formData.category_id);

            await axios.post('/api/archives', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setStatus('success');
            setFile(null);
            setFormData(prev => ({
                ...prev,
                title: '',
                year: prev.year // Keep year
            }));
        } catch (e: any) {
            console.error(e);
            setStatus('error');

            // Try to get specific error message from backend
            let msg = 'Gagal mengunggah file. Silakan coba lagi.';
            if (e.response && e.response.data) {
                if (e.response.data.message) {
                    msg = `Error: ${e.response.data.message}`;
                    // Laravel validation errors are often in 'errors' object
                    if (e.response.data.errors) {
                        const firstError = Object.values(e.response.data.errors)[0];
                        if (Array.isArray(firstError)) {
                            msg += ` (${firstError[0]})`;
                        }
                    }
                } else if (e.response.data.error) {
                    msg = `Server Error: ${e.response.data.error}`;
                }
            }
            setErrorMessage(msg);
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setStatus('idle');
        setFile(null);
        setErrorMessage('');
        setFormData({
            title: '',
            year: new Date().getFullYear().toString(),
            uploaded_at: new Date().toISOString().split('T')[0],
            category_id: ''
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Unggah Arsip" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full font-sans">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            <ChevronLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Unggah Arsip Digital</h1>
                            <p className="text-sm md:text-base text-slate-500">
                                Unggah dokumen PDF atau gambar ke dalam sistem arsip.
                            </p>
                        </div>
                    </div>
                </div>

                {status === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-300">
                        <div className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="h-12 w-12" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Arsip Berhasil Disimpan!</h2>
                        <p className="text-slate-500 mb-8 max-w-md">Dokumen telah berhasil diunggah dan disimpan ke dalam database arsip digital.</p>
                        <div className="flex gap-4">
                            <Link href="/dashboard">
                                <Button variant="outline" className="rounded-xl h-12 px-6">Kembali ke Dashboard</Button>
                            </Link>
                            <Button onClick={resetForm} className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700">Unggah Lagi</Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Upload Area */}
                        <div className="space-y-6">
                            <Card className="border-0 shadow-lg rounded-[2rem] overflow-hidden">
                                <CardContent className="p-6 md:p-8">
                                    <div
                                        className={`relative border-3 border-dashed rounded-[1.5rem] transition-all duration-200 text-center p-8 md:p-12 flex flex-col items-center justify-center gap-4 cursor-pointer
                                            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                                            ${file ? 'bg-emerald-50 border-emerald-200' : ''}
                                        `}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="application/pdf,image/jpeg,image/png,image/jpg"
                                            onChange={handleChange}
                                        />

                                        {file ? (
                                            <>
                                                <div className="h-20 w-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                                                    <FileText className="h-10 w-10" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-lg break-all">{file.name}</p>
                                                    <p className="text-slate-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFile(null);
                                                    }}
                                                >
                                                    <X className="h-5 w-5" />
                                                </Button>
                                                <div className="absolute bottom-4 text-emerald-600 text-sm font-medium flex items-center gap-1">
                                                    <Check className="h-4 w-4" /> Siap diunggah
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-20 w-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                                                    <Upload className="h-10 w-10" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-slate-800 text-lg">Klik atau Tarik File Di Sini</p>
                                                    <p className="text-slate-500 text-sm">Mendukung PDF, JPG, PNG (Max 10MB)</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {errorMessage && (
                                        <Alert variant="destructive" className="mt-4 rounded-xl">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{errorMessage}</AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Metadata Form */}
                        <div className="space-y-6">
                            <Card className="border-0 shadow-lg rounded-[2rem] overflow-hidden h-fit">
                                <CardContent className="p-6 md:p-8 space-y-6">
                                    <h3 className="text-xl font-bold text-slate-800">Detail Arsip</h3>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title" className="text-slate-600">Judul Dokumen <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="title"
                                                placeholder="Contoh: Surat Keputusan..."
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                className="h-12 rounded-xl"
                                                disabled={isUploading}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="year" className="text-slate-600">Tahun <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="year"
                                                    type="number"
                                                    value={formData.year}
                                                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                                                    className="h-12 rounded-xl"
                                                    disabled={isUploading}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="uploaded_at" className="text-slate-600">Tanggal Arsip</Label>
                                                <Input
                                                    id="uploaded_at"
                                                    type="date"
                                                    value={formData.uploaded_at || new Date().toISOString().split('T')[0]}
                                                    onChange={e => setFormData({ ...formData, uploaded_at: e.target.value })}
                                                    className="h-12 rounded-xl"
                                                    disabled={isUploading}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="category" className="text-slate-600">Kategori <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={formData.category_id}
                                                onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                                                disabled={isUploading}
                                            >
                                                <SelectTrigger className="h-12 rounded-xl">
                                                    <SelectValue placeholder="Pilih Kategori" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map(c => (
                                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg mt-4 disabled:opacity-50"
                                        onClick={handleUpload}
                                        disabled={!file || !formData.title || !formData.category_id || isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengunggah...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-5 w-5" /> Simpan Arsip
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
