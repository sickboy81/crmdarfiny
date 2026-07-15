'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Upload,
  Trash2,
  Download,
  Crop,
  FileText,
  File as FileIconLucide,
  FileArchive,
  FileSpreadsheet,
  Image as ImageIcon,
  Search,
  Grid,
  List,
  Loader2,
  Film,
  Music,
  Eye,
  Copy,
  FolderOpen,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { PDFDocument } from 'pdf-lib'
import ReactCrop, { type Crop as CropType } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface UserFile {
  id: string
  url: string
  name: string
  size: number
  type: string
  created_at: string
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return ImageIcon
  if (type.startsWith('video/')) return Film
  if (type.startsWith('audio/')) return Music
  if (type.includes('pdf')) return FileText
  if (type.includes('spreadsheet') || type.includes('csv') || type.includes('excel')) return FileSpreadsheet
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return FileArchive
  return FileIconLucide
}

function isImageType(type: string) {
  return type.startsWith('image/')
}

export function ImageManager() {
  const { user } = useAuth()
  const t = useTranslations('files')
  const [files, setFiles] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFile, setSelectedFile] = useState<UserFile | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [crop, setCrop] = useState<CropType>({ unit: '%', width: 50, height: 50, x: 25, y: 25 })
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const db = createClient()

  useEffect(() => {
    if (!user) return
    loadFiles()
  }, [user])

  const loadFiles = async () => {
    setLoading(true)
    const { data } = await db
      .from('user_images')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setFiles(data)
    setLoading(false)
  }

  const convertToWebP = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.type === 'image/webp') {
        resolve(file)
        return
      }
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) { URL.revokeObjectURL(url); resolve(file); return }
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (blob) {
              const webpName = file.name.replace(/\.[^.]+$/, '.webp')
              resolve(new File([blob], webpName, { type: 'image/webp' }))
            } else {
              resolve(file)
            }
          },
          'image/webp',
          0.85,
        )
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  const compressPdf = async (file: File): Promise<File> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })

      // Remove metadata
      pdfDoc.setTitle('')
      pdfDoc.setAuthor('')
      pdfDoc.setSubject('')
      pdfDoc.setKeywords([])
      pdfDoc.setProducer('')
      pdfDoc.setCreator('')

      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      })

      // Only use compressed version if it's smaller
      if (compressedBytes.byteLength < arrayBuffer.byteLength) {
        return new File([Buffer.from(compressedBytes)], file.name, { type: 'application/pdf' })
      }
      return file
    } catch {
      // If compression fails, return original
      return file
    }
  }

  const uploadFiles = async (fileList: File[]) => {
    if (!user || fileList.length === 0) return
    setUploading(true)
    let uploaded = 0

    for (const file of fileList) {
      try {
        // Compress/optimize: images → WebP, PDFs → remove metadata + object streams
        let processedFile = file
        if (file.type.startsWith('image/')) {
          processedFile = await convertToWebP(file)
        } else if (file.type === 'application/pdf') {
          processedFile = await compressPdf(file)
        }
        const filePath = `${user.id}/${Date.now()}_${processedFile.name}`

        const { error: uploadError } = await db.storage
          .from('files')
          .upload(filePath, processedFile)

        if (uploadError) throw uploadError

        const { data: urlData } = db.storage.from('files').getPublicUrl(filePath)

        const { error: dbError } = await db.from('user_images').insert({
          url: urlData.publicUrl,
          name: processedFile.name,
          size: processedFile.size,
          type: processedFile.type,
          user_id: user.id,
        })

        if (dbError) throw dbError
        uploaded++
      } catch (err) {
        toast.error(t('uploadFailed', { name: file.name }))
      }
    }

    await loadFiles()
    setUploading(false)
    if (uploaded > 0) {
      toast.success(t('uploaded', { count: uploaded }))
    }
  }

  const deleteFile = async (file: UserFile) => {
    const { error } = await db.from('user_images').delete().eq('id', file.id)
    if (error) {
      toast.error(t('deleteFailed'))
      return
    }
    setFiles((prev) => prev.filter((f) => f.id !== file.id))
    if (selectedFile?.id === file.id) setSelectedFile(null)
    toast.success(t('deleted'))
  }

  const handleCrop = useCallback(async () => {
    if (!imgRef.current || !selectedFile) return
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    canvas.width = (crop.width * img.width * scaleX) / 100
    canvas.height = (crop.height * img.height * scaleY) / 100

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(
      img,
      (crop.x * img.width * scaleX) / 100,
      (crop.y * img.height * scaleY) / 100,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png'),
    )

    const filePath = `${user?.id}/${Date.now()}_cropped.png`
    const { error } = await db.storage.from('files').upload(filePath, blob)
    if (error) {
      toast.error(t('cropFailed'))
      return
    }

    const { data: urlData } = db.storage.from('files').getPublicUrl(filePath)
    const { error: dbError } = await db.from('user_images').insert({
      url: urlData.publicUrl,
      name: `cropped_${selectedFile.name}`,
      size: blob.size,
      type: 'image/png',
      user_id: user?.id,
    })

    if (dbError) {
      toast.error(t('saveFailed'))
      return
    }

    await loadFiles()
    setShowCropModal(false)
    toast.success(t('croppedSaved'))
  }, [crop, selectedFile, user, db])

  const downloadFile = (file: UserFile) => {
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.name
    a.click()
  }

  const copyUrl = (file: UserFile) => {
    navigator.clipboard.writeText(file.url)
    toast.success(t('urlCopied'))
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      uploadFiles(Array.from(e.dataTransfer.files))
    },
    [user],
  )

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  )

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          {t('upload')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadFiles(Array.from(e.target.files))
            e.target.value = ''
          }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
        }`}
      >
        <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">
          {t('dropZone')}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {t('supportedFormats')} · {t('autoOptimize')}
        </p>
      </div>

      {/* Files */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="h-16 w-16 mb-3 opacity-30" />
          <p className="text-sm">{t('noFiles')}</p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Grid or List */}
          <div className={`flex-1 min-w-0 transition-all ${selectedFile && !showCropModal && !showPreview ? 'max-w-[calc(100%-300px)]' : ''}`}>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {filteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.type)
                  const isImg = isImageType(file.type)
                  return (
                    <Card
                      key={file.id}
                      className={`cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary ${
                        selectedFile?.id === file.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        {isImg ? (
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <FileIcon className="h-12 w-12 text-muted-foreground/40" />
                        )}
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted sticky top-0">
                          <th className="px-4 py-2 text-left font-bold">{t('preview')}</th>
                          <th className="px-4 py-2 text-left font-bold">{t('name')}</th>
                          <th className="px-4 py-2 text-left font-bold">{t('size')}</th>
                          <th className="px-4 py-2 text-left font-bold">{t('date')}</th>
                          <th className="px-4 py-2 text-right font-bold">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFiles.map((file) => {
                          const FileIcon = getFileIcon(file.type)
                          const isImg = isImageType(file.type)
                          return (
                            <tr key={file.id} className="border-t hover:bg-muted/50">
                              <td className="px-4 py-2">
                                {isImg ? (
                                  <img src={file.url} alt="" className="w-10 h-10 rounded object-cover" />
                                ) : (
                                  <FileIcon className="w-10 h-10 p-1 text-muted-foreground/40" />
                                )}
                              </td>
                              <td className="px-4 py-2 font-medium">{file.name}</td>
                              <td className="px-4 py-2 text-muted-foreground">{formatSize(file.size)}</td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {new Date(file.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex gap-1 justify-end">
                                  {isImg && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedFile(file)}>
                                      <Crop className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadFile(file)}>
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFile(file)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel - Selected File */}
          {selectedFile && !showCropModal && !showPreview && (
            <div className="w-[280px] shrink-0">
              <Card className="sticky top-4">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold truncate">{t('details')}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {isImageType(selectedFile.type) ? (
                    <img src={selectedFile.url} alt="" className="w-full h-40 rounded-lg object-cover" />
                  ) : (
                    <div className="w-full h-40 rounded-lg bg-muted flex items-center justify-center">
                      {(() => {
                        const FileIcon = getFileIcon(selectedFile.type)
                        return <FileIcon className="h-12 w-12 text-muted-foreground/40" />
                      })()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-medium truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatSize(selectedFile.size)} · {selectedFile.type}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(selectedFile.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {isImageType(selectedFile.type) && (
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowCropModal(true)}>
                        <Crop className="h-3 w-3 mr-2" /> {t('crop')}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => downloadFile(selectedFile)}>
                      <Download className="h-3 w-3 mr-2" /> {t('download')}
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => copyUrl(selectedFile)}>
                      <Copy className="h-3 w-3 mr-2" /> {t('copyUrl')}
                    </Button>
                    <Button variant="destructive" size="sm" className="w-full justify-start" onClick={() => deleteFile(selectedFile)}>
                      <Trash2 className="h-3 w-3 mr-2" /> {t('delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && selectedFile && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{t('cropImage')}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCropModal(false)}>{t('cancel')}</Button>
            </div>
            <div className="flex justify-center bg-muted rounded-lg overflow-hidden">
              <ReactCrop crop={crop} onChange={(c) => setCrop(c)}>
                <img ref={imgRef} src={selectedFile.url} alt="" className="max-h-[400px]" />
              </ReactCrop>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCropModal(false)}>{t('cancel')}</Button>
              <Button onClick={handleCrop}>
                <Crop className="h-4 w-4 mr-2" /> {t('saveCrop')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
