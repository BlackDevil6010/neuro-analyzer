import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfCanvasViewerProps {
    data: string | ArrayBuffer | Blob | null;
    rotation?: number;
    className?: string;
}

export default function PdfCanvasViewer({ data, rotation = 0, className = '' }: PdfCanvasViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(1);
    const [pageNum, setPageNum] = useState<number>(1);
    const [containerWidth, setContainerWidth] = useState<number>(340);
    const [scale, setScale] = useState<number>(0.95);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Track container width changes to resize canvas responsively
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Load PDF document whenever data changes
    useEffect(() => {
        let isCancelled = false;

        async function loadDocument() {
            if (!data) {
                setPdfDoc(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                let arrayBuffer: ArrayBuffer;
                if (typeof data === 'string') {
                    if (data.startsWith('blob:') || data.startsWith('http:') || data.startsWith('file:')) {
                        const response = await fetch(data);
                        arrayBuffer = await response.arrayBuffer();
                    } else {
                        // base64 or other URL
                        const res = await fetch(data);
                        arrayBuffer = await res.arrayBuffer();
                    }
                } else if (data instanceof Blob) {
                    arrayBuffer = await data.arrayBuffer();
                } else {
                    arrayBuffer = data;
                }

                if (isCancelled) return;

                const loadingTask = pdfjsLib.getDocument({
                    data: new Uint8Array(arrayBuffer),
                    cMapUrl: undefined,
                    standardFontDataUrl: undefined
                });

                const loadedDoc = await loadingTask.promise;
                if (isCancelled) return;

                setPdfDoc(loadedDoc);
                setNumPages(loadedDoc.numPages);
                setPageNum(1);
            } catch (err: any) {
                if (!isCancelled) {
                    console.error('Failed to load PDF in canvas viewer:', err);
                    setError('Failed to load PDF preview');
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        }

        loadDocument();

        return () => {
            isCancelled = true;
        };
    }, [data]);

    // Render current page onto canvas
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        let renderTask: any = null;
        let isCancelled = false;

        async function renderPage() {
            try {
                const page = await pdfDoc.getPage(pageNum);
                if (isCancelled || !canvasRef.current) return;

                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Compute scale: fit container width nicely or use scale state
                const currentW = containerWidth || containerRef.current?.clientWidth || 340;
                const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
                const fitScale = (currentW - 24) / unscaledViewport.width;
                const effectiveScale = Math.max(0.4, (fitScale > 0 ? fitScale : 0.8) * scale);

                const viewport = page.getViewport({ scale: effectiveScale, rotation });
                const outputScale = window.devicePixelRatio || 1;

                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);
                canvas.style.width = `${Math.floor(viewport.width)}px`;
                canvas.style.height = `${Math.floor(viewport.height)}px`;

                const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

                renderTask = page.render({
                    canvasContext: ctx,
                    transform,
                    viewport
                });

                await renderTask.promise;
            } catch (err: any) {
                if (err?.name !== 'RenderingCancelledException') {
                    console.error('Canvas render error:', err);
                }
            }
        }

        renderPage();

        return () => {
            isCancelled = true;
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, [pdfDoc, pageNum, scale, rotation, containerWidth]);

    return (
        <div className={`flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden ${className}`}>
            {/* Top Toolbar: Page Nav & Zoom Controls */}
            {pdfDoc && numPages > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200 text-xs text-slate-700 select-none shrink-0 shadow-2xs">
                    {/* Page Navigator */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPageNum(p => Math.max(1, p - 1))}
                            disabled={pageNum <= 1}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                            title="Previous Page"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span className="font-bold text-[11px] px-1 text-slate-600">
                            {pageNum} / {numPages}
                        </span>
                        <button
                            onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
                            disabled={pageNum >= numPages}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                            title="Next Page"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setScale(s => Math.max(0.5, s - 0.15))}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={14} />
                        </button>
                        <span className="text-[10px] font-semibold text-slate-500 w-9 text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Canvas Viewport */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-auto p-3 flex items-start justify-center bg-slate-200/70"
            >
                {loading && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2 py-12">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Rendering PDF preview...</span>
                    </div>
                )}

                {error && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-red-500 text-xs p-4 text-center">
                        <p className="font-semibold">{error}</p>
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    className={`bg-white rounded shadow-md border border-slate-300 transition-opacity duration-200 ${
                        loading ? 'opacity-0' : 'opacity-100'
                    }`}
                />
            </div>
        </div>
    );
}
