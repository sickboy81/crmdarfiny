import * as pdfjsLib from 'pdfjs-dist';

// Use Vite's worker import pattern to get a local URL for the worker
// This is much more reliable than CDNs as it avoids CORS issues and version mismatches.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Converts a PDF file to an array of images (Data URLs).
 */
export const convertPdfToImages = async (file: File): Promise<string[]> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const images: string[] = [];

        // Limit to prevent browser hangs on very large PDFs
        const maxPages = Math.min(pdf.numPages, 20);

        for (let i = 1; i <= maxPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // High quality

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas as any // Cast to any to bypass strict type check if needed, but 'canvas' property is required
                }).promise;

                images.push(canvas.toDataURL('image/png'));
            } catch (pageError) {
                console.warn(`Error rendering page ${i}:`, pageError);
            }
        }

        return images;
    } catch (error) {
        console.error('PDF Conversion Error:', error);
        throw new Error('Falha ao converter PDF. Verifique se o arquivo é válido.');
    }
};
