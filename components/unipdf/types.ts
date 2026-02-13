export interface PDFFileItem {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'pdf';
  previewUrl?: string; // Para imagens
  size: number;
}
