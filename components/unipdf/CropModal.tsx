import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Maximize, Scissors, Loader2 } from 'lucide-react';

interface CropModalProps {
  isOpen: boolean;
  image: string;
  onClose: () => void;
  onSave: (croppedImage: Blob) => void;
}

export const CropModal: React.FC<CropModalProps> = ({ isOpen, image, onClose, onSave }) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Resetar quando abrir
  useEffect(() => {
    if (isOpen) {
      setIsReady(false);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, image]);

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    if (width === 0 || height === 0) return;

    // Criar um quadrado de 80% do menor lado, centralizado
    const size = Math.min(width, height) * 0.8;
    const initialCrop: PixelCrop = {
      unit: 'px',
      width: size,
      height: size,
      x: (width - size) / 2,
      y: (height - size) / 2,
    };

    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
    setIsReady(true);
  }

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop,
    rotate = 0
  ): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();
    ctx.translate(-crop.x * scaleX, -crop.y * scaleY);
    ctx.translate(centerX, centerY);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
    });
  };

  const handleSave = async () => {
    if (completedCrop && imgRef.current) {
      const blob = await getCroppedImg(imgRef.current, completedCrop, rotation);
      if (blob) onSave(blob);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-md text-white border-b border-white/10 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/10 rounded-full transition-all active:scale-90"
          >
            <X size={22} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase">
              <Scissors size={18} className="text-indigo-400" />
              Recorte Livre
            </h2>
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest leading-none">
              Quadro de seleção de 80% ativo
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!isReady}
          className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl font-black transition-all shadow-xl active:scale-95"
        >
          <Check size={20} />
          Salvar
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-auto">
        {/* Hidden image used only to trigger dimensions capture */}
        {!isReady && (
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest">Preparando editor...</p>
            <img
              src={image}
              onLoad={handleImageLoad}
              style={{ display: 'none' }}
              alt="Loading..."
            />
          </div>
        )}

        {/* Real editor mounted only when dimensions are known */}
        {isReady && (
          <div className="relative inline-block border border-white/20 animate-in zoom-in-95 duration-200">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              className="manual-crop-container"
            >
              <img
                ref={imgRef}
                alt="Crop area"
                src={image}
                style={{
                  maxHeight: '70vh',
                  maxWidth: '100%',
                  display: 'block',
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: 'transform 0.1s ease-out',
                }}
              />
            </ReactCrop>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 bg-slate-900 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-10 items-center justify-center">
          <div className="flex-1 w-full space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Zoom</span>
              <span className="text-indigo-400">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              value={zoom}
              min={0.5}
              max={2}
              step={0.01}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-indigo-500"
            />
          </div>

          <div className="flex-1 w-full space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Rotação</span>
              <span className="text-indigo-400">{rotation}°</span>
            </div>
            <input
              type="range"
              value={rotation}
              min={-180}
              max={180}
              step={1}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-indigo-500"
            />
          </div>

            <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Maximize size={18} className="text-indigo-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Mova as alças brancas para ajustar.
                <br />
                O quadro de 80% é automático.
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};
