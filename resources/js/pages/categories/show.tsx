import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Category, Archive } from '@/types';
import { FileText, ChevronLeft, MoreVertical, Eye, Search, Clock, File, Edit2, Trash2, Loader2, Folder, Plus, X, ArrowUpDown, Calendar, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const folderColors = [
    { text: 'text-blue-500', fill: 'fill-blue-500/20' },
    { text: 'text-emerald-500', fill: 'fill-emerald-500/20' },
    { text: 'text-orange-500', fill: 'fill-orange-500/20' },
    { text: 'text-purple-500', fill: 'fill-purple-500/20' },
    { text: 'text-pink-500', fill: 'fill-pink-500/20' },
];

const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

export default function Show({ category, archives, children: subCategories = [], breadcrumbs }: {
    category: Category,
    archives: Archive[],
    children: Category[],
    breadcrumbs: BreadcrumbItem[]
}) {
    // Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [folderSearch, setFolderSearch] = useState('');

    // Sort States
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Create Sub-Folder State
    const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
    const createFolderForm = useForm({
        name: '',
        parent_id: category.id
    });

    const submitCreateFolder = (e: React.FormEvent) => {
        e.preventDefault();
        createFolderForm.post('/categories', {
            onSuccess: () => {
                setIsCreateFolderDialogOpen(false);
                createFolderForm.reset();
            },
        });
    };

    // Rename/Delete Category Logic (for sub-folders) - Copy from Dashboard if needed, or simple link
    // For now, let's just link to them. Managing them can be done inside them or add dropdowns later.
    const [renamingCategory, setRenamingCategory] = useState<Category | null>(null);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const renameForm = useForm({ name: '' });

    const openRenameDialog = (cat: Category) => {
        setRenamingCategory(cat);
        renameForm.setData('name', cat.name);
        setIsRenameDialogOpen(true);
    };

    const submitRename = (e: React.FormEvent) => {
        e.preventDefault();
        renameForm.patch(`/categories/${renamingCategory?.id}`, {
            onSuccess: () => {
                setIsRenameDialogOpen(false);
                renameForm.reset();
            },
        });
    };

    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);

    const openDeleteCategoryDialog = (cat: Category) => {
        setDeletingCategory(cat);
        setIsDeleteCategoryDialogOpen(true);
    };

    const confirmDeleteCategory = () => {
        if (!deletingCategory) return;
        router.delete(`/categories/${deletingCategory.id}`, {
            onSuccess: () => setIsDeleteCategoryDialogOpen(false),
        });
    };

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
        let result = archives.filter(archive =>
            archive.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'size':
                    comparison = (a.file_size || 0) - (b.file_size || 0);
                    break;
                case 'date':
                default:
                    const dateA = new Date(a.uploaded_at || a.created_at).getTime();
                    const dateB = new Date(b.uploaded_at || b.created_at).getTime();
                    comparison = dateA - dateB;
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    }, [archives, searchTerm, sortBy, sortOrder]);

    const filteredSubCategories = useMemo(() => {
        return subCategories.filter(cat =>
            cat.name.toLowerCase().includes(folderSearch.toLowerCase())
        );
    }, [subCategories, folderSearch]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={category.name} />

            <div className="flex h-full flex-1 flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto w-full font-sans">

                {/* Header with Back Button */}
                <div className="flex items-center gap-4">
                    <Link
                        href={breadcrumbs.length > 2 ? breadcrumbs[breadcrumbs.length - 2].href : '/dashboard'}
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{category.name}</h1>
                        <p className="text-sm md:text-base text-slate-500">
                            {subCategories.length} folder, {archives.length} berkas
                        </p>
                    </div>
                </div>

                {/* Sub-Categories Section */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-900">Folder / Sub-Kategori</h2>
                        <div className="relative w-full md:w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Cari folder..."
                                className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-sm focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
                                value={folderSearch}
                                onChange={(e) => setFolderSearch(e.target.value)}
                            />
                            {folderSearch && (
                                <button
                                    onClick={() => setFolderSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="h-3 w-3 text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {/* New Folder Button */}
                        <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
                            <DialogTrigger asChild>
                                <button className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 h-32 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                    <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">Buat Folder</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Buat Folder Baru</DialogTitle>
                                    <DialogDescription>
                                        Folder baru akan dibuat di dalam <strong>{category.name}</strong>.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={submitCreateFolder}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="folder-name">Nama Folder</Label>
                                            <Input
                                                id="folder-name"
                                                placeholder="Contoh: Lampiran, 2024, dll"
                                                value={createFolderForm.data.name}
                                                onChange={(e) => createFolderForm.setData('name', e.target.value)}
                                                autoFocus
                                            />
                                            {createFolderForm.errors.name && (
                                                <p className="text-sm text-red-500 font-medium">{createFolderForm.errors.name}</p>
                                            )}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setIsCreateFolderDialogOpen(false)}
                                        >
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={createFolderForm.processing} className="bg-blue-600 hover:bg-blue-700">
                                            {createFolderForm.processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Buat Folder
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* List Filters */}
                        {filteredSubCategories.map((subCat, index) => {
                            const colors = folderColors[index % folderColors.length];
                            return (
                                <div key={subCat.id} className="relative group h-32">
                                    <Link
                                        href={`/categories/${subCat.id}`}
                                        className="flex flex-col justify-between rounded-2xl bg-white p-4 h-full shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start">
                                            <Folder className={`h-8 w-8 ${colors.text} ${colors.fill}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm truncate pr-6" title={subCat.name}>{subCat.name}</h4>
                                            <p className="text-[10px] text-slate-500 mt-1">{subCat.archives_count ?? 0} berkas</p>
                                        </div>
                                    </Link>
                                    <div className="absolute top-2 right-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="h-8 w-8 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all outline-hidden">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-40 rounded-xl" align="end">
                                                <DropdownMenuItem
                                                    onClick={() => openRenameDialog(subCat)}
                                                    className="cursor-pointer rounded-lg text-slate-600 focus:bg-blue-50 focus:text-blue-600 font-medium"
                                                >
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    Ubah Nama
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => openDeleteCategoryDialog(subCat)}
                                                    className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700 font-medium"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Hapus
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Archives Section */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-900">Berkas / Arsip</h2>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Cari berkas..."
                                    className="w-full rounded-xl border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 transition-all outline-hidden"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <X className="h-3 w-3 text-slate-400" />
                                    </button>
                                )}
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-10 gap-2 rounded-xl bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-blue-600">
                                        <ArrowUpDown className="h-4 w-4" />
                                        <span className="hidden md:inline">Urutkan</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                    <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                                        <DropdownMenuRadioItem value="date">Tanggal Upload</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="name">Nama (A-Z)</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="size">Ukuran File</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                                        <DropdownMenuRadioItem value="asc">Terlama / A-Z</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="desc">Terbaru / Z-A</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {filteredArchives.length > 0 ? (
                            filteredArchives.map((archive) => (
                                <div
                                    key={archive.id}
                                    className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all gap-4"
                                >
                                    <div className="flex items-start sm:items-center gap-4 min-w-0 pr-4 w-full">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-1 sm:mt-0">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 sm:truncate" title={archive.title}>
                                                    {archive.title}
                                                </h4>
                                                {/* Mobile Actions (Always Visible) */}
                                                <div className="flex sm:hidden items-center gap-1 shrink-0 -mt-1 -mr-2">
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
                                                            <DropdownMenuItem onClick={() => openEditArchiveDialog(archive)}>
                                                                <Edit2 className="mr-2 h-4 w-4" /> Edit Info
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openDeleteArchiveDialog(archive)} className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            <div className="mt-2 sm:mt-1 flex flex-wrap items-center gap-3 text-[10px] md:text-xs text-slate-500 font-medium">
                                                <span className="flex items-center gap-1.5" title="Tahun Arsip">
                                                    <Clock className="h-3 w-3" />
                                                    {archive.year}
                                                </span>
                                                <span className="hidden sm:inline h-1 w-1 rounded-full bg-slate-300" />
                                                <span className="flex items-center gap-1.5" title="Tanggal Upload">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(archive.uploaded_at || archive.created_at)}
                                                </span>
                                                {archive.file_size && (
                                                    <>
                                                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                        <span className="flex items-center gap-1.5" title="Ukuran File">
                                                            <HardDrive className="h-3 w-3" />
                                                            {formatBytes(archive.file_size)}
                                                        </span>
                                                    </>
                                                )}
                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">PDF</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Actions */}
                                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                                        <a
                                            href={archive.view_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                                            title="Lihat Dokumen"
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
                            <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                                    <File className="h-10 w-10 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {searchTerm ? 'Tidak ditemukan kecocokan' : 'Belum ada dokumen'}
                                </h3>
                                <p className="text-sm text-slate-500 max-w-[200px] mt-1 mx-auto">
                                    {searchTerm ? 'Coba sesuaikan kata kunci pencarian Anda.' : 'Dokumen yang diunggah akan muncul di sini.'}
                                </p>
                                {!searchTerm && (
                                    <Button className="mt-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20" asChild>
                                        <Link href="/upload">Unggah Dokumen</Link>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rename Category Dialog */}
            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ubah Nama Folder</DialogTitle>
                        <DialogDescription>
                            Perubahan nama akan disinkronkan ke Google Drive.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitRename}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="rename-name">Nama Folder</Label>
                                <Input
                                    id="rename-name"
                                    value={renameForm.data.name}
                                    onChange={(e) => renameForm.setData('name', e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsRenameDialogOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={renameForm.processing} className="bg-blue-600 hover:bg-blue-700">Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Category Dialog */}
            <Dialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Hapus Folder?</DialogTitle>
                        <DialogDescription>
                            Akan menghapus folder <strong>{deletingCategory?.name}</strong> beserta isinya (Sub-folder & Arsip).
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setIsDeleteCategoryDialogOpen(false)}>Batal</Button>
                        <Button type="button" variant="destructive" onClick={confirmDeleteCategory} className="bg-red-600 hover:bg-red-700">Hapus</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
        </AppLayout >
    );
}
