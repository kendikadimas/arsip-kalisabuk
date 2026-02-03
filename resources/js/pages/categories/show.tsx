import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Category, Archive } from '@/types';
import { FileText, ChevronLeft, MoreVertical, Eye, Search, Clock, File, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Show({ category, archives }: { category: Category, archives: Archive[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Beranda', href: '/dashboard' },
        { title: category.name, href: `/categories/${category.id}` },
    ];

    const [searchTerm, setSearchTerm] = useState('');

    // Archive Edit State
    const [editingArchive, setEditingArchive] = useState<Archive | null>(null);
    const [isEditArchiveDialogOpen, setIsEditArchiveDialogOpen] = useState(false);
    const archiveForm = useForm({
        title: '',
        year: '',
    });

    const openEditArchiveDialog = (archive: Archive) => {
        setEditingArchive(archive);
        archiveForm.setData({
            title: archive.title,
            year: archive.year.toString(),
        });
        setIsEditArchiveDialogOpen(true);
    };

    const submitArchiveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        archiveForm.patch(`/archives/${editingArchive?.id}`, {
            onSuccess: () => {
                setIsEditArchiveDialogOpen(false);
                archiveForm.reset();
            },
        });
    };

    // Archive Delete State
    const [deletingArchive, setDeletingArchive] = useState<Archive | null>(null);
    const [isDeleteArchiveDialogOpen, setIsDeleteArchiveDialogOpen] = useState(false);

    const openDeleteArchiveDialog = (archive: Archive) => {
        setDeletingArchive(archive);
        setIsDeleteArchiveDialogOpen(true);
    };

    const confirmDeleteArchive = () => {
        if (!deletingArchive) return;
        router.delete(`/archives/${deletingArchive.id}`, {
            onSuccess: () => setIsDeleteArchiveDialogOpen(false),
        });
    };

    const filteredArchives = useMemo(() => {
        return archives.filter(archive =>
            archive.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [archives, searchTerm]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={category.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-2xl mx-auto w-full font-sans">

                {/* Header with Back Button */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{category.name}</h1>
                        <p className="text-sm text-slate-500">{archives.length} berkas tersimpan</p>
                    </div>
                </div>

                {/* Search / Filter */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari berkas di kategori ini..."
                        className="w-full rounded-2xl border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 transition-all outline-hidden"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Document List */}
                <div className="flex flex-col gap-3">
                    {filteredArchives.length > 0 ? (
                        filteredArchives.map((archive) => (
                            <div
                                key={archive.id}
                                className="group flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all"
                            >
                                <div className="flex items-center gap-4 min-w-0 pr-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={archive.title}>
                                            {archive.title}
                                        </h4>
                                        <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {archive.year}
                                            </span>
                                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                                            <span>PDF</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <a
                                        href={archive.view_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </a>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all outline-hidden">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-40 rounded-xl" align="end">
                                            <DropdownMenuItem
                                                onClick={() => openEditArchiveDialog(archive)}
                                                className="cursor-pointer rounded-lg text-slate-600 focus:bg-blue-50 focus:text-blue-600 font-medium"
                                            >
                                                <Edit2 className="mr-2 h-4 w-4" />
                                                Edit Info
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => openDeleteArchiveDialog(archive)}
                                                className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700 font-medium"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Hapus
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                <File className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                {searchTerm ? 'Tidak ditemukan kecocokan' : 'Belum ada dokumen'}
                            </h3>
                            <p className="text-sm text-slate-500 max-w-[200px] mt-1">
                                {searchTerm ? 'Coba sesuaikan kata kunci pencarian Anda.' : 'Mulai dengan memindai atau mengunggah dokumen baru.'}
                            </p>
                            {!searchTerm && (
                                <Button className="mt-6 bg-blue-600 hover:bg-blue-700" asChild>
                                    <Link href="/scanner">Ke Pemindai</Link>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Archive Dialog */}
            <Dialog open={isEditArchiveDialogOpen} onOpenChange={setIsEditArchiveDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Informasi Dokumen</DialogTitle>
                        <DialogDescription>
                            Ubah judul arsip atau tahun dokumen.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitArchiveEdit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="archive-title">Judul Dokumen</Label>
                                <Input
                                    id="archive-title"
                                    value={archiveForm.data.title}
                                    onChange={(e) => archiveForm.setData('title', e.target.value)}
                                    autoFocus
                                />
                                {archiveForm.errors.title && (
                                    <p className="text-sm text-red-500 font-medium">{archiveForm.errors.title}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="archive-year">Tahun</Label>
                                <Input
                                    id="archive-year"
                                    type="number"
                                    value={archiveForm.data.year}
                                    onChange={(e) => archiveForm.setData('year', e.target.value)}
                                />
                                {archiveForm.errors.year && (
                                    <p className="text-sm text-red-500 font-medium">{archiveForm.errors.year}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsEditArchiveDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={archiveForm.processing} className="bg-blue-600 hover:bg-blue-700">
                                {archiveForm.processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Archive Confirmation Dialog */}
            <Dialog open={isDeleteArchiveDialogOpen} onOpenChange={setIsDeleteArchiveDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Hapus Dokumen?</DialogTitle>
                        <DialogDescription>
                            <p>Apakah Anda yakin ingin menghapus dokumen <strong>{deletingArchive?.title}</strong>?</p>
                            <p className="mt-2 text-xs text-slate-500">File juga akan dihapus secara permanen dari Google Drive.</p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsDeleteArchiveDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDeleteArchive}
                            className="bg-red-600 hover:bg-red-700 rounded-xl"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Ya, Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
