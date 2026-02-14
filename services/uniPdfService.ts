import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import { PDFFileItem } from '../components/unipdf/types';

interface CoverData {
  title: string;
  generatedText: string;
  date: string;
}

// Função auxiliar para remover acentos se necessário (fallback para Helvetica)
const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const createPDF = async (
  files: PDFFileItem[],
  coverData?: CoverData
): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();

  // --- CAPA (Se houver) ---
  if (coverData) {
    const coverPage = mergedPdf.addPage(PageSizes.A4);
    const { width, height } = coverPage.getSize();

    // Helvetica suporta apenas WinAnsi (sem alguns caracteres especiais).
    // O ideal seria embeddar uma fonte customizada (ex: Roboto), mas para manter simples:
    // Vamos remover acentos problemáticos ou usar uma fonte padrão mais robusta se disponível.
    // Como alternativa rápida, vamos sanitizar o texto para WinAnsi.
    const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);

    const safeTitle = removeAccents(coverData.title);
    const safeGeneratedText = removeAccents(coverData.generatedText);

    const titleSize = 28;
    const titleWidth = fontBold.widthOfTextAtSize(safeTitle, titleSize);
    coverPage.drawText(safeTitle, {
      x: (width - titleWidth) / 2,
      y: height - 100,
      size: titleSize,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.3),
    });

    coverPage.drawLine({
      start: { x: 50, y: height - 120 },
      end: { x: width - 50, y: height - 120 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    const textSize = 11;
    const lineHeight = 16;
    const maxWidth = width - 100;

    const wrapText = (text: string, font: any, size: number, maxWidth: number) => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = font.widthOfTextAtSize(currentLine + ' ' + word, size);
        if (width < maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    let textY = height - 160;
    const paragraphs = safeGeneratedText.split('\n').filter((p) => p.trim());

    paragraphs.forEach((para) => {
      const lines = wrapText(para, fontRegular, textSize, maxWidth);
      lines.forEach((line) => {
        coverPage.drawText(line, {
          x: 50,
          y: textY,
          size: textSize,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
        textY -= lineHeight;
      });
      textY -= lineHeight;
    });

    const footerText = `Gerado em ${coverData.date} • UniPDF Organizador Inteligente`;
    const safeFooterText = removeAccents(footerText);
    const footerSize = 9;

    coverPage.drawText(safeFooterText, {
      x: (width - fontRegular.widthOfTextAtSize(safeFooterText, footerSize)) / 2,
      y: 30,
      size: footerSize,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // --- PROCESSAMENTO DE ARQUIVOS (RASTERIZAÇÃO TOTAL) ---
  // Importação dinâmica para evitar dependências circulares ou problemas de build
  const { convertPdfToImages } = await import('../utils/pdfProcessor'); // Reutiliza a função do extrator

  for (const item of files) {
    try {
      let imagesToAdd: string[] = [];

      if (item.type === 'image') {
        // Se for imagem, lê direto como DataURL
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(item.file);
        });
        imagesToAdd = [dataUrl];
      } else if (item.type === 'pdf') {
        // Se for PDF, converte TODAS as páginas em imagens
        console.log(`[UniPDF] Rasterizando PDF: ${item.name}...`);
        imagesToAdd = await convertPdfToImages(item.file);
      }

      // Adiciona cada imagem como uma nova página no PDF final
      for (const imgDataUrl of imagesToAdd) {
        const fetchRes = await fetch(imgDataUrl);
        const imgBytes = await fetchRes.arrayBuffer();

        let pdfImage;
        // Detecta tipo pelo cabeçalho ou extensão mascarada no DataURL
        if (imgDataUrl.startsWith('data:image/png')) {
          pdfImage = await mergedPdf.embedPng(imgBytes);
        } else {
          // Fallback para JPG (maioria)
          pdfImage = await mergedPdf.embedJpg(imgBytes);
        }

        const page = mergedPdf.addPage(PageSizes.A4);
        const { width, height } = page.getSize();

        // Calcular escala para "fit" mantendo proporção (com margem opcional)
        // Usar margem pequena (10px) para garantir que nada corte na impressão
        const margin = 10;
        const maxWidth = width - (margin * 2);
        const maxHeight = height - (margin * 2);

        const imgDims = pdfImage.scaleToFit(maxWidth, maxHeight);

        // Centralizar na página A4
        const x = (width - imgDims.width) / 2;
        const y = (height - imgDims.height) / 2;

        page.drawImage(pdfImage, {
          x,
          y,
          width: imgDims.width,
          height: imgDims.height,
        });
      }

    } catch (error) {
      console.error(`[UniPDF] Erro ao processar ${item.name}:`, error);
      // Cria página de erro visual, mas continua o processo
      const errPage = mergedPdf.addPage(PageSizes.A4);
      const { height } = errPage.getSize();

      const safeName = removeAccents(item.name);

      errPage.drawText(`ERRO: Nao foi possivel incluir o arquivo: ${safeName}`, {
        x: 50,
        y: height - 100,
        size: 12,
        color: rgb(0.8, 0, 0),
      });
    }
  }

  if (mergedPdf.getPageCount() === 0) {
    mergedPdf.addPage(PageSizes.A4);
  }

  const pdfBytes = await mergedPdf.save();
  return pdfBytes;
};
