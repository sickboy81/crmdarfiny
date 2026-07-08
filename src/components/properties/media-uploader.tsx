'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, X, Image, Film, GripVertical, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

interface MediaUploaderProps {
  photos: string[]
  onPhotosChange: (urls: string[]) => void
  videoUrl: string | null
  onVideoUrlChange: (url: string | null) => void
  userId?: string
  propertyId?: string
  maxPhotos?: number
}

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'
const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/quicktime'

export function MediaUploader({
  photos,
  onPhotosChange,
  videoUrl,
  onVideoUrlChange,
  userId,
  propertyId,
  maxPhotos = 20,
}: MediaUploaderProps) {
  const t = useTranslations('properties')
  const { user } = useAuth()
  const supabase = createClient()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({})
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const effectiveUserId = userId || user?.id || 'anonymous'
  const canAddMorePhotos = photos.length < maxPhotos

  const getFilePath = useCallback(
    (filename: string) => {
      const timestamp = Date.now()
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      return `${effectiveUserId}/${propertyId || 'temp'}/${timestamp}_${safeName}`
    },
    [effectiveUserId, propertyId],
  )

  const uploadFile = useCallback(
    async (file: File, bucket: string): Promise<string | null> => {
      const filePath = getFilePath(file.name)
      const { error } = await supabase.storage.from(bucket).upload(filePath, file)
      if (error) {
        toast.error(t('uploadError'))
        return null
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      return urlData.publicUrl
    },
    [supabase, getFilePath, t],
  )

  const handlePhotoFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (fileArray.length === 0) return

      const remainingSlots = maxPhotos - photos.length
      const toUpload = fileArray.slice(0, remainingSlots)

      if (fileArray.length > remainingSlots) {
        toast.warning(t('maxPhotosReached'))
      }

      const uploadIds = toUpload.map((f) => f.name + f.size)
      const loadingState: Record<string, boolean> = {}
      uploadIds.forEach((id) => { loadingState[id] = true })
      setUploadingPhotos((prev) => ({ ...prev, ...loadingState }))

      const results: string[] = []

      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i]
        const id = uploadIds[i]
        const url = await uploadFile(file, 'property-media')
        if (url) {
          results.push(url)
        }
        setUploadingPhotos((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }

      if (results.length > 0) {
        onPhotosChange([...photos, ...results])
      }
    },
    [photos, onPhotosChange, maxPhotos, uploadFile, t],
  )

  const handleVideoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) return

      setUploadingVideo(true)
      const url = await uploadFile(file, 'property-media')
      setUploadingVideo(false)

      if (url) {
        onVideoUrlChange(url)
      }
    },
    [uploadFile, onVideoUrlChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handlePhotoFiles(files)
      }
    },
    [handlePhotoFiles],
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handlePhotoFiles(files)
      }
      e.target.value = ''
    },
    [handlePhotoFiles],
  )

  const handleVideoInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleVideoFile(file)
      }
      e.target.value = ''
    },
    [handleVideoFile],
  )

  const removePhoto = useCallback(
    (index: number) => {
      onPhotosChange(photos.filter((_, i) => i !== index))
    },
    [photos, onPhotosChange],
  )

  const movePhoto = useCallback(
    (fromIndex: number, direction: 'up' | 'down') => {
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
      if (toIndex < 0 || toIndex >= photos.length) return
      const updated = [...photos]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      onPhotosChange(updated)
    },
    [photos, onPhotosChange],
  )

  const removeVideo = useCallback(() => {
    onVideoUrlChange(null)
  }, [onVideoUrlChange])

  return (
    <div className="space-y-4">
      {/* ======== Área de upload de fotos (drag-and-drop) ======== */}
      {canAddMorePhotos && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6
            transition-colors
            ${isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            }
          `}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t('dragPhotosHere') || 'Arraste fotos aqui ou clique para selecionar'}
          </p>
          <p className="text-xs text-muted-foreground/70">
            JPG, PNG, WebP
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ======== Indicador de limite ======== */}
      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos} {t('photos') || 'fotos'}
        </p>
      )}

      {/* ======== Grid de fotos ======== */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((url, index) => {
            const isLoading = Object.values(uploadingPhotos).some(Boolean) && !photos.includes(url)
            return (
              <div
                key={url}
                className="group relative overflow-hidden rounded-lg border bg-muted"
              >
                <img
                  src={url}
                  alt={`${t('photo') || 'Foto'} ${index + 1}`}
                  className="aspect-square w-full object-cover"
                />

                {/* Badge de capa */}
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {t('cover') || 'Capa'}
                  </span>
                )}

                {/* Botões de controle */}
                <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(index) }}
                    className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    aria-label={t('remove') || 'Remover'}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Botões de reordenar (inferior) */}
                <div className="absolute bottom-1.5 left-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); movePhoto(index, 'up') }}
                      className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-black/80"
                      aria-label={t('moveUp') || 'Mover para cima'}
                    >
                      ↑
                    </button>
                  )}
                  {index < photos.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); movePhoto(index, 'down') }}
                      className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-black/80"
                      aria-label={t('moveDown') || 'Mover para baixo'}
                    >
                      ↓
                    </button>
                  )}
                  <GripVertical className="h-4 w-4 text-white/60" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ======== Aviso de limite atingido ======== */}
      {!canAddMorePhotos && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {t('maxPhotosReached') || `Limite de ${maxPhotos} fotos atingido`}
        </div>
      )}

      {/* ======== Seção de vídeo ======== */}
      <div className="border-t pt-4">
        <h4 className="mb-2 text-sm font-medium">{t('video') || 'Vídeo'}</h4>

        {!videoUrl && !uploadingVideo && (
          <div
            onClick={() => videoInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            <Film className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('addVideo') || 'Adicionar vídeo'}
            </p>
            <p className="text-xs text-muted-foreground/70">MP4, MOV</p>
          </div>
        )}

        {uploadingVideo && (
          <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/25 bg-primary/5 p-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">{t('uploading') || 'Enviando...'}</span>
          </div>
        )}

        {videoUrl && !uploadingVideo && (
          <div className="group relative overflow-hidden rounded-lg border bg-muted">
            <video
              src={videoUrl}
              controls
              className="aspect-video w-full object-cover"
            />
            <button
              type="button"
              onClick={removeVideo}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
              aria-label={t('remove') || 'Remover'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <input
          ref={videoInputRef}
          type="file"
          accept={ACCEPTED_VIDEO_TYPES}
          className="hidden"
          onChange={handleVideoInputChange}
        />
      </div>
    </div>
  )
}
