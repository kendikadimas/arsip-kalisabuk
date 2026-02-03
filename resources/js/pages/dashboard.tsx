import { Head, usePage, useForm, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, SharedData, Category, Archive } from '@/types';
import { Cloud, FileText, Folder, MoreVertical, Plus, Scan, Upload, Loader2, Search, Filter, X, Eye, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Beranda',
        href: dashboard().url,
    },
];

const folderColors = [
    { text: 'text-blue-500', fill: 'fill-blue-500/20' },
    { text: 'text-emerald-500', fill: 'fill-emerald-500/20' },
    { text: 'text-orange-500', fill: 'fill-orange-500/20' },
    { text: 'text-purple-500', fill: 'fill-purple-500/20' },
    { text: 'text-pink-500', fill: 'fill-pink-500/20' },
];

export default function Dashboard({
    categories = [],
    archives = [],
    filters = { search: '', year: '' }
}: {
    categories: Category[],
    archives: Archive[],
    filters: any
}) {
    const { auth } = usePage<SharedData>().props;
    const userFirstName = auth.user.name.split(' ')[0];
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Filter States
    const [search, setSearch] = useState(filters.search || '');
    const [year, setYear] = useState(filters.year || '');

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

    // Category Rename State
    const [renamingCategory, setRenamingCategory] = useState<Category | null>(null);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const renameForm = useForm({
        name: '',
    });

    const openRenameDialog = (category: Category) => {
        setRenamingCategory(category);
        renameForm.setData('name', category.name);
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

    // Delete States
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
    const [deletingArchive, setDeletingArchive] = useState<Archive | null>(null);
    const [isDeleteArchiveDialogOpen, setIsDeleteArchiveDialogOpen] = useState(false);

    const openDeleteCategoryDialog = (category: Category) => {
        setDeletingCategory(category);
        setIsDeleteCategoryDialogOpen(true);
    };

    const confirmDeleteCategory = () => {
        if (!deletingCategory) return;
        router.delete(`/categories/${deletingCategory.id}`, {
            onSuccess: () => setIsDeleteCategoryDialogOpen(false),
        });
    };

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

    // Category Search State
    const [categorySearch, setCategorySearch] = useState('');

    const handleSearch = () => {
        router.get(dashboard().url, { search, year }, {
            preserveState: true,
            replace: true,
            preserveScroll: true
        });
    };

    const clearFilters = () => {
        setSearch('');
        setYear('all');
        router.get(dashboard().url, {}, {
            preserveState: true,
            replace: true,
            preserveScroll: true
        });
    };

    // Auto-search on filter change
    useEffect(() => {
        if (year) {
            handleSearch();
        }
    }, [year]);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/categories', {
            onSuccess: () => {
                setIsDialogOpen(false);
                reset();
                clearErrors();
            },
        });
    };

    const isFiltering = search !== '' || (year !== '' && year !== 'all');

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Beranda" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full font-sans">

                {/* Greeting Header */}
                <div className="flex items-center justify-between pb-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                            Halo, {userFirstName}
                        </h1>
                        <p className="text-sm md:text-base text-slate-500">
                            Selamat datang kembali di arsip Anda
                        </p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors outline-hidden">
                                <span className="font-bold text-slate-600 md:text-lg">{userFirstName.charAt(0)}</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 rounded-xl shadow-xl border-slate-100" align="end">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Primary Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                    {/* Send / Upload Card */}
                    <Link
                        href="/upload"
                        className="relative overflow-hidden rounded-[2rem] bg-indigo-50 p-8 flex flex-col justify-between h-56 md:h-64 group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1"
                    >
                        <div className="flex items-start justify-between z-10">
                            <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <span className="font-bold text-sm">PDF</span>
                            </div>
                            <Upload className="h-8 w-8 text-indigo-900" />
                        </div>

                        <div className="z-10 mt-auto">
                            <h3 className="text-3xl font-bold text-indigo-950 mb-1">Upload</h3>
                            <div className="inline-flex items-center rounded-full bg-white/60 px-4 py-1.5 text-sm font-medium text-indigo-900 backdrop-blur-sm border border-white/20">
                                Kirim berkas PDF
                            </div>
                        </div>

                        {/* Decor */}
                        <div className="absolute right-[-10%] top-10 w-64 h-48 bg-indigo-200/50 blur-3xl rounded-full" />
                        <FileText className="absolute right-8 top-1/2 -translate-y-1/2 h-40 w-40 text-indigo-200/40 rotate-12 transition-transform group-hover:rotate-6 duration-500" />
                    </Link>

                    {/* Receive / Scan Card */}
                    <Link
                        href="/scanner"
                        className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 flex flex-col justify-between h-56 md:h-64 group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1"
                    >
                        <div className="flex items-start justify-between z-10">
                            <div className="h-12 w-12 rounded-full bg-slate-800 text-white flex items-center justify-center border border-slate-700">
                                <span className="font-bold text-sm">GO</span>
                            </div>
                            <Scan className="h-8 w-8 text-white/80" />
                        </div>

                        <div className="z-10 mt-auto">
                            <h3 className="text-3xl font-bold text-white mb-1">Scan</h3>
                            <div className="inline-flex items-center rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-slate-300 border border-slate-700">
                                Mulai Scan Dokumen
                            </div>
                        </div>

                        {/* Decor */}
                        <div className="absolute right-[-5%] bottom-[-10%] w-56 h-56 bg-blue-500/20 blur-3xl rounded-full" />
                        <Cloud className="absolute right-6 top-10 h-44 w-44 text-white/5 rotate-[-12deg] transition-transform group-hover:rotate-0 duration-500" />
                    </Link>
                </div>

                {/* Search & Filter Section */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Cari nama dokumen..."
                                className="pl-12 h-14 rounded-2xl border-none bg-slate-50 text-lg focus-visible:ring-blue-500"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            {search && (
                                <button
                                    onClick={() => { setSearch(''); handleSearch(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X className="h-4 w-4 text-slate-400" />
                                </button>
                            )}
                        </div>
                        <Button
                            className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold"
                            onClick={handleSearch}
                        >
                            Cari
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-bold mr-2">
                            <Filter className="h-4 w-4" />
                            <span>FILTER:</span>
                        </div>

                        {/* Year Filter */}
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-[120px] h-10 rounded-xl bg-slate-50 border-none">
                                <SelectValue placeholder="Tahun" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">Semua Tahun</SelectItem>
                                {[...new Array(10)].map((_, i) => {
                                    const y = new Date().getFullYear() - i;
                                    return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>

                        {isFiltering && (
                            <Button
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 px-4 ml-auto"
                                onClick={clearFilters}
                            >
                                Reset Filter
                            </Button>
                        )}
                    </div>
                </div>

                {/* Search Results / All Archives Section */}
                {isFiltering && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Search className="h-5 w-5 text-blue-500" />
                                Hasil Pencarian ({archives.length})
                            </h2>
                        </div>

                        {archives.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {archives.map((archive) => (
                                    <div
                                        key={archive.id}
                                        className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <FileText className="h-7 w-7" />
                                            </div>
                                            <div className="flex-1 min-w-0 pr-8">
                                                <h4 className="font-bold text-slate-900 truncate mb-1" title={archive.title}>{archive.title}</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                                        {archive.category?.name || 'Tanpa Kategori'}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                                                        {archive.year}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute top-4 right-4 flex items-center gap-1">
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
                                                        Edit
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
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                                    <Search className="h-10 w-10 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Tidak ada dokumen</h3>
                                <p className="text-sm text-slate-500">Coba gunakan kata kunci atau filter lain.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Categories / Folders Section */}
                {!isFiltering && (
                    <div className="flex-1 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-bold text-slate-900">Kategori</h2>

                            <div className="relative w-full md:w-64 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    placeholder="Cari kategori..."
                                    className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-sm focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                />
                                {categorySearch && (
                                    <button
                                        onClick={() => setCategorySearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <X className="h-3 w-3 text-slate-400" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {/* Add New Category Card via Dialog */}
                            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                                setIsDialogOpen(open);
                                if (!open) {
                                    reset();
                                    clearErrors();
                                }
                            }}>
                                <DialogTrigger asChild>
                                    <button className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 h-32 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                        <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Plus className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600">Tambah Kategori</span>
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Tambah Kategori Baru</DialogTitle>
                                        <DialogDescription>
                                            Buat kategori baru untuk mengorganisir dokumen desa Anda.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={submit}>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="name">Nama Kategori</Label>
                                                <Input
                                                    id="name"
                                                    placeholder="Contoh: Kartu Keluarga"
                                                    value={data.name}
                                                    onChange={(e) => setData('name', e.target.value)}
                                                    autoFocus
                                                />
                                                {errors.name && (
                                                    <p className="text-sm text-red-500 font-medium">{errors.name}</p>
                                                )}
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => setIsDialogOpen(false)}
                                            >
                                                Batal
                                            </Button>
                                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Buat Kategori
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            {/* Dynamic Category Cards */}
                            {filteredCategories.map((category, index) => {
                                const colors = folderColors[index % folderColors.length];
                                return (
                                    <div
                                        key={category.id}
                                        className="relative group h-32"
                                    >
                                        <Link
                                            href={`/categories/${category.id}`}
                                            className="flex flex-col justify-between rounded-2xl bg-white p-4 h-full shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start">
                                                <Folder className={`h-8 w-8 ${colors.text} ${colors.fill}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm truncate pr-6" title={category.name}>{category.name}</h4>
                                                <p className="text-[10px] text-slate-500 mt-1">{category.archives_count ?? 0} berkas</p>
                                            </div>
                                        </Link>

                                        {/* Category Options Menu */}
                                        <div className="absolute top-2 right-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="h-8 w-8 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all outline-hidden">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-40 rounded-xl" align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => openRenameDialog(category)}
                                                        className="cursor-pointer rounded-lg text-slate-600 focus:bg-blue-50 focus:text-blue-600 font-medium"
                                                    >
                                                        <Edit2 className="mr-2 h-4 w-4" />
                                                        Ubah Nama
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => openDeleteCategoryDialog(category)}
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
                )}
            </div>

            {/* Rename Category Dialog */}
            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ubah Nama Kategori</DialogTitle>
                        <DialogDescription>
                            Perubahan nama juga akan disesuaikan di folder Google Drive.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitRename}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="rename-name">Nama Kategori</Label>
                                <Input
                                    id="rename-name"
                                    value={renameForm.data.name}
                                    onChange={(e) => renameForm.setData('name', e.target.value)}
                                    autoFocus
                                />
                                {renameForm.errors.name && (
                                    <p className="text-sm text-red-500 font-medium">{renameForm.errors.name}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsRenameDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={renameForm.processing} className="bg-blue-600 hover:bg-blue-700">
                                {renameForm.processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
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

            {/* Delete Category Confirmation Dialog */}
            <Dialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Hapus Kategori?</DialogTitle>
                        <DialogDescription className="space-y-3">
                            <p>Apakah Anda yakin ingin menghapus kategori <strong>{deletingCategory?.name}</strong>?</p>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700 text-xs leading-relaxed">
                                <strong>PERINGATAN:</strong> Tindakan ini akan menghapus folder di Google Drive beserta <strong>seluruh file</strong> di dalamnya secara permanen. Tindakan ini tidak dapat dibatalkan.
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsDeleteCategoryDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDeleteCategory}
                            className="bg-red-600 hover:bg-red-700 rounded-xl"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Ya, Hapus Kategori
                        </Button>
                    </DialogFooter>
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

            {/* Floating Action Button (FAB) */}
            <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50">
                <Link
                    href="/scanner"
                    className="h-14 w-14 rounded-[1.2rem] bg-blue-400 hover:bg-blue-500 text-white shadow-xl shadow-blue-400/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus className="h-7 w-7" />
                </Link>
            </div>

            {/* Mobile Bottom Nav Spacer */}
            <div className="h-20 md:hidden"></div>

        </AppLayout>
    );
}
