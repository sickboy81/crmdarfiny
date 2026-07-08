'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Upload, RotateCcw, Download, Check, X, Sparkles, Zap, FileText, ChevronLeft, ChevronRight, Image, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

import { CornerSelector } from './corner-selector';
import { perspectiveTransform, imageToCanvas, type Point, type OutputFormat } from '@/lib/scanner/perspective';
import { enhanceImage, getPresetOptions, type EnhancementOptions, type EnhancementPreset } from '@/lib/scanner/enhance';

// Set worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Step = 'capture' | 'crop' | 'enhance' | 'done';

const PRESETS: EnhancementPreset[] = ['original', 'auto', 'grayscale', 'highContrast', 'bw'];
const PRESET_LABELS: Record<EnhancementPreset, string> = {
  original: 'Original',
  auto: 'Auto',
  grayscale: 'Escala de Cinza',
  highContrast: 'Alto Contraste',
  bw: 'Preto & Branco',
};

const OUTPUT_FORMATS: OutputFormat[] = ['free', 'auto', 'a4', 'a5', '1:1', '16:9', '9:16'];

export function DocumentScanner() {
  const t = useTranslations('scanner');
  const [step, setStep] = useState<Step>('capture');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [correctedPreview, setCorrectedPreview] = useState<string | null>(null);
  const [enhancedPreview, setEnhancedPreview] = useState<string | null>(null);
  const correctedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activePreset, setActivePreset] = useState<EnhancementPreset>('original');
  const [sliderBrightness, setSliderBrightness] = useState(0);
  const [sliderSaturation, setSliderSaturation] = useState(100);
  const [sliderContrast, setSliderContrast] = useState(100);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('auto');
  const savedCornersRef = useRef<Point[]>([]);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPdfPage, setCurrentPdfPage] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close zoom overlay on Escape
  useEffect(() => {
    if (!zoomOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoomOpen]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 4096 }, height: { ideal: 4096 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error(t('cameraError'));
    }
  }, [t]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Capture from camera
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setSourceImage(dataUrl);
    stopCamera();
    setStep('crop');
  }, [stopCamera]);

  // Render a single PDF page to a data URL
  const renderPdfPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      if (file.type === 'application/pdf') {
        // Handle PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const pages: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          const dataUrl = await renderPdfPage(pdf, i);
          pages.push(dataUrl);
        }

        setPdfPages(pages);
        setCurrentPdfPage(0);
        setSourceImage(pages[0]);
        setStep('crop');
      } else if (file.type.startsWith('image/')) {
        // Handle image
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSourceImage(ev.target?.result as string);
          setStep('crop');
        };
        reader.readAsDataURL(file);
      } else {
        toast.error(t('invalidFile'));
      }
    } catch {
      toast.error(t('invalidFile'));
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [t]);

  // Switch PDF page
  const handlePdfPageChange = useCallback((pageIndex: number) => {
    setCurrentPdfPage(pageIndex);
    setSourceImage(pdfPages[pageIndex]);
    setStep('crop');
  }, [pdfPages]);

  // Apply enhancement with explicit values
  const applyEnhancement = useCallback((
    preset: EnhancementPreset,
    brightness: number,
    saturation: number,
    contrast: number,
  ) => {
    const corrected = correctedCanvasRef.current;
    if (!corrected) return;

    const baseOptions = getPresetOptions(preset);
    const options: EnhancementOptions = {
      ...baseOptions,
      brightness: brightness / 100,
      saturation: saturation / 100,
      contrast: contrast / 100,
    };

    const enhanced = enhanceImage(corrected, options);
    const enhancedUrl = enhanced.toDataURL('image/jpeg', 0.95);
    setEnhancedPreview(enhancedUrl);
  }, []);

  // Apply perspective correction
  const handleCropConfirm = useCallback((corners: Point[]) => {
    if (!sourceImage) return;

    setIsProcessing(true);

    const img = new window.Image();
    img.onload = () => {
      const sourceCanvas = imageToCanvas(img);
      const corrected = perspectiveTransform(sourceCanvas, corners, outputFormat);

      // Keep refs for re-application
      correctedCanvasRef.current = corrected;
      savedCornersRef.current = corners;

      // Convert to data URL immediately for React state
      const correctedUrl = corrected.toDataURL('image/jpeg', 0.95);
      setCorrectedPreview(correctedUrl);

      // Apply default enhancement (original, no adjustments)
      setActivePreset('original');
      setSliderBrightness(0);
      setSliderSaturation(100);
      setSliderContrast(100);
      applyEnhancement('original', 0, 100, 100);

      setIsProcessing(false);
      setStep('enhance');
    };
    img.src = sourceImage;
  }, [sourceImage, applyEnhancement, outputFormat]);

  // Re-apply perspective transform when output format changes
  const handleFormatChange = useCallback((format: OutputFormat) => {
    setOutputFormat(format);
    if (!sourceImage || savedCornersRef.current.length === 0) return;

    setIsProcessing(true);
    const img = new window.Image();
    img.onload = () => {
      const sourceCanvas = imageToCanvas(img);
      const corrected = perspectiveTransform(sourceCanvas, savedCornersRef.current, format);
      correctedCanvasRef.current = corrected;
      setCorrectedPreview(corrected.toDataURL('image/jpeg', 0.95));

      // Re-apply current enhancement
      applyEnhancement(activePreset, sliderBrightness, sliderSaturation, sliderContrast);
      setIsProcessing(false);
    };
    img.src = sourceImage;
  }, [sourceImage, activePreset, sliderBrightness, sliderSaturation, sliderContrast, applyEnhancement]);

  // Apply enhancement preset
  const handlePresetChange = useCallback((preset: EnhancementPreset) => {
    const presetOptions = getPresetOptions(preset);
    const b = Math.round(presetOptions.brightness * 100);
    const s = Math.round(presetOptions.saturation * 100);
    const c = Math.round(presetOptions.contrast * 100);

    setActivePreset(preset);
    setSliderBrightness(b);
    setSliderSaturation(s);
    setSliderContrast(c);
    applyEnhancement(preset, b, s, c);
  }, [applyEnhancement]);

  // Download as image
  const handleDownloadImage = useCallback(() => {
    if (!enhancedPreview) return;

    const link = document.createElement('a');
    link.download = `scan_${Date.now()}.jpg`;
    link.href = enhancedPreview;
    link.click();
    toast.success(t('downloaded'));
  }, [enhancedPreview, t]);

  // Download as PDF
  const handleDownloadPdf = useCallback(() => {
    if (!enhancedPreview) return;

    // Create an image from the enhanced preview to get dimensions
    const img = new window.Image();
    img.onload = () => {
      const pdfW = img.naturalWidth;
      const pdfH = img.naturalHeight;

      const pdf = new jsPDF({
        orientation: pdfW > pdfH ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pdfW, pdfH],
      });

      pdf.addImage(enhancedPreview, 'JPEG', 0, 0, pdfW, pdfH);
      pdf.save(`scan_${Date.now()}.pdf`);
      toast.success(t('downloaded'));
    };
    img.src = enhancedPreview;
  }, [enhancedPreview, t]);

  // Start over
  const handleReset = useCallback(() => {
    setSourceImage(null);
    correctedCanvasRef.current = null;
    setCorrectedPreview(null);
    setEnhancedPreview(null);
    setPdfPages([]);
    setCurrentPdfPage(0);
    setStep('capture');
    setActivePreset('original');
    setSliderBrightness(0);
    setSliderSaturation(100);
    setSliderContrast(100);
    setOutputFormat('auto');
    savedCornersRef.current = [];
  }, []);

  // Get preview URL from canvas
  const getCanvasPreview = (url: string | null): string => {
    return url || '';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        {(['capture', 'crop', 'enhance'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : i < ['capture', 'crop', 'enhance'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span className={step === s ? 'font-medium text-foreground' : 'text-muted-foreground'}>
              {t(`step${i + 1}`)}
            </span>
            {i < 2 && <span className="mx-1 text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Capture / Upload */}
      {step === 'capture' && (
        <div className="flex flex-col items-center gap-6">
          {cameraActive ? (
            <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="block w-full"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button
                  onClick={capturePhoto}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                >
                  <Camera className="h-6 w-6" />
                </button>
                <button
                  onClick={stopCamera}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border p-12 text-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Zap className="h-8 w-8 animate-pulse text-primary" />
                  </div>
                  <p className="text-muted-foreground">{t('processing')}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border p-12 text-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">{t('captureDescription')}</p>
                  <p className="text-xs text-muted-foreground">{t('supportedFormats')}</p>
                </div>
              )}

              {pdfPages.length > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handlePdfPageChange(Math.max(0, currentPdfPage - 1))}
                    disabled={currentPdfPage === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {t('page')} {currentPdfPage + 1} / {pdfPages.length}
                  </span>
                  <button
                    onClick={() => handlePdfPageChange(Math.min(pdfPages.length - 1, currentPdfPage + 1))}
                    disabled={currentPdfPage === pdfPages.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Camera className="h-4 w-4" />
                  {t('openCamera')}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  {t('uploadImage')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Crop / Perspective Correction */}
      {step === 'crop' && sourceImage && (
        <div className="flex flex-col gap-4">
          {isProcessing ? (
            <div className="flex items-center justify-center p-12">
              <Zap className="mr-2 h-5 w-5 animate-pulse text-primary" />
              <span className="text-muted-foreground">{t('processing')}</span>
            </div>
          ) : (
            <CornerSelector
              imageSrc={sourceImage}
              onConfirm={handleCropConfirm}
              onCancel={handleReset}
            />
          )}
        </div>
      )}

      {/* Step 3: Enhancement */}
      {step === 'enhance' && enhancedPreview && (
        <div className="flex flex-col gap-4">
          <div
            className="mx-auto w-full max-w-2xl flex justify-center overflow-hidden rounded-lg border border-border bg-black py-2 cursor-zoom-in"
            onClick={() => setZoomOpen(true)}
          >
            <img
              src={enhancedPreview}
              alt={t('preview')}
              className="block max-w-full h-auto max-h-[60vh] object-contain pointer-events-none"
            />
          </div>

          {/* Output format selector */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {OUTPUT_FORMATS.map((format) => (
              <button
                key={format}
                onClick={() => handleFormatChange(format)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  outputFormat === format
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t(`format.${format}`)}
              </button>
            ))}
          </div>

          {/* Enhancement presets */}
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activePreset === preset
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
          </div>

          {/* Manual adjustment sliders */}
          <div className="mx-auto w-full max-w-md space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            {/* Brightness */}
            <div className="flex items-center gap-3">
              <label className="w-24 text-xs font-medium text-muted-foreground">{t('brightness')}</label>
              <input
                type="range"
                min={-100}
                max={100}
                value={sliderBrightness}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSliderBrightness(val);
                  applyEnhancement(activePreset, val, sliderSaturation, sliderContrast);
                }}
                className="flex-1 accent-primary"
              />
              <span className="w-10 text-right text-xs text-muted-foreground">{sliderBrightness}</span>
            </div>
            {/* Saturation */}
            <div className="flex items-center gap-3">
              <label className="w-24 text-xs font-medium text-muted-foreground">{t('saturation')}</label>
              <input
                type="range"
                min={0}
                max={200}
                value={sliderSaturation}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSliderSaturation(val);
                  applyEnhancement(activePreset, sliderBrightness, val, sliderContrast);
                }}
                className="flex-1 accent-primary"
              />
              <span className="w-10 text-right text-xs text-muted-foreground">{sliderSaturation}%</span>
            </div>
            {/* Contrast */}
            <div className="flex items-center gap-3">
              <label className="w-24 text-xs font-medium text-muted-foreground">{t('contrast')}</label>
              <input
                type="range"
                min={0}
                max={300}
                value={sliderContrast}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSliderContrast(val);
                  applyEnhancement(activePreset, sliderBrightness, sliderSaturation, val);
                }}
                className="flex-1 accent-primary"
              />
              <span className="w-10 text-right text-xs text-muted-foreground">{sliderContrast}%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              {t('startOver')}
            </button>
            <button
              onClick={handleDownloadImage}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              <Image className="h-4 w-4" />
              {t('saveAsImage')}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <FileDown className="h-4 w-4" />
              {t('saveAsPdf')}
            </button>
          </div>
        </div>
      )}

      {/* Zoom overlay */}
      {zoomOpen && enhancedPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setZoomOpen(false)}
        >
          <button
            onClick={() => setZoomOpen(false)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="w-full h-full overflow-auto flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enhancedPreview}
              alt={t('preview')}
              className="max-w-none cursor-grab active:cursor-grabbing"
              style={{ maxHeight: 'none', width: 'auto', height: 'auto' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
