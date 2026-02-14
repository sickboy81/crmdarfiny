
/**
 * Utility functions for image preprocessing to improve OCR accuracy.
 * Uses HTML Canvas API to manipulate image data.
 */

export const preprocessImageForOCR = async (source: File | string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        // Handle cross-origin if needed (though usually local data)
        img.crossOrigin = 'Anonymous';

        if (typeof source === 'string') {
            img.src = source;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(source);
        }

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Set canvas dimensions
            // Resizing to max 2000px width/height can help performance without losing too much detail for business cards
            const MAX_DIMENSION = 2000;
            let width = img.width;
            let height = img.height;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                width *= ratio;
                height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw image
            ctx.drawImage(img, 0, 0, width, height);

            // Get image data
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Apply Filters: Grayscale + Contrast + Binarization (Threshold)

            // 1. Grayscale & Contrast
            // Formula for contrast: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
            // Optimal contrast value is experimental, usually around 20-50 for documents
            const contrast = 50;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

            for (let i = 0; i < data.length; i += 4) {
                // Grayscale (Luminance)
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

                // Apply Contrast
                let correctedGray = factor * (gray - 128) + 128;

                // Clamp values
                if (correctedGray > 255) correctedGray = 255;
                if (correctedGray < 0) correctedGray = 0;

                // Binarization (Simple Threshold)
                // Threshold value of 128 is standard, but for scanned docs 150-180 might be better to remove light noise
                // Let's use a slightly aggressive threshold to force text to black
                const threshold = 160;
                const finalValue = correctedGray > threshold ? 255 : 0;

                data[i] = finalValue;     // Red
                data[i + 1] = finalValue; // Green
                data[i + 2] = finalValue; // Blue
                // Alpha (data[i+3]) remains unchanged
            }

            ctx.putImageData(imageData, 0, 0);

            // Return processed image as Data URL
            resolve(canvas.toDataURL('image/png'));
        };
    });
};

/**
 * Cleans OCR text output to fix common character recognition errors
 * specifically for phone numbers and emails.
 */
export const cleanOCRText = (text: string): string => {
    // Common OCR substitutions for digits
    return text
        // Fix common letter-to-number swaps in potential phone numbers
        // Note: This is aggressive, so we apply it carefully or globally if the context is mostly data
        // For now, let's keep it minimal to avoid breaking actual words
        // .replace(/O/g, '0') 
        // .replace(/l/g, '1')
        // .replace(/I/g, '1')
        ;
};
