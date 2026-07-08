/**
 * Image enhancement utilities for document scanning.
 * Applies filters to improve document readability.
 */

export type EnhancementPreset = 'original' | 'auto' | 'grayscale' | 'highContrast' | 'bw';

export interface EnhancementOptions {
  brightness: number;   // -1 to 1
  contrast: number;     // 0 to 3
  saturation: number;   // 0 to 3 (1 = normal)
  grayscale: boolean;
  sharpen: boolean;
  threshold: number;    // 0 to 255, for B&W mode (0 = disabled)
}

const PRESETS: Record<EnhancementPreset, EnhancementOptions> = {
  original: { brightness: 0, contrast: 1, saturation: 1, grayscale: false, sharpen: false, threshold: 0 },
  auto: { brightness: 0.05, contrast: 1.3, saturation: 1, grayscale: false, sharpen: true, threshold: 0 },
  grayscale: { brightness: 0, contrast: 1.2, saturation: 0, grayscale: true, sharpen: false, threshold: 0 },
  highContrast: { brightness: 0.1, contrast: 1.8, saturation: 0, grayscale: true, sharpen: true, threshold: 0 },
  bw: { brightness: 0, contrast: 1.5, saturation: 0, grayscale: true, sharpen: true, threshold: 128 },
};

/**
 * Get default enhancement options for a preset.
 */
export function getPresetOptions(preset: EnhancementPreset): EnhancementOptions {
  return { ...PRESETS[preset] };
}

/**
 * Apply enhancement options to a canvas image.
 * Returns a new canvas with the enhanced image.
 */
export function enhanceImage(
  sourceCanvas: HTMLCanvasElement,
  options: EnhancementOptions
): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = sourceCanvas.width;
  output.height = sourceCanvas.height;
  const ctx = output.getContext('2d')!;

  // Draw source
  ctx.drawImage(sourceCanvas, 0, 0);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, output.width, output.height);
  const data = imageData.data;

  // Apply brightness and contrast
  const brightnessFactor = options.brightness * 255;
  const contrastFactor = (259 * (options.contrast * 128 + 255)) / (255 * (259 - options.contrast * 128));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Grayscale
    if (options.grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray;
      g = gray;
      b = gray;
    }

    // Saturation (skip if already grayscale or saturation is 1)
    if (!options.grayscale && options.saturation !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + options.saturation * (r - gray);
      g = gray + options.saturation * (g - gray);
      b = gray + options.saturation * (b - gray);
    }

    // Brightness
    r += brightnessFactor;
    g += brightnessFactor;
    b += brightnessFactor;

    // Contrast
    if (options.contrast !== 1) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // Clamp
    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  // Threshold (B&W)
  if (options.threshold > 0) {
    for (let i = 0; i < data.length; i += 4) {
      const val = data[i] > options.threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Sharpen (simple unsharp mask)
  if (options.sharpen) {
    return applySharpen(output);
  }

  return output;
}

/**
 * Apply a simple sharpening filter.
 */
function applySharpen(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = canvas.width;
  output.height = canvas.height;
  const ctx = output.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;

  // 3x3 sharpen kernel: center = 5, neighbors = -1
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val =
          5 * copy[idx + c] -
          copy[((y - 1) * w + x) * 4 + c] -
          copy[((y + 1) * w + x) * 4 + c] -
          copy[(y * w + x - 1) * 4 + c] -
          copy[(y * w + x + 1) * 4 + c];
        data[idx + c] = Math.max(0, Math.min(255, val));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return output;
}

/**
 * Auto-detect if the image needs rotation by analyzing edge density.
 * Returns suggested rotation angle (0, 90, 180, 270).
 */
export function _suggestRotation(_canvas: HTMLCanvasElement): number {
  // Placeholder for future OCR-based rotation detection
  return 0;
}
