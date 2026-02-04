
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Scissors, FileText, Check, Upload, RefreshCw, ChevronLeft, Loader2, X, Archive, RotateCcw, Zap, ZapOff, Eye, EyeOff } from 'lucide-react';
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
    const isProcessingRef = useRef(false);
    const [isDocumentDetected, setIsDocumentDetected] = useState(false);
    const [scanStatus, setScanStatus] = useState<string>('Menunggu OpenCV...');

    // Manual Corner Adjustment
    const [manualCorners, setManualCorners] = useState<{ x: number, y: number }[] | null>(null);
    const draggingCornerRef = useRef<number | null>(null);

    // Torch State
    const [torchOn, setTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);

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
                setScanStatus('OpenCV Siap. Menunggu Kamera...');
                clearInterval(checkCv);
            }
        }, 500);
        return () => clearInterval(checkCv);
    }, []);

    // Check Torch Capability
    useEffect(() => {
        if (stage !== 'camera') return;

        const checkTorch = setInterval(() => {
            if (webcamRef.current && webcamRef.current.stream) {
                const track = webcamRef.current.stream.getVideoTracks()[0];
                const capabilities = track.getCapabilities();
                // @ts-ignore
                if (capabilities.torch) {
                    setHasTorch(true);
                }
                clearInterval(checkTorch);
            }
        }, 1000);
        return () => clearInterval(checkTorch);
    }, [stage]);

    const toggleTorch = useCallback(() => {
        if (webcamRef.current && webcamRef.current.stream) {
            const track = webcamRef.current.stream.getVideoTracks()[0];
            const newMode = !torchOn;

            track.applyConstraints({
                advanced: [{ torch: newMode }]
            } as any).then(() => {
                setTorchOn(newMode);
            }).catch(e => console.error(e));
        }
    }, [torchOn, webcamRef]);

    // Manual Corner Handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const activeQuad = manualCorners || detectedQuadRef.current;

        if (activeQuad) {
            const threshold = 0.1;
            const closestIdx = activeQuad.findIndex(p => Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold);
            if (closestIdx !== -1) {
                draggingCornerRef.current = closestIdx;
                if (!manualCorners) setManualCorners([...activeQuad]);
                e.currentTarget.setPointerCapture(e.pointerId);
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (draggingCornerRef.current !== null && manualCorners) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

            const newCorners = [...manualCorners];
            newCorners[draggingCornerRef.current] = { x, y };
            setManualCorners(newCorners);
            detectedQuadRef.current = newCorners;
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        draggingCornerRef.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    // Smoothing History
    const prevQuadsRef = useRef<Array<{ x: number, y: number }[]>>([]);

    // Debug Mode State
    const [debugMode, setDebugMode] = useState(false);

    // Real-time Detection Loop (Interval Based)
    useEffect(() => {
        if (!cvReady || stage !== 'camera') return;

        const interval = setInterval(() => {
            if (isProcessingRef.current) return;

            if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
                isProcessingRef.current = true;
                const video = webcamRef.current.video;
                const cv = window.cv;

                const processCanvas = document.createElement('canvas');
                const workWidth = 500;
                const scale = workWidth / video.videoWidth;
                const workHeight = video.videoHeight * scale;

                processCanvas.width = workWidth;
                processCanvas.height = workHeight;
                const ctx = processCanvas.getContext('2d');

                if (ctx) {
                    ctx.drawImage(video, 0, 0, workWidth, workHeight);

                    let src = null, gray = null, blurred = null, edges = null, closed = null;
                    let contours = null, hierarchy = null;
                    let foundQuad = null;

                    try {
                        src = cv.imread(processCanvas);
                        gray = new cv.Mat();
                        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

                        // 1. Preprocessing: GaussianBlur (5x5)
                        blurred = new cv.Mat();
                        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

                        // 2. Edge Detection: Canny with lower upper-threshold (100)
                        edges = new cv.Mat();
                        cv.Canny(blurred, edges, 30, 100);

                        // 3. Morphology: Close gaps (Better than dilate for broken lines)
                        closed = new cv.Mat();
                        let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
                        cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
                        kernel.delete();

                        // 4. Contour Finding
                        contours = new cv.MatVector();
                        hierarchy = new cv.Mat();
                        cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                        let maxArea = 0;
                        const minArea = (workWidth * workHeight) * 0.05; // 5% area threshold

                        for (let i = 0; i < contours.size(); ++i) {
                            let cnt = contours.get(i); // Allocates memory
                            let area = cv.contourArea(cnt);

                            if (area > minArea) {
                                let peri = cv.arcLength(cnt, true);
                                let tmpApprox = new cv.Mat();
                                // Relax epsilon to 0.04 to tolerate slight curves
                                cv.approxPolyDP(cnt, tmpApprox, 0.04 * peri, true);

                                if (area > maxArea && tmpApprox.rows === 4 && cv.isContourConvex(tmpApprox)) {
                                    maxArea = area;
                                    if (foundQuad) foundQuad.delete();
                                    foundQuad = tmpApprox; // Keep reference to valid quad
                                } else {
                                    tmpApprox.delete();
                                }
                            }
                            cnt.delete(); // CRITICAL: Delete contour immediately
                        }

                        // 6. Point Sorting & Output
                        let activeQuad = null;

                        if (manualCorners) {
                            activeQuad = manualCorners;
                            detectedQuadRef.current = manualCorners;
                            setIsDocumentDetected(true);
                            setScanStatus("Mode Manual: Geser Sudut");
                        } else if (foundQuad) {
                            const data = foundQuad.data32S;
                            const pts = [
                                { x: data[0], y: data[1] },
                                { x: data[2], y: data[3] },
                                { x: data[4], y: data[5] },
                                { x: data[6], y: data[7] }
                            ];

                            // Robust Sorting: TL, TR, BR, BL
                            // 1. Sort by Y to get Top 2 and Bottom 2
                            pts.sort((a, b) => a.y - b.y);

                            const top = pts.slice(0, 2).sort((a, b) => a.x - b.x); // Sort Top by X -> TL, TR
                            const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x); // Sort Bottom by X -> BL, BR

                            const sortedPts = [top[0], top[1], bottom[1], bottom[0]];

                            activeQuad = sortedPts.map(p => ({
                                x: p.x / workWidth,
                                y: p.y / workHeight
                            }));

                            detectedQuadRef.current = activeQuad;
                            setIsDocumentDetected(true);
                            setScanStatus("DOKUMEN TERDETEKSI!");
                        } else {
                            detectedQuadRef.current = null;
                            setIsDocumentDetected(false);
                            setScanStatus("Mencari Dokumen...");
                        }

                        // Draw Overlay OR Debug View
                        const overlay = canvasRef.current;
                        if (overlay) {
                            overlay.width = video.clientWidth;
                            overlay.height = video.clientHeight;
                            const overlayCtx = overlay.getContext('2d');
                            if (overlayCtx) {
                                if (debugMode) {
                                    // DEBUG VIEW: Render the 'closed' edge detection mat
                                    let debugImg = new cv.Mat();
                                    // Resize to fit canvas
                                    cv.resize(closed, debugImg, new cv.Size(overlay.width, overlay.height));
                                    cv.imshow(overlay, debugImg);
                                    debugImg.delete();
                                } else {
                                    // NORMAL OVERLAY VIEW
                                    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
                                    if (activeQuad) {
                                        const drawPts = activeQuad.map(p => ({
                                            x: p.x * overlay.width,
                                            y: p.y * overlay.height
                                        }));
                                        overlayCtx.beginPath();
                                        overlayCtx.lineWidth = 4;
                                        overlayCtx.strokeStyle = manualCorners ? '#fbbf24' : '#10b981';
                                        overlayCtx.lineCap = 'round';
                                        overlayCtx.lineJoin = 'round';
                                        overlayCtx.moveTo(drawPts[0].x, drawPts[0].y);
                                        overlayCtx.lineTo(drawPts[1].x, drawPts[1].y);
                                        overlayCtx.lineTo(drawPts[2].x, drawPts[2].y);
                                        overlayCtx.lineTo(drawPts[3].x, drawPts[3].y);
                                        overlayCtx.closePath();
                                        overlayCtx.stroke();

                                        // Handles
                                        activeQuad.forEach(p => {
                                            const cx = p.x * overlay.width;
                                            const cy = p.y * overlay.height;
                                            overlayCtx.beginPath();
                                            overlayCtx.arc(cx, cy, 6, 0, 2 * Math.PI);
                                            overlayCtx.fillStyle = '#fff';
                                            overlayCtx.fill();
                                            overlayCtx.stroke();
                                        });
                                    }
                                }
                            }
                        }

                        // Cleanup (Explicit)
                        if (foundQuad) foundQuad.delete();
                    } catch (e) {
                        console.error("CV Error", e);
                    } finally {
                        if (src) src.delete();
                        if (gray) gray.delete();
                        if (blurred) blurred.delete();
                        if (edges) edges.delete();
                        if (closed) closed.delete();
                        if (contours) contours.delete();
                        if (hierarchy) hierarchy.delete();
                        isProcessingRef.current = false;
                    }
                } else {
                    isProcessingRef.current = false;
                }
            }
        }, 150);

        return () => clearInterval(interval);
    }, [stage, cvReady, debugMode]);



    const capture = useCallback(() => {
        const image = webcamRef.current?.getScreenshot();
        if (image) {
            setImageSrc(image);

            // Initialize manual corners with detected quad if available, else full screen
            if (detectedQuadRef.current) {
                setManualCorners(detectedQuadRef.current);
            } else {
                setManualCorners([
                    { x: 0.1, y: 0.1 },
                    { x: 0.9, y: 0.1 },
                    { x: 0.9, y: 0.9 },
                    { x: 0.1, y: 0.9 }
                ]);
            }
            setStage('crop'); // Go to crop stage for confirmation
        }
    }, [webcamRef]);

    const confirmCrop = () => {
        if (!imageSrc || !cvReady) return;
        const cv = window.cv;
        const img = new Image();
        img.onload = () => {
            let src = null, finalImage = null, srcTri = null, dstTri = null, M = null;
            try {
                src = cv.imread(img);

                // Use valid points or default to full image
                let corners = manualCorners || detectedQuadRef.current;

                if (corners) {
                    // Map normalized points to actual image dimensions
                    const pts = corners.map(p => ({
                        x: p.x * src.cols,
                        y: p.y * src.rows
                    }));

                    const w1 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                    const w2 = Math.hypot(pts[2].x - pts[3].x, pts[2].y - pts[3].y);
                    const h1 = Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y);
                    const h2 = Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y);

                    const outW = Math.max(w1, w2);
                    const outH = Math.max(h1, h2);

                    // Source Points (TL, TR, BR, BL) - corners are already sorted by detection/UI
                    srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                        pts[0].x, pts[0].y,
                        pts[1].x, pts[1].y,
                        pts[2].x, pts[2].y,
                        pts[3].x, pts[3].y
                    ]);

                    dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH]);
                    M = cv.getPerspectiveTransform(srcTri, dstTri);

                    finalImage = new cv.Mat();
                    cv.warpPerspective(src, finalImage, M, new cv.Size(outW, outH));
                } else {
                    // Fallback: Copy full image (should rarely happen given default in capture)
                    finalImage = src.clone();
                }

                const canvas = document.createElement('canvas');
                cv.imshow(canvas, finalImage);
                setCurrentCropped(canvas.toDataURL('image/jpeg', 0.90));
                setStage('review_page');

            } catch (e) {
                console.error("Crop Error", e);
            } finally {
                if (src) src.delete();
                if (finalImage) finalImage.delete();
                if (srcTri) srcTri.delete();
                if (dstTri) dstTri.delete();
                if (M) M.delete();
            }
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
                            {/* Container adjusted to fit video naturally */}
                            <div className="relative w-full max-w-[480px] bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 mx-auto group">
                                <Webcam
                                    ref={webcamRef}
                                    className="w-full h-auto block"
                                    videoConstraints={{ facingMode: 'environment', width: { ideal: 3840 }, height: { ideal: 2160 } }}
                                />
                                {/* Real-time Detection Overlay */}
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                />

                                {/* Debug Badge */}
                                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                                        <div className={`text-xs font-mono font-bold flex items-center gap-2 ${isDocumentDetected ? 'text-emerald-400' : 'text-slate-200'}`}>
                                            <div className={`w-2 h-2 rounded-full ${isDocumentDetected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                                            {scanStatus}
                                        </div>
                                    </div>
                                </div>

                                {/* Torch Button */}
                                {hasTorch && (
                                    <div className="absolute top-4 right-4 z-20 flex gap-4">
                                        <button
                                            onClick={() => setDebugMode(!debugMode)}
                                            className={`p-3 rounded-full backdrop-blur-md border transition-all ${debugMode
                                                ? 'bg-rose-500/80 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                                                : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
                                                }`}
                                        >
                                            {debugMode ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={toggleTorch}
                                            className={`p-3 rounded-full backdrop-blur-md border transition-all ${torchOn
                                                ? 'bg-amber-400/20 border-amber-400/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                                                : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
                                                }`}
                                        >
                                            {torchOn ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                                        </button>
                                    </div>
                                )}

                                <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

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
