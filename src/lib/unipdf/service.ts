import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'
import type { PDFFileItem } from './types'

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function pdfFileToImages(file: File): Promise<string[]> {
  // Dynamic import to avoid build issues
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.9))
  }

  return images
}

interface CoverData {
  title: string
  generatedText: string
  date: string
}

export async function createPDF(
  files: PDFFileItem[],
  coverData?: CoverData,
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()

  // Cover page
  if (coverData) {
    const coverPage = mergedPdf.addPage(PageSizes.A4)
    const { width, height } = coverPage.getSize()
    const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica)

    const safeTitle = removeAccents(coverData.title)
    const safeText = removeAccents(coverData.generatedText)

    const titleSize = 28
    const titleWidth = fontBold.widthOfTextAtSize(safeTitle, titleSize)
    coverPage.drawText(safeTitle, {
      x: (width - titleWidth) / 2,
      y: height - 100,
      size: titleSize,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.3),
    })

    coverPage.drawLine({
      start: { x: 50, y: height - 120 },
      end: { x: width - 50, y: height - 120 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    })

    const textSize = 11
    const lineHeight = 16
    const maxWidth = width - 100

    const wrapText = (text: string, font: any, size: number, maxW: number) => {
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = words[0]
      for (let i = 1; i < words.length; i++) {
        const word = words[i]
        if (font.widthOfTextAtSize(currentLine + ' ' + word, size) < maxW) {
          currentLine += ' ' + word
        } else {
          lines.push(currentLine)
          currentLine = word
        }
      }
      lines.push(currentLine)
      return lines
    }

    let textY = height - 160
    const paragraphs = safeText.split('\n').filter((p) => p.trim())
    paragraphs.forEach((para) => {
      const lines = wrapText(para, fontRegular, textSize, maxWidth)
      lines.forEach((line) => {
        coverPage.drawText(line, {
          x: 50,
          y: textY,
          size: textSize,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        })
        textY -= lineHeight
      })
      textY -= lineHeight
    })

    const footerText = removeAccents(`Generated on ${coverData.date} • UniPDF`)
    coverPage.drawText(footerText, {
      x: (width - fontRegular.widthOfTextAtSize(footerText, 9)) / 2,
      y: 30,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // Process files
  for (const item of files) {
    try {
      let imagesToAdd: string[] = []

      if (item.type === 'image') {
        imagesToAdd = [await fileToDataUrl(item.file)]
      } else if (item.type === 'pdf') {
        imagesToAdd = await pdfFileToImages(item.file)
      }

      for (const imgDataUrl of imagesToAdd) {
        const fetchRes = await fetch(imgDataUrl)
        const imgBytes = await fetchRes.arrayBuffer()

        let pdfImage
        if (imgDataUrl.startsWith('data:image/png')) {
          pdfImage = await mergedPdf.embedPng(imgBytes)
        } else {
          pdfImage = await mergedPdf.embedJpg(imgBytes)
        }

        const page = mergedPdf.addPage(PageSizes.A4)
        const { width, height } = page.getSize()
        const margin = 10
        const imgDims = pdfImage.scaleToFit(width - margin * 2, height - margin * 2)
        page.drawImage(pdfImage, {
          x: (width - imgDims.width) / 2,
          y: (height - imgDims.height) / 2,
          width: imgDims.width,
          height: imgDims.height,
        })
      }
    } catch (error) {
      console.error(`Error processing ${item.name}:`, error)
      const errPage = mergedPdf.addPage(PageSizes.A4)
      const { height } = errPage.getSize()
      errPage.drawText(`Error: Could not include ${removeAccents(item.name)}`, {
        x: 50,
        y: height - 100,
        size: 12,
        color: rgb(0.8, 0, 0),
      })
    }
  }

  if (mergedPdf.getPageCount() === 0) {
    mergedPdf.addPage(PageSizes.A4)
  }

  return mergedPdf.save()
}
