"use client";

import { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Deal, PipelineStage } from "@/types";
import { DealCard } from "./deal-card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface PipelineBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealMoved: (dealId: string, newStageId: string) => void;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
  onColorChange?: (dealId: string, color: string | null) => void;
  pipelineId?: string;
  onDealsChanged?: () => void;
}

export function PipelineBoard({
  stages,
  deals,
  onDealMoved,
  onAddDeal,
  onEditDeal,
  onColorChange,
  pipelineId,
  onDealsChanged,
}: PipelineBoardProps) {
  const { defaultCurrency, accountId } = useAuth();
  const tb = useTranslations("pipelineBoard");
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of sortedStages) map.set(stage.id, []);
    for (const deal of deals) {
      const bucket = map.get(deal.stage_id);
      if (bucket) bucket.push(deal);
    }
    return map;
  }, [sortedStages, deals]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const activeDeal = activeDealId
    ? deals.find((d) => d.id === activeDealId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const targetStageId = String(over.id);

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) return;
    if (!sortedStages.some((s) => s.id === targetStageId)) return;

    onDealMoved(dealId, targetStageId);
  }

  function handleDragCancel() {
    setActiveDealId(null);
  }

  const toggleCollapse = useCallback((stageId: string) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl p-2 lg:snap-none">
        {sortedStages.map((stage) => {
          const stageDeals = dealsByStage.get(stage.id) ?? [];
          const totalValue = stageDeals.reduce(
            (s, d) => s + Number(d.value || 0),
            0,
          );
          const collapsed = collapsedStages.has(stage.id);
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              totalValue={totalValue}
              currency={defaultCurrency}
              collapsed={collapsed}
              onToggleCollapse={() => toggleCollapse(stage.id)}
              onAddDeal={onAddDeal}
              onEditDeal={onEditDeal}
              onColorChange={onColorChange}
              pipelineId={pipelineId}
              accountId={accountId ?? undefined}
              onDealsChanged={onDealsChanged}
            />
          );
        })}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeDeal ? (
          <div className="opacity-95">
            <DealCard
              deal={activeDeal}
              stage={
                sortedStages.find((s) => s.id === activeDeal.stage_id) ?? null
              }
              onEdit={() => {}}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>

      <style jsx>{`
        .board-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .board-scroll::-webkit-scrollbar {
          height: 10px;
        }
        .board-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .board-scroll::-webkit-scrollbar-thumb {
          background-color: var(--border);
          border-radius: 9999px;
        }
        @media (hover: none), (pointer: coarse) {
          .board-scroll::-webkit-scrollbar {
            height: 0;
            display: none;
          }
          .board-scroll {
            scrollbar-width: none;
          }
        }
      `}</style>
    </DndContext>
  );
}

function StageColumn({
  stage,
  deals,
  totalValue,
  currency,
  collapsed,
  onToggleCollapse,
  onAddDeal,
  onEditDeal,
  onColorChange,
  pipelineId,
  accountId,
  onDealsChanged,
}: {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  currency: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
  onColorChange?: (dealId: string, color: string | null) => void;
  pipelineId?: string;
  accountId?: string;
  onDealsChanged?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const tb = useTranslations("pipelineBoard");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);

  const handleQuickAdd = useCallback(async () => {
    if (!quickAddTitle.trim() || !pipelineId || !accountId) return;
    setQuickAdding(true);
    try {
      const db = createClient();
      const { data: { session } } = await db.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const { error } = await db.from("deals").insert({
        title: quickAddTitle.trim(),
        pipeline_id: pipelineId,
        stage_id: stage.id,
        user_id: user.id,
        account_id: accountId,
        status: "open",
        value: 0,
      });
      if (error) throw error;
      setQuickAddTitle("");
      setShowQuickAdd(false);
      onDealsChanged?.();
      toast.success(tb("dealCreated"));
    } catch {
      toast.error(tb("dealCreateError"));
    } finally {
      setQuickAdding(false);
    }
  }, [quickAddTitle, pipelineId, accountId, stage.id, onDealsChanged, tb]);

  // Collapsed view — thin vertical strip
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex w-11 shrink-0 snap-start flex-col items-center gap-2 rounded-xl bg-black/5 py-3 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 lg:w-11"
        style={{ borderLeft: `3px solid ${stage.color}` }}
      >
        <span
          className="text-[10px] font-semibold text-muted-foreground"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          {stage.name}
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-bold text-muted-foreground">
          {deals.length}
        </span>
      </button>
    );
  }

  return (
    <div className="list-column flex w-[85vw] min-w-[272px] max-w-[300px] shrink-0 snap-start flex-col rounded-xl bg-muted/70 lg:w-auto lg:max-w-none lg:flex-1 lg:basis-[272px] lg:shrink lg:snap-none">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-[13px] font-semibold text-foreground">
            {stage.name}
          </h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1.5 text-[11px] font-bold text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="rounded p-1 text-muted-foreground/60 hover:bg-black/5 hover:text-muted-foreground dark:hover:bg-white/10"
          title={tb("collapseColumn")}
        >
          <ChevronDown className="h-4 w-4 -rotate-90" />
        </button>
      </div>

      {/* Value subtitle */}
      {totalValue > 0 && (
        <p className="px-2.5 pb-1 text-[11px] text-muted-foreground">
          {formatCurrency(totalValue, currency)}
        </p>
      )}

      {/* Card list */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto px-1.5 py-1 transition-colors ${
          isOver ? "rounded-lg bg-primary/5 outline outline-2 outline-dashed outline-primary/40" : ""
        }`}
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        {deals.length === 0 && !showQuickAdd ? (
          <div className="flex min-h-[40px] items-center justify-center rounded-lg border border-dashed border-transparent py-4 text-xs text-muted-foreground/50">
            {tb("dragDealHere")}
          </div>
        ) : (
          deals.map((deal) => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              stage={stage}
              onEdit={onEditDeal}
              onColorChange={onColorChange}
            />
          ))
        )}
      </div>

      {/* Quick Add or Add button */}
      <div className="px-1.5 pb-1.5 pt-1">
        {showQuickAdd ? (
          <div className="rounded-lg bg-background shadow-sm">
            <textarea
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickAdd();
                }
                if (e.key === "Escape") {
                  setShowQuickAdd(false);
                  setQuickAddTitle("");
                }
              }}
              placeholder={tb("quickAddPlaceholder")}
              className="w-full resize-none rounded-lg border-0 bg-transparent px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-1.5 px-2 pb-2">
              <button
                onClick={handleQuickAdd}
                disabled={!quickAddTitle.trim() || quickAdding}
                className="rounded-md bg-primary px-3 py-1 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {quickAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tb("addDeal")}
              </button>
              <button
                onClick={() => { setShowQuickAdd(false); setQuickAddTitle(""); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            {tb("addDeal")}
          </button>
        )}
      </div>
    </div>
  );
}

function DraggableDealCard({
  deal,
  stage,
  onEdit,
  onColorChange,
}: {
  deal: Deal;
  stage: PipelineStage;
  onEdit: (deal: Deal) => void;
  onColorChange?: (dealId: string, color: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
    >
      <DealCard deal={deal} stage={stage} onEdit={onEdit} onColorChange={onColorChange} />
    </div>
  );
}
