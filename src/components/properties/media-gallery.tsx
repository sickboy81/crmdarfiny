'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Play,
  Pause,
} from 'lucide-react'
import type { Property } from '@/lib/properties/types'

interface MediaGalleryProps {
  photos: string[]
  videoUrl?: string | null
  className?: string
}

export function MediaGallery({ photos, videoUrl, className }: MediaGalleryProps) {
  const t = useTranslations('properties')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Constrói a lista completa de mídia (fotos + vídeo)
  const mediaItems = [
    ...photos,
    ...(videoUrl ? [videoUrl] : []),
  ]
  const hasVideo = !!videoUrl

  const goTo = useCallback(
    (index: number) => {
      const next = (index + mediaItems.length) % mediaItems.length
      setCurrentIndex(next)
    },
    [mediaItems.length],
  )

  const openLightbox = useCallback(
    (index?: number) => {
      setLightboxIndex(index ?? currentIndex)
      setLightboxOpen(true)
    },
    [currentIndex],
  )

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
  }, [])

  // Navegação por teclado no lightbox
  useEffect(() => {
    if (!lightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox()
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % mediaItems.length)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, closeLightbox, mediaItems.length])

  // Estado vazio
  if (mediaItems.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center ${className ?? ''}`}
      >
        <svg
          className="mb-3 h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
          />
        </svg>
        <p className="text-sm text-gray-500">{t('noMedia') ?? 'Nenhuma mídia disponível'}</p>
      </div>
    )
  }

  const isVideoIndex = (index: number) => hasVideo && index === photos.length

  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      {/* Área principal */}
      <div
        className="relative group cursor-pointer overflow-hidden rounded-lg bg-black"
        onDoubleClick={() => openLightbox(currentIndex)}
      >
        {isVideoIndex(currentIndex) ? (
          <video
            src={mediaItems[currentIndex]}
            controls
            className="aspect-video w-full object-contain"
          />
        ) : (
          <img
            src={mediaItems[currentIndex]}
            alt={`Mídia ${currentIndex + 1}`}
            className="aspect-video w-full object-cover transition-opacity duration-300"
          />
        )}

        {/* Botão de ampliar */}
        <button
          onClick={() => openLightbox(currentIndex)}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
          aria-label="Abrir em tela cheia"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Seta esquerda */}
        {mediaItems.length > 1 && (
          <button
            onClick={() => goTo(currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Seta direita */}
        {mediaItems.length > 1 && (
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            aria-label="Próximo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Indicador de vídeo */}
        {isVideoIndex(currentIndex) && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            <Play className="h-3 w-3" />
            {t('video') ?? 'Vídeo'}
          </div>
        )}

        {/* Contador */}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {currentIndex + 1}/{mediaItems.length}
        </div>
      </div>

      {/* Faixa de miniaturas */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {mediaItems.map((src, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`relative h-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
              i === currentIndex
                ? 'border-blue-500 ring-1 ring-blue-500'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            {isVideoIndex(i) ? (
              <>
                <img
                  src={src}
                  alt={`Miniatura vídeo ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-4 w-4 text-white" fill="white" />
                </div>
              </>
            ) : (
              <img
                src={src}
                alt={`Miniatura ${i + 1}`}
                className="h-full w-full object-cover"
              />
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Botão fechar */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Contador */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 text-sm text-white/80">
            {lightboxIndex + 1}/{mediaItems.length}
          </div>

          {/* Seta esquerda */}
          {mediaItems.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
              }}
              className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Seta direita */}
          {mediaItems.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((prev) => (prev + 1) % mediaItems.length)
              }}
              className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              aria-label="Próximo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Conteúdo do lightbox */}
          <div
            className="flex max-h-[85vh] max-w-[90vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideoIndex(lightboxIndex) ? (
              <video
                src={mediaItems[lightboxIndex]}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[90vw] object-contain"
              />
            ) : (
              <img
                src={mediaItems[lightboxIndex]}
                alt={`Mídia ${lightboxIndex + 1}`}
                className="max-h-[85vh] max-w-[90vw] object-contain transition-opacity duration-200"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
