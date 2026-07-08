'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point } from '@/lib/scanner/perspective';

interface CornerSelectorProps {
  imageSrc: string;
  onConfirm: (corners: Point[]) => void;
  onCancel: () => void;
}

/**
 * Interactive corner selector for document crop.
 * Computes rendered image area to handle letterboxing correctly.
 */
export function CornerSelector({ imageSrc, onConfirm, onCancel }: CornerSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [corners, setCorners] = useState<Point[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const dragStart = useRef<{ mouseX: number; mouseY: number; cornerX: number; cornerY: number } | null>(null);

  // When image loads, set natural size and default corners
  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNaturalSize({ w: nw, h: nh });

    const margin = 0.05;
    setCorners([
      { x: nw * margin, y: nh * margin },
      { x: nw * (1 - margin), y: nh * margin },
      { x: nw * (1 - margin), y: nh * (1 - margin) },
      { x: nw * margin, y: nh * (1 - margin) },
    ]);
  }, []);

  // Recalculate display metrics when natural size changes or on resize
  useEffect(() => {
    if (naturalSize.w === 0) return;

    const update = () => {
      const img = imgRef.current;
      const container = containerRef.current;
      if (!img || !container) return;

      const containerRect = container.getBoundingClientRect();
      const maxW = containerRect.width;
      const maxH = (65 / 100) * window.innerHeight;

      const imgAspect = naturalSize.w / naturalSize.h;
      let dw: number, dh: number;

      if (imgAspect > maxW / maxH) {
        // Constrained by width
        dw = maxW;
        dh = maxW / imgAspect;
      } else {
        // Constrained by height
        dh = maxH;
        dw = maxH * imgAspect;
      }

      // The offset of the image within the container (for centered content)
      const ox = (maxW - dw) / 2;
      const oy = (maxH - dh) / 2;

      setDisplaySize({ w: dw, h: dh });
      setImageOffset({ x: ox, y: oy });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [naturalSize, imageSrc]);

  // Convert natural image coords → CSS position relative to the container
  const toCssStyle = (imgX: number, imgY: number): React.CSSProperties => {
    if (displaySize.w === 0 || naturalSize.w === 0) return { left: 0, top: 0 };
    const px = imageOffset.x + (imgX / naturalSize.w) * displaySize.w;
    const py = imageOffset.y + (imgY / naturalSize.h) * displaySize.h;
    return { left: px, top: py };
  };

  // Convert natural image coords → SVG local coords (SVG is already offset to image position)
  const toSvgPoint = (c: Point): string => {
    if (displaySize.w === 0 || naturalSize.w === 0) return '0,0';
    const px = (c.x / naturalSize.w) * displaySize.w;
    const py = (c.y / naturalSize.h) * displaySize.h;
    return `${px},${py}`;
  };

  // Convert mouse/touch client coords → natural image coords
  const clientToImage = useCallback((clientX: number, clientY: number): Point | null => {
    if (displaySize.w === 0 || naturalSize.w === 0 || !containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();
    const localX = clientX - containerRect.left - imageOffset.x;
    const localY = clientY - containerRect.top - imageOffset.y;
    return {
      x: Math.max(0, Math.min(naturalSize.w, (localX / displaySize.w) * naturalSize.w)),
      y: Math.max(0, Math.min(naturalSize.h, (localY / displaySize.h) * naturalSize.h)),
    };
  }, [naturalSize, displaySize, imageOffset]);

  // Start dragging
  const handlePointerDown = useCallback((cornerIndex: number, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    dragStart.current = {
      mouseX: clientX,
      mouseY: clientY,
      cornerX: corners[cornerIndex].x,
      cornerY: corners[cornerIndex].y,
    };
    setDragging(cornerIndex);
  }, [corners]);

  // Move dragging
  useEffect(() => {
    if (dragging === null) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStart.current) return;

      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Compute delta in natural image coords
      const scaleX = naturalSize.w / displaySize.w;
      const scaleY = naturalSize.h / displaySize.h;
      const deltaX = (clientX - dragStart.current.mouseX) * scaleX;
      const deltaY = (clientY - dragStart.current.mouseY) * scaleY;

      const newX = Math.max(0, Math.min(naturalSize.w, dragStart.current.cornerX + deltaX));
      const newY = Math.max(0, Math.min(naturalSize.h, dragStart.current.cornerY + deltaY));

      setCorners((prev) => {
        const next = [...prev];
        next[dragging] = { x: newX, y: newY };
        return next;
      });
    };

    const handleUp = () => {
      dragStart.current = null;
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging, naturalSize, displaySize]);

  const svgW = displaySize.w || 1;
  const svgH = displaySize.h || 1;
  const svgPts = corners.map(toSvgPoint).join(' ');
  const svgOffsetX = imageOffset.x;
  const svgOffsetY = imageOffset.y;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground text-center">
        Arraste os cantos para ajustar a área do documento
      </p>

      <div
        ref={containerRef}
        className="relative mx-auto w-full overflow-hidden rounded-lg border border-border bg-black"
        style={{ maxHeight: '65vh' }}
      >
        {/* Actual rendered image with explicit dimensions */}
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Documento"
          className="block select-none"
          style={{
            width: displaySize.w || '100%',
            height: displaySize.h || 'auto',
            marginLeft: imageOffset.x,
            marginTop: imageOffset.y,
          }}
          onLoad={handleImageLoad}
          draggable={false}
        />

        {/* SVG overlay for the quadrilateral */}
        {naturalSize.w > 0 && displaySize.w > 0 && (
          <svg
            className="absolute pointer-events-none"
            style={{
              left: svgOffsetX,
              top: svgOffsetY,
              width: svgW,
              height: svgH,
            }}
            viewBox={`0 0 ${svgW} ${svgH}`}
          >
            <defs>
              <mask id="cornerMask">
                <rect width={svgW} height={svgH} fill="white" />
                <polygon points={svgPts} fill="black" />
              </mask>
            </defs>
            <rect width={svgW} height={svgH} fill="rgba(0,0,0,0.4)" mask="url(#cornerMask)" />
            <polygon points={svgPts} fill="none" stroke="#a855f7" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          </svg>
        )}

        {/* Draggable corner handles */}
        {corners.map((c, i) => {
          const pos = toCssStyle(c.x, c.y);
          const handleSize = 40;
          return (
            <div
              key={i}
              className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
              style={{
                ...pos,
                width: handleSize,
                height: handleSize,
                marginLeft: -handleSize / 2,
                marginTop: -handleSize / 2,
                zIndex: dragging === i ? 20 : 10,
                touchAction: 'none',
              }}
              onMouseDown={(e) => handlePointerDown(i, e)}
              onTouchStart={(e) => handlePointerDown(i, e)}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg transition-colors ${
                  dragging === i
                    ? 'bg-primary scale-110'
                    : 'bg-primary/80 hover:bg-primary'
                }`}
              >
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        {['Top-left', 'Top-right', 'Bottom-right', 'Bottom-left'].map((label, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-primary" />
            {label}
          </span>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          Cancelar
        </button>
        <button
          onClick={() => onConfirm(corners)}
          disabled={corners.length !== 4}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Aplicar Correção
        </button>
      </div>
    </div>
  );
}
