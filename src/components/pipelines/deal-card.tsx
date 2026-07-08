"use client";

import { useState, useRef, useEffect } from "react";
import type { Deal, PipelineStage } from "@/types";
import { useTranslations } from "next-intl";
import { Calendar, Check, X, CheckSquare, MessageSquare, Palette, Paperclip, MoreHorizontal, Archive, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { CardColorPicker } from "./card-color-picker";

interface DealCardProps {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  onColorChange?: (dealId: string, color: string | null) => void;
  onArchive?: (dealId: string) => void;
  onUnarchive?: (dealId: string) => void;
  onCopy?: (deal: Deal) => void;
  isOverlay?: boolean;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isOverdue = d < now;
  const date = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  return { date, isOverdue };
}

function getInitials(name?: string, fallback?: string) {
  const source = (name || fallback || "").trim();
  if (!source) return "";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function DealCard({ deal, stage, onEdit, onColorChange, onArchive, onUnarchive, onCopy, isOverlay }: DealCardProps) {
  const ts = useTranslations("settings");
  const td = useTranslations("deals");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [cardColor, setCardColor] = useState(deal.color ?? null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const contactName = deal.contact?.name || deal.contact?.phone || "";
  const assigneeName = deal.assignee?.full_name || "";

  const labels = deal.labels ?? [];
  const checklists = deal.checklists ?? [];
  const activityCount = deal.activity_count ?? 0;
  const attachmentCount = deal.attachment_count ?? 0;

  let totalItems = 0;
  let checkedItems = 0;
  for (const cl of checklists) {
    const items = cl.items ?? [];
    totalItems += items.length;
    checkedItems += items.filter((i) => i.is_checked).length;
  }

  const dueInfo = deal.expected_close_date ? formatShortDate(deal.expected_close_date) : null;
  const hasBadges = dueInfo || totalItems > 0 || activityCount > 0 || attachmentCount > 0 || deal.status === "won" || deal.status === "lost";

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    function handleClick(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showColorPicker]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  function handleColorChange(color: string | null) {
    setCardColor(color);
    setShowColorPicker(false);
    onColorChange?.(deal.id, color);
  }

  return (
    <div className="relative">
      {/* Cover image */}
      {deal.cover_url && (
        <div className="overflow-hidden rounded-t-lg">
          <img
            src={deal.cover_url}
            alt=""
            className="h-24 w-full object-cover"
          />
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (isOverlay || showColorPicker) return;
          e.stopPropagation();
          onEdit(deal);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!isOverlay && !showColorPicker) onEdit(deal);
          }
        }}
        className={`deal-card group w-full cursor-pointer rounded-lg border bg-card text-left shadow-sm transition-all ${
          isOverlay
            ? "border-primary/40 shadow-xl ring-2 ring-primary/20"
            : "border-border hover:border-primary/30 hover:shadow-md"
        }`}
        style={cardColor ? { borderTop: `3px solid ${cardColor}` } : undefined}
      >
        {/* Labels row */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 px-2.5 pt-2">
            {labels.map((label) => (
              <span
                key={label.id}
                className="h-2 w-10 rounded-full"
                style={{ backgroundColor: label.color }}
                title={label.name}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <div className="px-2.5 pt-2 pb-1">
          <h4 className="text-[13px] font-medium leading-snug text-foreground break-words">
            {deal.title}
          </h4>
        </div>

        {/* Description preview */}
        {deal.description && (
          <div className="px-2.5 pb-1">
            <p className="line-clamp-2 text-[11px] text-muted-foreground">
              {deal.description}
            </p>
          </div>
        )}

        {/* Badges row */}
        {hasBadges && (
          <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2">
            {dueInfo && (
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                  dueInfo.isOverdue
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                {dueInfo.date}
              </span>
            )}
            {deal.status === "won" && (
              <span className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-3 w-3" />
                {td("won")}
              </span>
            )}
            {deal.status === "lost" && (
              <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <X className="h-3 w-3" />
                {td("lost")}
              </span>
            )}
            {totalItems > 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                  (checkedItems / totalItems) === 1
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CheckSquare className="h-3 w-3" />
                {checkedItems}/{totalItems}
              </span>
            )}
            {activityCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {activityCount}
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {attachmentCount}
              </span>
            )}
          </div>
        )}

        {/* Actions (visible on hover) */}
        {(onArchive || onCopy) && (
          <div className="flex items-center gap-1 px-2.5 pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onCopy && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCopy(deal); }}
                className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                title="Copiar"
              >
                Copiar
              </button>
            )}
            {onArchive && !deal.archived && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onArchive(deal.id); }}
                className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                title="Arquivar"
              >
                Arquivar
              </button>
            )}
            {onUnarchive && deal.archived && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUnarchive(deal.id); }}
                className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                title="Desarquivar"
              >
                Desarquivar
              </button>
            )}
          </div>
        )}

        {/* Footer: color btn + value + members */}
        <div className="flex items-center justify-between border-t border-border/50 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            {/* Color picker trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
              title="Alterar cor"
            >
              <Palette className="h-3.5 w-3.5" />
            </button>
            {/* Actions menu */}
            {(onArchive || onUnarchive || onCopy) && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
                  title="Ações"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {showMenu && (
                  <div className="absolute bottom-full left-0 z-50 mb-1 w-40 rounded-lg border border-border bg-popover py-1 shadow-lg">
                    {deal.archived && onUnarchive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onUnarchive(deal.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        {td("unarchive")}
                      </button>
                    )}
                    {!deal.archived && onArchive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onArchive(deal.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        {td("archive")}
                      </button>
                    )}
                    {onCopy && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onCopy(deal);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {td("copy")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <span className="text-xs font-semibold text-primary">
              {formatCurrency(deal.value, deal.currency)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {contactName && (
              <span
                title={contactName}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
              >
                {getInitials(deal.contact?.name, deal.contact?.phone)}
              </span>
            )}
            {assigneeName && (
              <span
                title={assigneeName}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
              >
                {getInitials(assigneeName)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Color picker popover */}
      {showColorPicker && (
        <div
          ref={colorPickerRef}
          className="absolute bottom-full left-0 z-50 mb-1 rounded-lg border border-border bg-popover p-2 shadow-lg"
        >
          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">Cor do card</p>
          <CardColorPicker
            dealId={deal.id}
            currentColor={cardColor}
            onColorChange={handleColorChange}
          />
        </div>
      )}
    </div>
  );
}
