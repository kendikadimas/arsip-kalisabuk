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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cvReady, setCvReady] = useState(false);

    // State
    const [stage, setStage] = useState<'camera' | 'crop' | 'review_page' | 'details' | 'uploading' | 'success'>('camera');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [pages, setPages] = useState<string[]>([]);
    const [currentCropped, setCurrentCropped] = useState<string | null>(null);

    // Live detection ref
    const detectedQuadRef = useRef<{ x: number, y: number }[] | null>(null);
    const animationRef = useRef<number | null>(null);
    const [isDocumentDetected, setIsDocumentDetected] = useState(false);

    // Metadata State
    const [formData, setFormData] = useState({
        title: '',
        year: new Date().getFullYear().toString(),
        category_id: ''
    });

    useEffect(() => {
        const checkCv = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                setCvReady(true);
                clearInterval(checkCv);
            }
        }, 500);
        return () => clearInterval(checkCv);
    }, []);

    // Real-time Detection Loop
    useEffect(() => {
        if (!cvReady || stage !== 'camera') {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const detectFrame = () => {
            if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
                const video = webcamRef.current.video;
                const cv = window.cv;

                const processCanvas = document.createElement('canvas');
                const workWidth = 320;
                const scale = workWidth / video.videoWidth;
                const workHeight = video.videoHeight * scale;

                processCanvas.width = workWidth;
                processCanvas.height = workHeight;
                const ctx = processCanvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, workWidth, workHeight);

                    try {
                        let src = cv.imread(processCanvas);
                        let gray = new cv.Mat();
                        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
                        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

                        let edges = new cv.Mat();
                        cv.Canny(gray, edges, 50, 150);

                        let contours = new cv.MatVector();
                        let hierarchy = new cv.Mat();
                        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                        let maxArea = 0;
                        let maxContour = null;
                        const minArea = (workWidth * workHeight) * 0.05;

                        for (let i = 0; i < contours.size(); ++i) {
                            let cnt = contours.get(i);
                            let area = cv.contourArea(cnt);
                            if (area > minArea) {
                                let peri = cv.arcLength(cnt, true);
                                let approx = new cv.Mat();
                                cv.approxPolyDP(cnt, approx, 0.03 * peri, true);

                                if (area > maxArea && approx.rows === 4 && cv.isContourConvex(approx)) {
                                    maxArea = area;
                                    if (maxContour) maxContour.delete();
                                    maxContour = approx;
                                } else {
                                    approx.delete();
                                }
                            }
                        }

                        const overlay = canvasRef.current;
                        if (overlay) {
                            overlay.width = video.clientWidth;
                            overlay.height = video.clientHeight;
                            const overlayCtx = overlay.getContext('2d');
                            if (overlayCtx) {
                                overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

                                if (maxContour) {
                                    const pts = [];
                                    for (let i = 0; i < 4; i++) {
                                        pts.push({
                                            x: maxContour.data32S[i * 2] / workWidth,
                                            y: maxContour.data32S[i * 2 + 1] / workHeight
                                        });
                                    }

                                    let sums = pts.map(p => p.x + p.y);
                                    let diffs = pts.map(p => p.y - p.x);
                                    const tl = pts[sums.indexOf(Math.min(...sums))];
                                    const br = pts[sums.indexOf(Math.max(...sums))];
                                    const tr = pts[diffs.indexOf(Math.min(...diffs))];
                                    const bl = pts[diffs.indexOf(Math.max(...diffs))];

                                    detectedQuadRef.current = [tl, tr, br, bl];
                                    setIsDocumentDetected(true);

                                    overlayCtx.beginPath();
                                    overlayCtx.lineWidth = 4;
                                    overlayCtx.strokeStyle = '#10b981';
                                    overlayCtx.lineCap = 'round';
                                    overlayCtx.lineJoin = 'round';

                                    const drawPts = detectedQuadRef.current.map(p => ({
                                        x: p.x * overlay.width,
                                        y: p.y * overlay.height
                                    }));

                                    overlayCtx.moveTo(drawPts[0].x, drawPts[0].y);
                                    overlayCtx.lineTo(drawPts[1].x, drawPts[1].y);
                                    overlayCtx.lineTo(drawPts[2].x, drawPts[2].y);
                                    overlayCtx.lineTo(drawPts[3].x, drawPts[3].y);
                                    overlayCtx.closePath();
                                    overlayCtx.stroke();
                                    overlayCtx.fillStyle = 'rgba(16, 185, 129, 0.2)';
                                    overlayCtx.fill();
                                } else {
                                    detectedQuadRef.current = null;
                                    setIsDocumentDetected(false);
                                }
                            }
                        }

                        src.delete(); gray.delete(); edges.delete();
                        contours.delete(); hierarchy.delete();
                        if (maxContour) maxContour.delete();

                    } catch (e) {
                        console.error("CV Error", e);
                    }
                }
            }
            animationRef.current = requestAnimationFrame(detectFrame);
        };

        animationRef.current = requestAnimationFrame(detectFrame);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [stage, cvReady]);

    const capture = useCallback(() => {
        const image = webcamRef.current?.getScreenshot();
        if (image) {
            setImageSrc(image);

            if (detectedQuadRef.current && cvReady) {
                const cv = window.cv;
                const img = new Image();
                img.onload = () => {
                    const src = cv.imread(img);

                    const pts = detectedQuadRef.current!.map(p => ({
                        x: p.x * src.cols,
                        y: p.y * src.rows
                    }));

                    const w1 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                    const w2 = Math.hypot(pts[2].x - pts[3].x, pts[2].y - pts[3].y);
                    const h1 = Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y);
                    const h2 = Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y);

                    const outW = Math.max(w1, w2);
                    const outH = Math.max(h1, h2);

                    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                        pts[0].x, pts[0].y,
                        pts[1].x, pts[1].y,
                        pts[2].x, pts[2].y,
                        pts[3].x, pts[3].y
                    ]);

                    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH]);
                    let M = cv.getPerspectiveTransform(srcTri, dstTri);

                    let finalImage = new cv.Mat();
                    cv.warpPerspective(src, finalImage, M, new cv.Size(outW, outH));

                    const canvas = document.createElement('canvas');
                    cv.imshow(canvas, finalImage);

                    setCurrentCropped(canvas.toDataURL('image/jpeg', 0.95));
                    setStage('review_page');

                    src.delete(); srcTri.delete(); dstTri.delete(); M.delete(); finalImage.delete();
                };
                img.src = image;
            } else {
                setStage('crop');
            }
        }
    }, [webcamRef, cvReady]);

    const confirmCrop = () => {
        if (!imageSrc || !cvReady) return;
        const cv = window.cv;
        const img = new Image();
        img.onload = () => {
            const src = cv.imread(img);

            // 1. DOWNSCALE (Performance & Noise Reduction)
            let detectionSrc = new cv.Mat();
            const scaleFactor = 800 / src.cols;
            const dSize = new cv.Size(src.cols * scaleFactor, src.rows * scaleFactor);
            cv.resize(src, detectionSrc, dSize, 0, 0, cv.INTER_AREA);

            // 2. PROCESSING
            let gray = new cv.Mat();
            cv.cvtColor(detectionSrc, gray, cv.COLOR_RGBA2GRAY, 0);

            // Use GaussianBlur to reduce noise
            cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

            // Canny Edges - Lower thresholds to catch faint edges
            let edges = new cv.Mat();
            cv.Canny(gray, edges, 50, 150); // Lowered from 75,200

            // Dilate strongly to close gaps in paper edges
            let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
            cv.dilate(edges, edges, kernel); // 1 iteration usually enough with 5x5

            // 3. FIND CONTOURS
            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let maxArea = 0;
            let maxContour = null;
            const minArea = (detectionSrc.cols * detectionSrc.rows) * 0.05;

            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt);

                if (area > minArea) {
                    let peri = cv.arcLength(cnt, true);
                    let approx = new cv.Mat();
                    // Relax epsilon slightly to 0.03 to tolerate slightly curved pages
                    cv.approxPolyDP(cnt, approx, 0.03 * peri, true);

                    if (area > maxArea) {
                        // Prefer 4 corners, but if not, we can potentially use bounding rect
                        // For now, prioritize quads
                        if (approx.rows === 4 && cv.isContourConvex(approx)) {
                            maxArea = area;
                            if (maxContour) maxContour.delete();
                            maxContour = approx;
                        } else {
                            // Backup: keep looking, but don't discard if we don't find a quad immediately
                            approx.delete();
                        }
                    } else {
                        approx.delete();
                    }
                }
            }

            // 4. WARP
            let finalImage = new cv.Mat();

            if (maxContour) {
                let pts = [];
                for (let i = 0; i < 4; i++) {
                    pts.push({ x: maxContour.data32S[i * 2], y: maxContour.data32S[i * 2 + 1] });
                }

                // Sort: TL, TR, BR, BL
                let sortedPts = new Array(4);
                let sums = pts.map(p => p.x + p.y);
                let diffs = pts.map(p => p.y - p.x);

                sortedPts[0] = pts[sums.indexOf(Math.min(...sums))]; // TL
                sortedPts[2] = pts[sums.indexOf(Math.max(...sums))]; // BR
                sortedPts[1] = pts[diffs.indexOf(Math.min(...diffs))]; // TR
                sortedPts[3] = pts[diffs.indexOf(Math.max(...diffs))]; // BL

                // Scale up
                const realPts = sortedPts.map(p => ({
                    x: p.x / scaleFactor,
                    y: p.y / scaleFactor
                }));

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
                // FALLBACK: If no quad found, use original image
                // Optional: We could try to use bounding rect of largest contour if maxArea > 0
                // For now, full image is safer fallback
                src.copyTo(finalImage);
            }

            const canvas = document.createElement('canvas');
            cv.imshow(canvas, finalImage);
            setCurrentCropped(canvas.toDataURL('image/jpeg', 0.95));
            setStage('review_page');

            src.delete(); detectionSrc.delete(); gray.delete(); edges.delete();
            kernel.delete(); contours.delete(); hierarchy.delete();
            if (maxContour) maxContour.delete();
            finalImage.delete();
        };
        img.src = imageSrc;
    };

    const addPage = () => {
        if (currentCropped) {
            setPages([...pages, currentCropped]);
            setCurrentCropped(null);
            setImageSrc(null);
            setStage('camera');
        }
    };

    const finishScanning = () => {
        if (currentCropped) {
            setPages([...pages, currentCropped]);
            setCurrentCropped(null);
            setImageSrc(null);
        }
        setStage('details');
    };

    const generatePDFAndUpload = async () => {
        if (pages.length === 0) return;
        setStage('uploading');

        try {
            const doc = new jsPDF();

            for (let i = 0; i < pages.length; i++) {
                if (i > 0) doc.addPage();

                const imgData = pages[i];
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            <ChevronLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Pemindai Pintar</h1>
                            <p className="text-sm md:text-base text-slate-500">
                                {stage === 'camera' && 'Halaman ' + (pages.length + 1)}
                                {stage === 'crop' && 'Proses Crop...'}
                                {stage === 'review_page' && 'Tinjau Halaman'}
                                {stage === 'details' && 'Total ' + pages.length + ' Halaman'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6">

                    {/* CAMERA STAGE */}
                    {stage === 'camera' && (
                        <div className="w-full flex flex-col items-center gap-8">
                            <div className="relative w-full aspect-[3/4] max-w-[400px] bg-black rounded-[3rem] overflow-hidden shadow-2xl border-8 border-slate-900 mx-auto group">
                                <Webcam
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    screenshotQuality={1}
                                    className="w-full h-full object-cover"
                                    videoConstraints={{ facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }}
                                />
                                <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent" />

                                <div className="absolute inset-16 border-2 border-white/30 rounded-lg flex items-center justify-center pointer-events-none">
                                    <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                                    <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                                    <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                                    <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                                </div>

                                {!cvReady && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-8">
                                        <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mb-4" />
                                        <p className="text-lg font-bold">Memuat Sistem...</p>
                                    </div>
                                )}
                            </div>

                            {/* Capture Button */}
                            <div className="flex items-center gap-6">
                                {pages.length > 0 && (
                                    <button onClick={() => setStage('details')} className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200">
                                        {pages.length}
                                    </button>
                                )}
                                <button onClick={capture} disabled={!cvReady} className="h-24 w-24 rounded-full border-4 border-slate-200 p-1.5 active:scale-95 transition-transform">
                                    <div className="h-full w-full rounded-full bg-blue-600 flex items-center justify-center shadow-lg hover:bg-blue-700">
                                        <Camera className="h-10 w-10 text-white" />
                                    </div>
                                </button>
                                {pages.length > 0 && <div className="w-14" />}
                            </div>
                        </div>
                    )}

                    {/* CROP / PREVIEW STAGE */}
                    {stage === 'crop' && imageSrc && (
                        <div className="w-full flex flex-col items-center gap-6">
                            <div className="relative w-full aspect-[3/4] max-w-[400px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-50">
                                <img src={imageSrc} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex gap-4">
                                <Button variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setStage('camera')}>Ulangi</Button>
                                <Button className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={confirmCrop}>
                                    <Scissors className="mr-2 h-4 w-4" /> Auto Crop
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* REVIEW SINGLE PAGE STAGE */}
                    {stage === 'review_page' && currentCropped && (
                        <div className="w-full flex flex-col items-center gap-6 animate-in slide-in-from-bottom duration-300">
                            <h2 className="text-xl font-bold text-slate-800">Hasil Scan</h2>
                            <div className="relative w-full aspect-[3/4] max-w-[350px] rounded-[2rem] overflow-hidden shadow-xl border-4 border-white">
                                <img src={currentCropped} className="w-full h-full object-contain bg-slate-200" />
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-[350px]">
                                <Button className="h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-lg font-bold" onClick={addPage}>
                                    <Camera className="mr-2 h-5 w-5" /> Scan Halaman Lain
                                </Button>
                                <Button variant="secondary" className="h-14 rounded-xl text-lg font-bold text-slate-700" onClick={finishScanning}>
                                    <Check className="mr-2 h-5 w-5" /> Selesai ({pages.length + 1})
                                </Button>
                                <Button variant="ghost" className="text-slate-500" onClick={() => setStage('camera')}>Hapus & Foto Ulang</Button>
                            </div>
                        </div>
                    )}

                    {/* DETAILS / SUMMARY STAGE */}
                    {stage === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                            {/* Page Grid */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {pages.map((p, idx) => (
                                        <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 group">
                                            <img src={p} className="w-full h-full object-cover" />
                                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md font-bold">{idx + 1}</div>
                                            <button
                                                onClick={() => setPages(pages.filter((_, i) => i !== idx))}
                                                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => setStage('camera')} className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                        <Camera className="h-8 w-8 mb-2" />
                                        <span className="text-xs font-bold">+ Halaman</span>
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl space-y-6 h-fit">
                                <h3 className="text-xl font-bold text-slate-800">Detail Dokumen ({pages.length} Halaman)</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Judul Dokumen</Label>
                                        <Input placeholder="Contoh: SKTM 2024" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tahun</Label>
                                        <Input type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kategori</Label>
                                        <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                                            <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                            <SelectContent>
                                                {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={generatePDFAndUpload} disabled={pages.length === 0 || !formData.title || !formData.category_id}>
                                    <Upload className="mr-2 h-5 w-5" /> Simpan PDF
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* UPLOADING & SUCCESS STATES REMAIN SAME */}
                    {stage === 'uploading' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center animate-pulse">
                            <RefreshCw className="h-16 w-16 text-blue-600 animate-spin mb-6" />
                            <h3 className="text-xl font-bold">Sedang Mengunggah...</h3>
                            <p className="text-slate-500">Menggabungkan {pages.length} halaman menjadi PDF</p>
                        </div>
                    )}

                    {stage === 'success' && (
                        <div className="text-center py-12">
                            <div className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="h-12 w-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Berhasil Disimpan!</h2>
                            <Button onClick={() => { setPages([]); setStage('camera'); }} className="mt-6 rounded-xl h-12 px-8">Scan Baru</Button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
