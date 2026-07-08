"use client";

import { useState } from "react";
import type { DealLabel } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { X, Plus, Palette } from "lucide-react";

const LABEL_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
];

interface DealLabelsProps {
  dealId: string;
  labels: DealLabel[];
  onLabelsChange: () => void;
}

export function DealLabels({ dealId, labels, onLabelsChange }: DealLabelsProps) {
  const t = useTranslations("dealLabels");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const db = createClient();
      const { error } = await db.from("deal_labels").insert({
        deal_id: dealId,
        name: newName.trim(),
        color: newColor,
        position: labels.length,
      });
      if (error) throw error;
      setNewName("");
      setCreating(false);
      onLabelsChange();
      toast.success(t("createLabel"));
    } catch {
      toast.error(t("createLabelError"));
    }
  }

  async function handleDelete(labelId: string) {
    try {
      const db = createClient();
      const { error } = await db.from("deal_labels").delete().eq("id", labelId);
      if (error) throw error;
      onLabelsChange();
    } catch {
      toast.error("Erro ao remover label");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <span
            key={label.id}
            className="group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
            <button
              onClick={() => handleDelete(label.id)}
              className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            <Plus className="h-3 w-3" />
            Label
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            placeholder="Nome da label..."
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
            autoFocus
          />
          <div className="flex items-center gap-1">
            <Palette className="h-3 w-3 text-muted-foreground" />
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={`h-5 w-5 rounded-full transition-transform ${newColor === color ? "scale-125 ring-2 ring-foreground/20" : ""}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={handleCreate} className="rounded bg-primary px-2 py-1 text-[11px] text-primary-foreground hover:bg-primary/90">{t("create")}</button>
            <button onClick={() => { setCreating(false); setNewName(""); }} className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted">{t("cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
