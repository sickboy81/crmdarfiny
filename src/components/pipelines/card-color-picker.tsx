"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Check } from "lucide-react";

const CARD_COLORS = [
  { value: null, label: "Padrão" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#f97316", label: "Laranja" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#a855f7", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#6b7280", label: "Cinza" },
];

interface CardColorPickerProps {
  dealId: string;
  currentColor?: string | null;
  onColorChange: (color: string | null) => void;
}

export function CardColorPicker({
  dealId,
  currentColor,
  onColorChange,
}: CardColorPickerProps) {
  const [saving, setSaving] = useState(false);

  async function handleColorChange(color: string | null) {
    setSaving(true);
    const db = createClient();
    const { error } = await db
      .from("deals")
      .update({ color })
      .eq("id", dealId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao alterar cor");
      return;
    }
    onColorChange(color);
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-1">
      {CARD_COLORS.map((c) => (
        <button
          key={c.value ?? "default"}
          onClick={() => handleColorChange(c.value)}
          disabled={saving}
          className={`relative flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-125 disabled:opacity-50 ${
            currentColor === c.value
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
              : ""
          }`}
          style={{
            backgroundColor: c.value ?? "var(--muted)",
            border: c.value ? "none" : "1px dashed var(--border)",
          }}
          title={c.label}
        >
          {currentColor === c.value && (
            <Check
              className="h-3.5 w-3.5"
              style={{ color: c.value ? "#fff" : "var(--foreground)" }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
