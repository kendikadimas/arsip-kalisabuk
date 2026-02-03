import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Scissors, FileText, Check, Upload, RefreshCw, ChevronLeft, Loader2, X, Archive, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import axios from 'axios';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Declare cv on window
declare global {
    interface Window {
        cv: any;
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Beranda', href: '/dashboard' },
    { title: 'Pemindai Pintar', href: '/scanner' },
];

export default function Scanner({ categories = [] }: { categories: Category[] }) {
    const webcamRef = useRef<Webcam>(null);
    const [cvReady, setCvReady] = useState(false);
    const [stage, setStage] = useState<'camera' | 'crop' | 'details' | 'uploading' | 'success'>('camera');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);

    // Metadata State
    const [formData, setFormData] = useState({
        title: '',
        year: new Date().getFullYear().toString(),
        category_id: ''
    });

    useEffect(() => {
        // Check for OpenCV
        const checkCv = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                setCvReady(true);
                clearInterval(checkCv);
            }
        }, 500);

        return () => clearInterval(checkCv);
    }, []);

    const capture = useCallback(() => {
        const image = webcamRef.current?.getScreenshot();
        if (image) {
            setImageSrc(image);
            setStage('crop');
        }
    }, [webcamRef]);

    const confirmCrop = () => {
        if (!imageSrc || !cvReady) return;
        const cv = window.cv;
        const img = new Image();
        img.onload = () => {
            const src = cv.imread(img);

            // 1. DOWNSCALE FOR DETECTION (Crucial for speed and robustness)
            let detectionSrc = new cv.Mat();
            const scaleFactor = 800 / src.cols; // Work at 800px width
            const dSize = new cv.Size(src.cols * scaleFactor, src.rows * scaleFactor);
            cv.resize(src, detectionSrc, dSize, 0, 0, cv.INTER_AREA);

            // 2. Pre-processing
            let gray = new cv.Mat();
            cv.cvtColor(detectionSrc, gray, cv.COLOR_RGBA2GRAY, 0);
            cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

            let edges = new cv.Mat();
            cv.Canny(gray, edges, 75, 200);

            // Dilate to close gaps
            let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
            cv.dilate(edges, edges, kernel);

            // 3. Find Contours
            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let maxArea = 0;
            let maxContour = null;

            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt);
                const minArea = (detectionSrc.cols * detectionSrc.rows) * 0.05; // Min 5% of screen

                if (area > minArea) {
                    let peri = cv.arcLength(cnt, true);
                    let approx = new cv.Mat();
                    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

                    if (approx.rows === 4 && area > maxArea) {
                        if (cv.isContourConvex(approx)) {
                            maxArea = area;
                            if (maxContour) maxContour.delete();
                            maxContour = approx;
                        } else {
                            approx.delete();
                        }
                    } else {
                        approx.delete();
                    }
                }
            }

            // 4. Warping Phase
            let finalImage = new cv.Mat();

            if (maxContour) {
                // Get points from detection (small scale)
                let pts = [];
                for (let i = 0; i < 4; i++) {
                    pts.push({ x: maxContour.data32S[i * 2], y: maxContour.data32S[i * 2 + 1] });
                }

                // Sort points: TL, TR, BR, BL
                let sortedPts = new Array(4);
                let sums = pts.map(p => p.x + p.y);
                let diffs = pts.map(p => p.y - p.x);

                sortedPts[0] = pts[sums.indexOf(Math.min(...sums))]; // TL
                sortedPts[2] = pts[sums.indexOf(Math.max(...sums))]; // BR
                sortedPts[1] = pts[diffs.indexOf(Math.min(...diffs))]; // TR
                sortedPts[3] = pts[diffs.indexOf(Math.max(...diffs))]; // BL

                // SCALE POINTS BACK TO ORIGINAL RESOLUTION
                const realPts = sortedPts.map(p => ({
                    x: p.x / scaleFactor,
                    y: p.y / scaleFactor
                }));

                // Calculate Dimensions
                const w1 = Math.hypot(realPts[1].x - realPts[0].x, realPts[1].y - realPts[0].y);
                const w2 = Math.hypot(realPts[2].x - realPts[3].x, realPts[2].y - realPts[3].y);
                const h1 = Math.hypot(realPts[3].x - realPts[0].x, realPts[3].y - realPts[0].y);
                const h2 = Math.hypot(realPts[2].x - realPts[1].x, realPts[2].y - realPts[1].y);

                const outW = Math.max(w1, w2);
                const outH = Math.max(h1, h2);

                let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                    realPts[0].x, realPts[0].y,
                    realPts[1].x, realPts[1].y,
                    realPts[2].x, realPts[2].y,
                    realPts[3].x, realPts[3].y
                ]);

                let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH]);
                let M = cv.getPerspectiveTransform(srcTri, dstTri);

                cv.warpPerspective(src, finalImage, M, new cv.Size(outW, outH));

                srcTri.delete(); dstTri.delete(); M.delete();
            } else {
                // Fallback: Use original
                src.copyTo(finalImage);
            }

            const canvas = document.createElement('canvas');
            cv.imshow(canvas, finalImage);
            setCroppedImage(canvas.toDataURL('image/jpeg', 0.95));
            setStage('details');

            // Cleanup
            src.delete(); detectionSrc.delete(); gray.delete(); edges.delete();
            kernel.delete(); contours.delete(); hierarchy.delete();
            if (maxContour) maxContour.delete();
            finalImage.delete();
        };
        img.src = imageSrc;
    };

    const generatePDFAndUpload = async () => {
        if (!croppedImage) return;
        setStage('uploading');

        try {
            const doc = new jsPDF();
            const imgProps = doc.getImageProperties(croppedImage);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            doc.addImage(croppedImage, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = doc.output('blob');

            const payload = new FormData();
            payload.append('file', pdfBlob, 'scan.pdf');
            payload.append('title', formData.title || 'Scanned Document');
            payload.append('year', formData.year);
            payload.append('category_id', formData.category_id);

            await axios.post('/api/archives', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setStage('success');
        } catch (e) {
            console.error(e);
            alert('Upload Gagal. Silakan coba lagi.');
            setStage('details');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pemindai Pintar" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full font-sans">

                {/* Header with Back Button */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Pemindai Pintar</h1>
                            <p className="text-sm md:text-base text-slate-500">
                                {stage === 'camera' && 'Posisikan dokumen di tengah frame'}
                                {stage === 'crop' && 'Pastikan dokumen terlihat jelas'}
                                {stage === 'details' && 'Lengkapi informasi dokumen'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="flex justify-between items-center px-4 md:px-12 max-w-3xl mx-auto w-full mb-4">
                    {[
                        { s: 'camera', i: Camera },
                        { s: 'crop', i: Scissors },
                        { s: 'details', i: FileText },
                        { s: 'success', i: Check },
                    ].map((step, idx) => {
                        const Icon = step.i;
                        const active = stage === step.s || (stage === 'uploading' && step.s === 'details');
                        const done = (idx === 0 && ['crop', 'details', 'uploading', 'success'].includes(stage)) ||
                            (idx === 1 && ['details', 'uploading', 'success'].includes(stage)) ||
                            (idx === 2 && ['success'].includes(stage));

                        return (
                            <React.Fragment key={step.s}>
                                <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'scale-110' : 'opacity-40'}`}>
                                    <div className={`h-12 w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center border-2 transition-colors ${done ? 'bg-emerald-500 border-emerald-500 text-white' :
                                        active ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-400'
                                        }`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                </div>
                                {idx < 3 && <div className={`flex-1 h-1 mx-2 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-100'}`} />}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6">

                    {stage === 'camera' && (
                        <div className="w-full flex flex-col items-center gap-8">
                            <div className="relative w-full aspect-[3/4] max-w-[400px] bg-black rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-900 mx-auto group">
                                <Webcam
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    screenshotQuality={1}
                                    className="w-full h-full object-cover"
                                    videoConstraints={{
                                        facingMode: 'environment',
                                        width: { ideal: 1920 },
                                        height: { ideal: 1080 }
                                    }}
                                />
                                <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent" />

                                {/* Scanning Guide */}
                                <div className="absolute inset-16 border-2 border-white/30 rounded-lg flex items-center justify-center">
                                    <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                                    <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                                    <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                                    <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                                </div>

                                {!cvReady && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-8">
                                        <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mb-4" />
                                        <p className="text-lg font-bold">Inisialisasi OpenCV...</p>
                                        <p className="text-sm text-white/60 mt-2">Sedang menyiapkan sistem cerdas</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={capture}
                                disabled={!cvReady}
                                className="h-24 w-24 rounded-full border-4 border-slate-200 p-1.5 group active:scale-90 transition-transform disabled:opacity-50"
                            >
                                <div className="h-full w-full rounded-full bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/40 group-hover:bg-blue-700 transition-colors">
                                    <Camera className="h-12 w-12 text-white" />
                                </div>
                            </button>
                        </div>
                    )}

                    {stage === 'crop' && imageSrc && (
                        <div className="w-full flex flex-col items-center gap-8">
                            <div className="relative w-full aspect-[3/4] max-w-[400px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-50 mx-auto">
                                <img src={imageSrc} alt="Capture" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                            </div>

                            <div className="flex gap-4 w-full max-w-[400px]">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-2xl h-14 border-slate-200 text-lg font-bold"
                                    onClick={() => setStage('camera')}
                                >
                                    <RotateCcw className="mr-2 h-5 w-5" /> Ulangi
                                </Button>
                                <Button
                                    className="flex-[2] rounded-2xl h-14 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 px-8 text-lg font-bold"
                                    onClick={confirmCrop}
                                >
                                    <Scissors className="mr-2 h-5 w-5" /> Proses Scan
                                </Button>
                            </div>
                        </div>
                    )}

                    {stage === 'details' && croppedImage && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start w-full">
                            <div className="md:col-span-5 space-y-6">
                                <div className="relative group mx-auto w-full max-w-[280px] aspect-[3/4] bg-white rounded-[2rem] shadow-2xl overflow-hidden border-8 border-white">
                                    <img src={croppedImage} alt="Clean" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-xl flex items-center justify-between shadow-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                                                <Check className="h-5 w-5 text-white" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hasil Scan A4</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-7 space-y-4 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
                                <div className="space-y-3">
                                    <Label htmlFor="title" className="text-slate-600 ml-2 font-bold text-sm">JUDUL DOKUMEN</Label>
                                    <Input
                                        id="title"
                                        placeholder="Nama berkas..."
                                        className="rounded-2xl border-slate-200 h-14 text-lg px-6 focus:ring-blue-500 bg-slate-50 border-none"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="year" className="text-slate-600 ml-2 font-bold text-sm">TAHUN</Label>
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
                                    onClick={generatePDFAndUpload}
                                    disabled={!formData.category_id || !formData.title}
                                >
                                    <Upload className="mr-3 h-6 w-6" /> Simpan ke Drive
                                </Button>
                            </div>
                        </div>
                    )}

                    {stage === 'uploading' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-24 w-24 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                                <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Sedang Mengunggah</h2>
                            <p className="text-slate-500 max-w-[240px] mt-2">
                                Dokumen sedang dikonversi ke PDF dan disimpan di Google Drive...
                            </p>
                        </div>
                    )}

                    {stage === 'success' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
                            <div className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
                                <Check className="h-12 w-12 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Upload Berhasil!</h2>
                            <p className="text-slate-500 max-w-[240px] mt-2 mb-8">
                                Berkas tersimpan dengan aman di dalam folder kategori.
                            </p>
                            <div className="flex flex-col gap-3 w-full max-w-[200px]">
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold h-12 shadow-lg"
                                    onClick={() => setStage('camera')}
                                >
                                    Scan Lagi
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
            </div>

            {/* Mobile Bottom Nav Spacer */}
            <div className="h-20 md:hidden"></div>

        </AppLayout>
    );
}
