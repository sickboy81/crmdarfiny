export interface PDFFileItem {
  id: string
  file: File
  name: string
  type: 'pdf' | 'image'
  size: number
  previewUrl?: string
}
