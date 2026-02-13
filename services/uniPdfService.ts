import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import { PDFFileItem } from '../components/unipdf/types';

interface CoverData {
  title: string;
  generatedText: string;
  date: string;
}

export const createPDF = async (
  files: PDFFileItem[],
  coverData?: CoverData
): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();

  // --- CAPA (Se houver) ---
  if (coverData) {
    const coverPage = mergedPdf.addPage(PageSizes.A4); // A4 [595.28, 841.89]
    const { width, height } = coverPage.getSize();

    // Fontes
    const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);

    // Título
    const titleSize = 28;
    const titleWidth = fontBold.widthOfTextAtSize(coverData.title, titleSize);
    coverPage.drawText(coverData.title, {
      x: (width - titleWidth) / 2, // Centralizado
      y: height - 100,
      size: titleSize,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.3), // Azul escuro corporativo
    });

    // Linha divisória
    coverPage.drawLine({
      start: { x: 50, y: height - 120 },
      end: { x: width - 50, y: height - 120 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Texto Gerado (Multi-parágrafo wrap)
    const textSize = 11;
    const lineHeight = 16;
    const maxWidth = width - 100; // Margens de 50px

    // Função simples de word-wrap (pode ser melhorada, mas funciona bem para texto simples)
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
    // Divide parágrafos (assumindo \n do Gemini)
    const paragraphs = coverData.generatedText.split('\n').filter((p) => p.trim());

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
      textY -= lineHeight; // Espaço extra entre parágrafos
    });

    // Rodapé
    const footerText = `Gerado em ${coverData.date} • UniPDF Organizador Inteligente`;
    const footerSize = 9;
    coverPage.drawText(footerText, {
      x: (width - fontRegular.widthOfTextAtSize(footerText, footerSize)) / 2,
      y: 30,
      size: footerSize,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // --- PROCESSAMENTO DE ARQUIVOS ---
  for (const item of files) {
    try {
      if (item.type === 'image') {
        // IMAGENS (JPG/PNG)
        const imageBytes = await item.file.arrayBuffer();
        let image;
        if (item.file.type === 'image/jpeg') {
          image = await mergedPdf.embedJpg(imageBytes);
        } else {
          image = await mergedPdf.embedPng(imageBytes);
        }

        const page = mergedPdf.addPage(PageSizes.A4);
        const { width, height } = page.getSize();

        // Calcular escala para "fit" com margem de 20px
        const margin = 20;
        const maxWidth = width - margin * 2;
        const maxHeight = height - margin * 2;

        const imgDims = image.scaleToFit(maxWidth, maxHeight);

        // Centralizar
        const x = (width - imgDims.width) / 2;
        const y = (height - imgDims.height) / 2;

        page.drawImage(image, {
          x,
          y,
          width: imgDims.width,
          height: imgDims.height,
        });
      } else if (item.type === 'pdf') {
        // PDFS — Defesa em Camadas (ordem: mais robusta primeiro)
        const fileBytes = await item.file.arrayBuffer();
        const sanitizedBytes = sanitizePDFData(new Uint8Array(fileBytes));

        let srcDoc;
        try {
          srcDoc = await PDFDocument.load(sanitizedBytes, { ignoreEncryption: true });
        } catch (loadError) {
          console.warn(`[UniPDF] Falha ao carregar ${item.name}`);
          throw loadError;
        }

        let pdfMerged = false;

        // TENTATIVA 1: copyPages (cópia direta dos objetos — NÃO decodifica content streams)
        // É o método mais robusto pois não tenta descomprimir/recomprimir o conteúdo.
        if (!pdfMerged) {
          try {
            const indices = srcDoc.getPageIndices();
            const copiedPages = await mergedPdf.copyPages(srcDoc, indices);
            copiedPages.forEach((page) => mergedPdf.addPage(page));
            pdfMerged = true;
          } catch (copyError) {
            console.warn(`[UniPDF] copyPages falhou para ${item.name}, tentando rebuild...`);
          }
        }

        // TENTATIVA 2: Rebuild — salva e recarrega o PDF para corrigir estrutura
        if (!pdfMerged) {
          try {
            const rebuiltBytes = await srcDoc.save();
            const rebuiltDoc = await PDFDocument.load(rebuiltBytes);
            const indices = rebuiltDoc.getPageIndices();
            const copiedPages = await mergedPdf.copyPages(rebuiltDoc, indices);
            copiedPages.forEach((page) => mergedPdf.addPage(page));
            pdfMerged = true;
          } catch (rebuildError) {
            console.warn(`[UniPDF] Rebuild falhou para ${item.name}, tentando embedPdf...`);
          }
        }

        // TENTATIVA 3: embedPdf (último recurso — decodifica streams, pode falhar com compressões exóticas)
        if (!pdfMerged) {
          try {
            const srcDoc2 = await PDFDocument.load(sanitizedBytes, { ignoreEncryption: true });
            const embeddedPages = await mergedPdf.embedPdf(srcDoc2);
            embeddedPages.forEach((embPage) => {
              const page = mergedPdf.addPage(PageSizes.A4);
              const { width, height } = page.getSize();
              const margin = 20;
              const maxW = width - margin * 2;
              const maxH = height - margin * 2;
              const scale = Math.min(maxW / embPage.width, maxH / embPage.height);
              const dims = embPage.scale(scale);
              page.drawPage(embPage, {
                x: (width - dims.width) / 2,
                y: (height - dims.height) / 2,
                width: dims.width,
                height: dims.height,
              });
            });
            pdfMerged = true;
          } catch (embedError) {
            console.error(`[UniPDF] Todas as tentativas falharam para ${item.name}`);
            throw embedError;
          }
        }
      }
    } catch (error) {
      console.error(`[UniPDF] Erro crítico: ${item.name}:`, error);
      const errPage = mergedPdf.addPage(PageSizes.A4);
      const { width, height } = errPage.getSize();
      errPage.drawText(`ERRO: Não foi possível processar o arquivo:`, {
        x: 50,
        y: height - 100,
        size: 14,
        color: rgb(0.8, 0, 0),
      });
      errPage.drawText(`${item.name}`, { x: 50, y: height - 130, size: 12 });
      errPage.drawText(`O arquivo pode estar corrompido ou usar compressão não suportada.`, {
        x: 50,
        y: height - 160,
        size: 10,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  // Se o PDF estiver vazio (ex: falha em tudo), cria uma página branca
  if (mergedPdf.getPageCount() === 0) {
    mergedPdf.addPage(PageSizes.A4);
  }

  const pdfBytes = await mergedPdf.save();
  return pdfBytes;
};

// Função de Sanitização (Remove lixo antes de %PDF- e depois de %%EOF)
function sanitizePDFData(data: Uint8Array): Uint8Array {
  let start = 0;
  let end = data.length;

  // Procura %PDF- (header)
  // % = 37, P = 80, D = 68, F = 70, - = 45
  for (let i = 0; i < data.length - 5; i++) {
    if (
      data[i] === 37 &&
      data[i + 1] === 80 &&
      data[i + 2] === 68 &&
      data[i + 3] === 70 &&
      data[i + 4] === 45
    ) {
      start = i;
      break;
    }
  }

  // Procura %%EOF (trailer) de trás pra frente
  // % = 37, % = 37, E = 69, O = 79, F = 70
  for (let i = data.length - 5; i >= 0; i--) {
    if (
      data[i] === 37 &&
      data[i + 1] === 37 &&
      data[i + 2] === 69 &&
      data[i + 3] === 79 &&
      data[i + 4] === 70
    ) {
      end = i + 5; // Inclui o %%EOF
      // Pode haver lixo (0x0A, 0x0D) depois do EOF, mas o PDF valido termina aqui.
      // Para garantir, vamos procurar o ultimo %%EOF válido se houver múltiplos (linearized PDF?)
      // Mas pegar o último encontrado (primeiro de trás pra frente) é o padrão.
      break;
    }
  }

  if (start > 0 || end < data.length) {
    console.log(`PDF Sanitizado: cortado de ${start} até ${end} (original: ${data.length})`);
    return data.slice(start, end);
  }

  return data;
}
