'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  Trash2,
  Download,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Loader2,
  FileText,
  Image as ImageIcon,
  Sparkles,
  X,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createPDF, pdfFileToImages } from '@/lib/unipdf/service'
import type { PDFFileItem } from '@/lib/unipdf/types'

// Dnd Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Crop Modal Import
import { CropModal } from './crop-modal'

interface SortableFileItemProps {
  item: PDFFileItem
  index: number
  total: number
  formatSize: (bytes: number) => string
  moveItem: (index: number, direction: 'up' | 'down') => void
  handleRemove: (id: string) => void
  handleCropTrigger: (id: string) => void
}

function SortableFileItem({
  item,
  index,
  total,
  formatSize,
  moveItem,
  handleRemove,
  handleCropTrigger,
}: SortableFileItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-card border rounded-lg transition-shadow duration-200 ${
        isDragging ? 'shadow-lg border-primary/40' : ''
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/80 shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/50">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-blue-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatSize(item.size)}</p>
      </div>

      <div className="flex gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-indigo-500 hover:text-indigo-650 hover:bg-indigo-50"
          onClick={() => handleCropTrigger(item.id)}
          title="Recortar / Editar Imagem"
        >
          <Wand2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => moveItem(index, 'up')}
          disabled={index === 0}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => moveItem(index, 'down')}
          disabled={index === total - 1}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={() => handleRemove(item.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export function UniPDF() {
  const t = useTranslations('pdf')
  const [files, setFiles] = useState<PDFFileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCover, setShowCover] = useState(false)
  const [coverTitle, setCoverTitle] = useState('')
  const [coverText, setCoverText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Crop Modal States
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [cropItem, setCropItem] = useState<PDFFileItem | null>(null)

  // Preview Pagination State
  const [previewPageIndex, setPreviewPageIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const handleFilesSelect = useCallback(async (newFiles: File[]) => {
    setIsProcessing(true)
    setError(null)
    try {
      const items: PDFFileItem[] = []
      for (const file of newFiles) {
        if (file.type.includes('image')) {
          items.push({
            id: generateId(),
            file,
            name: file.name,
            type: 'image',
            size: file.size,
            previewUrl: URL.createObjectURL(file),
          })
        } else if (file.type === 'application/pdf') {
          // Convert PDF pages to images
          const pageImages = await pdfFileToImages(file)

          pageImages.forEach((dataUrl: string, index: number) => {
            const byteString = atob(dataUrl.split(',')[1])
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0]
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            const blob = new Blob([ab], { type: mimeString })
            const pageFile = new File(
              [blob],
              `${file.name.replace(/\.[^/.]+$/, '')}_pag_${index + 1}.jpg`,
              { type: 'image/jpeg' }
            )

            items.push({
              id: generateId(),
              file: pageFile,
              name: pageFile.name,
              type: 'image',
              size: pageFile.size,
              previewUrl: URL.createObjectURL(pageFile),
            })
          })
        }
      }
      setFiles((prev) => [...prev, ...items])
    } catch (err) {
      toast.error('Erro ao processar arquivo(s)')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const newFiles = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newFiles.length) return prev
      ;[newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]]
      return newFiles
    })
  }, [])

  const handleCropTrigger = useCallback((id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id)
      if (item && item.type === 'image' && item.previewUrl) {
        setCropItem(item)
        setIsCropModalOpen(true)
      }
      return prev
    })
  }, [])

  const handleSaveCrop = async (croppedBlob: Blob) => {
    if (!cropItem) return

    const newFile = new File([croppedBlob], cropItem.name, { type: 'image/jpeg' })
    const newPreviewUrl = URL.createObjectURL(newFile)

    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === cropItem.id) {
          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
          return {
            ...f,
            file: newFile,
            previewUrl: newPreviewUrl,
            size: newFile.size,
          }
        }
        return f
      })
    )

    setIsCropModalOpen(false)
    setCropItem(null)
    toast.success('Imagem editada com sucesso!')
  }

  // Dnd Kit Setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.type.startsWith('image/'),
      )
      if (droppedFiles.length > 0) handleFilesSelect(droppedFiles)
    },
    [handleFilesSelect],
  )

  const handleMerge = async () => {
    if (files.length === 0) {
      toast.error(t('toastAddFile'))
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const coverData = showCover && coverTitle
        ? {
            title: coverTitle,
            generatedText: coverText || 'Document generated by UniPDF',
            date: new Date().toLocaleDateString(),
          }
        : undefined

      const pdfBytes = await createPDF(files, coverData)

      // Download
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merged_${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(t('toastMerged'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('toastMergeFailed')
      setError(msg)
      toast.error(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateCover = async () => {
    if (!coverTitle.trim()) {
      toast.error(t('toastEnterTitle'))
      return
    }

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Generate a professional cover page text for a document titled "${coverTitle}". Write 2-3 paragraphs describing the document. Be concise and professional.`,
            },
          ],
          maxTokens: 512,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCoverText(data.text || '')
        toast.success(t('toastCoverGenerated'))
      }
    } catch {
      toast.error(t('toastCoverFailed'))
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Preview Page Setup
  const totalPreviewPages = files.length + (showCover && coverTitle ? 1 : 0)

  useEffect(() => {
    // Keep page index bounds safe
    if (previewPageIndex >= totalPreviewPages) {
      setPreviewPageIndex(Math.max(0, totalPreviewPages - 1))
    }
  }, [totalPreviewPages, previewPageIndex])

  // Get current item to preview
  const isViewingCover = showCover && coverTitle && previewPageIndex === 0
  const activeFileIndex = showCover && coverTitle ? previewPageIndex - 1 : previewPageIndex
  const currentPreviewFile = files[activeFileIndex]

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Left: Files */}
      <div className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <Upload className={`h-10 w-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="text-center">
            <p className="font-bold text-sm">
              {isDragging ? t('dropZoneActive') : t('dropZone')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('supportedFormats')}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFilesSelect(Array.from(e.target.files))
              e.target.value = ''
            }}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('filesCount', { count: files.length })}
              </p>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
                setFiles([])
              }}>
                <Trash2 className="h-3 w-3 mr-1" /> {t('clearAll')}
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={files.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {files.map((item, index) => (
                    <SortableFileItem
                      key={item.id}
                      item={item}
                      index={index}
                      total={files.length}
                      formatSize={formatSize}
                      moveItem={moveItem}
                      handleRemove={handleRemove}
                      handleCropTrigger={handleCropTrigger}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {/* Cover Page */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{t('coverPage')}</h3>
              <button
                onClick={() => setShowCover(!showCover)}
                className={`text-xs font-bold ${showCover ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {showCover ? t('enabled') : t('enable')}
              </button>
            </div>
            {showCover && (
              <div className="space-y-3">
                <Input
                  placeholder={t('documentTitle')}
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                />
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t('coverTextPlaceholder')}
                    value={coverText}
                    onChange={(e) => setCoverText(e.target.value)}
                    rows={4}
                    className="resize-none flex-1"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerateCover}>
                  <Sparkles className="h-3 w-3 mr-1" /> {t('generateAi')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        <Button onClick={handleMerge} disabled={isProcessing || files.length === 0} className="w-full">
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('processing')}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {t('mergeDownload')}
            </>
          )}
        </Button>
      </div>

      {/* Right: Premium A4 Document Preview */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-muted-foreground">{t('preview')}</h3>
        {totalPreviewPages === 0 ? (
          <Card className="min-h-[400px]">
            <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <FileText className="h-16 w-16 mb-3 opacity-30" />
              <p className="text-sm">{t('addFilesPreview')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center gap-4 bg-muted/40 p-6 rounded-2xl border">
            {/* A4 Sheet Container */}
            <div className="relative w-full max-w-[320px] aspect-[1/1.414] bg-white border shadow-lg rounded-lg overflow-hidden flex flex-col justify-between group">
              {/* Fullscreen Expand trigger */}
              <button
                onClick={() => setIsZoomOpen(true)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 active:scale-95 cursor-pointer z-10"
                title="Ampliar visualização"
              >
                <Maximize2 className="h-4 w-4" />
              </button>

              {isViewingCover ? (
                // Cover Page A4 Preview
                <div className="w-full h-full flex flex-col justify-between p-6 select-none text-zinc-800">
                  <div className="text-center mt-12 space-y-4">
                    <h2 className="text-base font-bold text-indigo-700 leading-tight truncate px-4">
                      {coverTitle}
                    </h2>
                    <div className="w-12 h-0.5 bg-zinc-300 mx-auto" />
                    {coverText && (
                      <p className="text-[10px] text-zinc-500 text-left px-4 line-clamp-[12] leading-relaxed whitespace-pre-wrap">
                        {coverText}
                      </p>
                    )}
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-[8px] text-zinc-400">
                      {t('generatedOn', { date: new Date().toLocaleDateString() })}
                    </p>
                  </div>
                </div>
              ) : (
                // Image Page A4 Preview
                currentPreviewFile?.previewUrl && (
                  <div className="w-full h-full p-2 flex items-center justify-center bg-zinc-50 select-none">
                    <img
                      src={currentPreviewFile.previewUrl}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                disabled={previewPageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold text-muted-foreground select-none">
                Página {previewPageIndex + 1} de {totalPreviewPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewPageIndex((p) => Math.min(totalPreviewPages - 1, p + 1))}
                disabled={previewPageIndex === totalPreviewPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {cropItem && cropItem.previewUrl && (
        <CropModal
          isOpen={isCropModalOpen}
          image={cropItem.previewUrl}
          onClose={() => {
            setIsCropModalOpen(false)
            setCropItem(null)
          }}
          onSave={handleSaveCrop}
        />
      )}

      {/* Lightbox / Expanded Zoom Modal */}
      {isZoomOpen && totalPreviewPages > 0 && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95 cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative w-full max-w-[650px] aspect-[1/1.414] bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col justify-between p-12 select-none text-zinc-900 border">
            {isViewingCover ? (
              <div className="w-full h-full flex flex-col justify-between select-none">
                <div className="text-center mt-20 space-y-6">
                  <h2 className="text-2xl font-black text-indigo-700 tracking-tight leading-tight px-8">
                    {coverTitle}
                  </h2>
                  <div className="w-24 h-0.5 bg-zinc-300 mx-auto" />
                  {coverText && (
                    <p className="text-sm text-zinc-600 text-left px-8 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[45vh]">
                      {coverText}
                    </p>
                  )}
                </div>
                <div className="text-center mb-8">
                  <p className="text-xs font-semibold text-zinc-400">
                    {t('generatedOn', { date: new Date().toLocaleDateString() })}
                  </p>
                </div>
              </div>
            ) : (
              currentPreviewFile?.previewUrl && (
                <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                  <img
                    src={currentPreviewFile.previewUrl}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )
            )}
          </div>

          {/* Pagination inside Lightbox */}
          <div className="flex items-center gap-4 mt-6 text-white bg-black/50 p-2.5 rounded-xl border border-white/10">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent text-white border-white/20 hover:bg-white/10"
              onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
              disabled={previewPageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-bold tracking-wider select-none">
              PÁGINA {previewPageIndex + 1} DE {totalPreviewPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent text-white border-white/20 hover:bg-white/10"
              onClick={() => setPreviewPageIndex((p) => Math.min(totalPreviewPages - 1, p + 1))}
              disabled={previewPageIndex === totalPreviewPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
