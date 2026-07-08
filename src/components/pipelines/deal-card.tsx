"use client";

import type { Deal, PipelineStage } from "@/types";
import { useTranslations } from "next-intl";
import { Calendar, Check, X, CheckSquare, MessageSquare } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface DealCardProps {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name?: string, fallback?: string) {
  const source = (name || fallback || "?").trim();
  if (!source) return "?";
  return source.charAt(0).toUpperCase();
}

export function DealCard({ deal, stage, onEdit, isOverlay }: DealCardProps) {
  const ts = useTranslations("settings");
  const td = useTranslations("deals");
  const contactLabel = deal.contact?.name || deal.contact?.phone || ts("noContact");
  const assigneeLabel = deal.assignee?.full_name || null;

  const labels = deal.labels ?? [];
  const checklists = deal.checklists ?? [];
  const activityCount = deal.activity_count ?? 0;

  // Calculate overall checklist progress
  let totalItems = 0;
  let checkedItems = 0;
  for (const cl of checklists) {
    const items = cl.items ?? [];
    totalItems += items.length;
    checkedItems += items.filter((i) => i.is_checked).length;
  }
  const checklistPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <button
      type="button"
      onClick={(e) => {
        if (isOverlay) return;
        e.stopPropagation();
        onEdit(deal);
      }}
      className={`group relative w-full cursor-pointer rounded-xl border border-border bg-card pl-4 pr-3 py-3 text-left shadow-sm transition-all ${
        isOverlay
          ? "shadow-xl"
          : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      {/* 4px left accent bar */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
        style={{ backgroundColor: stage?.color ?? "var(--muted-foreground)" }}
      />

      {/* Labels */}
      {labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {labels.map((label) => (
            <span
              key={label.id}
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <h4 className="flex-1 text-sm font-semibold leading-snug text-foreground break-words">
          {deal.title}
        </h4>
        {deal.status === "won" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
            <Check className="h-3 w-3" />
            {td("won")}
          </span>
        )}
        {deal.status === "lost" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
            <X className="h-3 w-3" />
            {td("lost")}
          </span>
        )}
      </div>

      {/* Contact row */}
      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {initials(deal.contact?.name, deal.contact?.phone)}
        </span>
        <span className="truncate text-xs text-muted-foreground">{contactLabel}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-primary">
          {formatCurrency(deal.value, deal.currency)}
        </span>
        {deal.expected_close_date && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(deal.expected_close_date)}
          </span>
        )}
      </div>

      {/* Checklist progress + comment count */}
      {(totalItems > 0 || activityCount > 0) && (
        <div className="mt-2 flex items-center gap-3">
          {totalItems > 0 && (
            <div className="flex flex-1 items-center gap-1.5">
              <CheckSquare className="h-3 w-3 text-muted-foreground" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${checklistPct}%`,
                    backgroundColor: checklistPct === 100 ? "#22c55e" : "#3b82f6",
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{checkedItems}/{totalItems}</span>
            </div>
          )}
          {activityCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {activityCount}
            </span>
          )}
        </div>
      )}

      {assigneeLabel && (
        <div className="mt-2 flex items-center justify-end">
          <span
            title={assigneeLabel}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary"
          >
            {initials(assigneeLabel)}
          </span>
        </div>
      )}
    </button>
  );
}
