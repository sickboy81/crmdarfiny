"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Palette } from "lucide-react";

const SOLID_COLORS = [
  null, // default (no background)
  "#f8fafc", // slate-50
  "#f1f5f9", // slate-100
  "#e2e8f0", // slate-200
  "#dbeafe", // blue-100
  "#dcfce7", // green-100
  "#fef3c7", // amber-100
  "#fce7f3", // pink-100
];

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
];

interface BoardBackgroundPickerProps {
  currentBackground: string | null;
  onBackgroundChange: (bg: string | null) => void;
}

export function BoardBackgroundPicker({
  currentBackground,
  onBackgroundChange,
}: BoardBackgroundPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("boardFilters");

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-foreground">
            {t("boardBackground")}
          </p>

          {/* Solid colors */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SOLID_COLORS.map((color) => (
              <button
                key={color ?? "default"}
                type="button"
                onClick={() => {
                  onBackgroundChange(color);
                  setOpen(false);
                }}
                className={`h-7 w-10 rounded-md transition-transform hover:scale-110 ${
                  currentBackground === color
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-popover"
                    : ""
                }`}
                style={{
                  backgroundColor: color ?? "var(--muted)",
                  border: color ? "none" : "1px dashed var(--border)",
                }}
                title={color ?? t("default")}
              />
            ))}
          </div>

          {/* Gradients */}
          <p className="mb-2 text-xs font-medium text-foreground">
            {t("gradients")}
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {GRADIENTS.map((gradient) => (
              <button
                key={gradient}
                type="button"
                onClick={() => {
                  onBackgroundChange(gradient);
                  setOpen(false);
                }}
                className={`h-7 w-10 rounded-md transition-transform hover:scale-110 ${
                  currentBackground === gradient
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-popover"
                    : ""
                }`}
                style={{ background: gradient }}
                title={gradient}
              />
            ))}
          </div>

          {/* Clear */}
          <button
            type="button"
            onClick={() => {
              onBackgroundChange(null);
              setOpen(false);
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            {t("clearBackground")}
          </button>
        </div>
      )}
    </div>
  );
}
