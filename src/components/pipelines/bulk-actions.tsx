"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { PipelineStage } from "@/types";
import { ArrowRight, Archive, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BulkActionsProps {
  selectedDealIds: string[];
  stages: PipelineStage[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActions({
  selectedDealIds,
  stages,
  onClearSelection,
  onActionComplete,
}: BulkActionsProps) {
  const t = useTranslations("bulkActions");
  const [loading, setLoading] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const count = selectedDealIds.length;

  if (count === 0) return null;

  async function handleMoveToStage(stageId: string) {
    setShowStageDropdown(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("deals")
        .update({ stage_id: stageId })
        .in("id", selectedDealIds);
      if (error) throw error;
      toast.success(t("moveSuccess", { count }));
      onActionComplete();
      onClearSelection();
    } catch {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("deals")
        .update({ archived: true })
        .in("id", selectedDealIds);
      if (error) throw error;
      toast.success(t("archiveSuccess", { count }));
      onActionComplete();
      onClearSelection();
    } catch {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t("deleteConfirm", { count }))) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("deals")
        .delete()
        .in("id", selectedDealIds);
      if (error) throw error;
      toast.success(t("deleteSuccess", { count }));
      onActionComplete();
      onClearSelection();
    } catch {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-2xl">
      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
        {count}
      </span>

      <span className="text-sm">{t("selected", { count })}</span>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="relative">
            <button
              onClick={() => setShowStageDropdown((prev) => !prev)}
              className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {t("moveTo")}
              <X className="h-3 w-3 rotate-45" />
            </button>

            {showStageDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                {stages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => handleMoveToStage(stage.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleArchive}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Archive className="h-3.5 w-3.5" />
            {t("archive")}
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-background px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("delete")}
          </button>
        </>
      )}

      <button
        onClick={onClearSelection}
        disabled={loading}
        className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
