'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Check, Maximize, Scissors, Loader2, ZoomIn, RotateCw } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface CropModalProps {
  isOpen: boolean
  image: string
  onClose: () => void
  onSave: (croppedImage: Blob) => void
}

export const CropModal: React.FC<CropModalProps> = ({ isOpen, image, onClose, onSave }) => {
  const t = useTranslations('pdf')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (isOpen) {
      setIsReady(false)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setZoom(1)
      setRotation(0)
    }
  }, [isOpen, image])

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    if (width === 0 || height === 0) return

    const size = Math.min(width, height) * 0.8
    const initialCrop: PixelCrop = {
      unit: 'px',
      width: size,
      height: size,
      x: (width - size) / 2,
      y: (height - size) / 2,
    }

    setCrop(initialCrop)
    setCompletedCrop(initialCrop)
    setIsReady(true)
  }

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop,
    rotate = 0
  ): Promise<Blob | null> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const pixelRatio = window.devicePixelRatio || 1

    canvas.width = Math.floor(crop.width * scaleX * pixelRatio)
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio)

    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingQuality = 'high'

    const centerX = image.naturalWidth / 2
    const centerY = image.naturalHeight / 2

    ctx.save()
    ctx.translate(-crop.x * scaleX, -crop.y * scaleY)
    ctx.translate(centerX, centerY)
    ctx.rotate((rotate * Math.PI) / 180)
    ctx.translate(-centerX, -centerY)

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
    )
    ctx.restore()

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95)
    })
  }

  const handleSave = async () => {
    if (completedCrop && imgRef.current) {
      const blob = await getCroppedImg(imgRef.current, completedCrop, rotation)
      if (blob) onSave(blob)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950/95 text-zinc-100 overflow-hidden font-sans backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/90 border-b border-zinc-800 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors active:scale-95 text-zinc-400 hover:text-zinc-100"
          >
            <X size={20} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 uppercase text-zinc-200">
              <Scissors size={16} className="text-indigo-400" />
              {t('cropTitle')}
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider leading-none">
              {t('cropSubtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!isReady}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Check size={16} />
          {t('cropSave')}
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-auto bg-zinc-900/40">
        {!isReady && (
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p className="text-xs font-semibold uppercase tracking-wider">{t('cropPreparing')}</p>
            <img
              src={image}
              onLoad={handleImageLoad}
              style={{ display: 'none' }}
              alt="Loading..."
            />
          </div>
        )}

        {isReady && (
          <div className="relative inline-block border border-zinc-800 shadow-2xl rounded-lg overflow-hidden bg-zinc-900/20 max-h-[65vh]">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              className="max-h-[65vh]"
            >
              <img
                ref={imgRef}
                alt="Crop area"
                src={image}
                style={{
                  maxHeight: '60vh',
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
      <div className="p-6 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="w-full md:w-72 space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <span className="flex items-center gap-1"><ZoomIn size={12} /> {t('cropZoom')}</span>
              <span className="text-indigo-400">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              value={zoom}
              min={0.5}
              max={2.5}
              step={0.01}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="w-full md:w-72 space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <span className="flex items-center gap-1"><RotateCw size={12} /> {t('cropRotation')}</span>
              <span className="text-indigo-400">{rotation}°</span>
            </div>
            <input
              type="range"
              value={rotation}
              min={-180}
              max={180}
              step={1}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="hidden lg:flex p-3 bg-zinc-800 rounded-lg border border-zinc-800 items-center gap-3 max-w-xs">
            <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Maximize size={16} className="text-indigo-400" />
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              {t('cropHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
