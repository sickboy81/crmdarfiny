export type Point = { x: number; y: number };

export type OutputFormat = 'free' | 'auto' | 'a4' | 'a5' | '1:1' | '16:9' | '9:16';

/**
 * Computes the 3x3 perspective transform matrix H such that
 * for each (src, dst) pair: dst = H * src (in homogeneous coordinates).
 * Uses Gaussian elimination with partial pivoting.
 */
function computePerspectiveMatrix(
  src: Point[],
  dst: Point[]
): Float64Array {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  const n = 8;
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot;
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = Math.abs(aug[i][i]) > 1e-10 ? sum / aug[i][i] : 0;
  }

  return new Float64Array([
    x[0], x[1], x[2],
    x[3], x[4], x[5],
    x[6], x[7], 1.0,
  ]);
}

function transformPoint(
  h: Float64Array,
  px: number,
  py: number
): [number, number] {
  const w = h[6] * px + h[7] * py + h[8];
  return [(h[0] * px + h[1] * py + h[2]) / w, (h[3] * px + h[4] * py + h[5]) / w];
}

/**
 * Normalize points to zero mean and sqrt(2) average distance from origin.
 */
function normalizePoints(points: Point[]) {
  let mx = 0, my = 0;
  for (const p of points) { mx += p.x; my += p.y; }
  mx /= points.length;
  my /= points.length;

  let d = 0;
  for (const p of points) d += Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
  const avg = d / points.length;
  const s = avg > 1e-6 ? Math.SQRT2 / avg : 1;

  const normalized: Point[] = points.map(p => ({ x: (p.x - mx) * s, y: (p.y - my) * s }));

  return {
    normalized,
    normMatrix: new Float64Array([s, 0, -mx * s, 0, s, -my * s, 0, 0, 1]),
    denormMatrix: new Float64Array([1 / s, 0, mx, 0, 1 / s, my, 0, 0, 1]),
  };
}

function multiplyMatrices(a: Float64Array, b: Float64Array): Float64Array {
  const r = new Float64Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}

export function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  return canvas;
}

/**
 * Compute the area of a quadrilateral using the shoelace formula.
 */
function quadArea(corners: Point[]): number {
  let area = 0;
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += corners[i].x * corners[j].y;
    area -= corners[j].x * corners[i].y;
  }
  return Math.abs(area) / 2;
}

/** Aspect ratios for each format */
const FORMAT_ASPECTS: Record<string, number> = {
  'a4': 210 / 297,
  'a5': 148 / 210,
  '1:1': 1,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

/**
 * Compute output dimensions based on the selected format.
 */
function computeOutputDimensions(corners: Point[], format: OutputFormat): { width: number; height: number } {
  // "free" = use edge lengths directly (original behavior, no forced aspect)
  if (format === 'free') {
    const [tl, tr, br, bl] = corners;
    return {
      width: Math.max(1, Math.round(
        (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2
      )),
      height: Math.max(1, Math.round(
        (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2
      )),
    };
  }

  const area = quadArea(corners);
  const aspect = FORMAT_ASPECTS[format] ?? (210 / 297); // fallback A4

  // Formats with explicit orientation
  if (format === '16:9') {
    return {
      width: Math.max(1, Math.round(Math.sqrt(area / aspect))),
      height: Math.max(1, Math.round(Math.sqrt(area * aspect))),
    };
  }
  if (format === '9:16') {
    return {
      width: Math.max(1, Math.round(Math.sqrt(area * aspect))),
      height: Math.max(1, Math.round(Math.sqrt(area / aspect))),
    };
  }

  // Aspect-based formats: detect orientation from edge lengths
  const [tl, tr, br, bl] = corners;
  const avgH = (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2;
  const avgV = (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2;

  if (avgV >= avgH) {
    // Portrait
    return {
      width: Math.max(1, Math.round(Math.sqrt(area * aspect))),
      height: Math.max(1, Math.round(Math.sqrt(area / aspect))),
    };
  } else {
    // Landscape
    return {
      width: Math.max(1, Math.round(Math.sqrt(area / aspect))),
      height: Math.max(1, Math.round(Math.sqrt(area * aspect))),
    };
  }
}

export function perspectiveTransform(
  sourceCanvas: HTMLCanvasElement | HTMLImageElement,
  corners: Point[],
  outputFormat: OutputFormat = 'auto',
  outputWidth?: number,
  outputHeight?: number
): HTMLCanvasElement {
  let srcCanvas: HTMLCanvasElement;
  if (sourceCanvas instanceof HTMLImageElement) {
    srcCanvas = imageToCanvas(sourceCanvas);
  } else {
    srcCanvas = sourceCanvas;
  }
  const srcCtx = srcCanvas.getContext("2d")!;
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const srcPixels = srcData.data;

  const [tl, tr, br, bl] = corners;

  // Compute output dimensions based on format
  let { width: outW, height: outH } = computeOutputDimensions(corners, outputFormat);

  const MAX_SIZE = 2400;
  if (outW > MAX_SIZE || outH > MAX_SIZE) {
    const ratio = Math.min(MAX_SIZE / outW, MAX_SIZE / outH);
    outW = Math.round(outW * ratio);
    outH = Math.round(outH * ratio);
  }

  if (outputWidth && outputHeight) {
    outW = outputWidth;
    outH = outputHeight;
  }

  console.log('[perspective] format:', outputFormat, 'output:', outW, 'x', outH, 'aspect:', (outW/outH).toFixed(3));

  // Destination rectangle corners matching source layout
  const dst: Point[] = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH },
  ];

  // Normalize for numerical stability
  const srcNorm = normalizePoints(corners);
  const dstNorm = normalizePoints(dst);

  // Inverse transform: normDst → normSrc
  const Hnorm = computePerspectiveMatrix(dstNorm.normalized, srcNorm.normalized);

  // Full inverse: original_dst → original_src
  const H = multiplyMatrices(srcNorm.denormMatrix, multiplyMatrices(Hnorm, dstNorm.normMatrix));

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d")!;
  const outData = outCtx.createImageData(outW, outH);
  const outPixels = outData.data;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const [srcX, srcY] = transformPoint(H, x, y);

      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = x0 + 1;
      const y1 = y0 + 1;
      const fx = srcX - x0;
      const fy = srcY - y0;

      if (
        x0 >= 0 && x1 < srcCanvas.width &&
        y0 >= 0 && y1 < srcCanvas.height
      ) {
        const i00 = (y0 * srcCanvas.width + x0) * 4;
        const i10 = (y0 * srcCanvas.width + x1) * 4;
        const i01 = (y1 * srcCanvas.width + x0) * 4;
        const i11 = (y1 * srcCanvas.width + x1) * 4;
        const oi = (y * outW + x) * 4;

        for (let c = 0; c < 4; c++) {
          outPixels[oi + c] = Math.round(
            (1 - fx) * (1 - fy) * srcPixels[i00 + c] +
            fx * (1 - fy) * srcPixels[i10 + c] +
            (1 - fx) * fy * srcPixels[i01 + c] +
            fx * fy * srcPixels[i11 + c]
          );
        }
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}
