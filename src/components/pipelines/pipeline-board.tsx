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
import { Plus, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

interface PipelineBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealMoved: (dealId: string, newStageId: string) => void;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
  pipelineId?: string;
  onDealsChanged?: () => void;
}

export function PipelineBoard({
  stages,
  deals,
  onDealMoved,
  onAddDeal,
  onEditDeal,
  pipelineId,
  onDealsChanged,
}: PipelineBoardProps) {
  const { defaultCurrency, accountId } = useAuth();
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
      <div className="pipeline-board pipeline-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-xl p-4 pb-4 lg:snap-none">
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
          <div className="opacity-90">
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
        .pipeline-board {
          background: hsl(222, 47%, 8%);
        }
        .pipeline-scroll {
          scroll-behavior: smooth;
        }
        @media (hover: none), (pointer: coarse) {
          .pipeline-scroll::-webkit-scrollbar {
            height: 0;
            display: none;
          }
          .pipeline-scroll {
            scrollbar-width: none;
          }
        }
        @media (hover: hover) and (pointer: fine) {
          .pipeline-scroll {
            scrollbar-width: thin;
            scrollbar-color: hsl(222, 30%, 20%) transparent;
          }
          .pipeline-scroll::-webkit-scrollbar {
            height: 8px;
          }
          .pipeline-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .pipeline-scroll::-webkit-scrollbar-thumb {
            background-color: hsl(222, 30%, 20%);
            border-radius: 9999px;
          }
          .pipeline-scroll::-webkit-scrollbar-thumb:hover {
            background-color: hsl(222, 20%, 30%);
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
  pipelineId?: string;
  accountId?: string;
    onDealsChanged?: () => void;
  }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
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
      toast.success("Deal criado");
    } catch {
      toast.error("Erro ao criar deal");
    } finally {
      setQuickAdding(false);
    }
  }, [quickAddTitle, pipelineId, accountId, stage.id, onDealsChanged]);

  // Collapsed view — vertical bar
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex w-12 shrink-0 snap-start flex-col items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] py-4 transition-colors hover:bg-white/[0.06] lg:w-12"
      >
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <span
          className="writing-mode-vertical text-[11px] font-medium text-white/50"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          {stage.name}
        </span>
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
          {deals.length}
        </span>
        <ChevronRight className="h-3 w-3 rotate-180 text-white/30" />
      </button>
    );
  }

  return (
    <div className="flex w-[85vw] min-w-[260px] max-w-[320px] shrink-0 snap-start flex-col rounded-xl border border-white/5 bg-white/[0.03] p-4 lg:w-auto lg:max-w-none lg:flex-1 lg:basis-[260px] lg:shrink lg:snap-none">
      {/* 3px colored top bar */}
      <div
        className="-mx-4 -mt-4 h-[3px] rounded-t-xl"
        style={{ backgroundColor: stage.color }}
      />

      <div className="flex items-center justify-between pt-3">
        <h3 className="truncate text-sm font-semibold text-white/90">
          {stage.name}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/60">
            {deals.length}
          </span>
          <button
            onClick={onToggleCollapse}
            className="rounded p-0.5 text-white/30 hover:bg-white/10 hover:text-white/60"
            title="Recolher coluna"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-xs text-white/40">
        {formatCurrency(totalValue, currency)}
      </p>

      <div
        ref={setNodeRef}
        className={`mt-3 flex flex-1 flex-col gap-2 rounded-lg transition-all ${
          isOver
            ? "bg-primary/10 outline outline-2 outline-dashed outline-primary outline-offset-2"
            : ""
        }`}
      >
        {deals.length === 0 && !showQuickAdd ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-white/10 py-10 text-xs text-white/30">
            Arraste um deal aqui
          </div>
        ) : (
          deals.map((deal) => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              stage={stage}
              onEdit={onEditDeal}
            />
          ))
        )}
      </div>

      {/* Quick Add */}
      {showQuickAdd ? (
        <div className="mt-3 flex items-center gap-1.5">
          <input
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuickAdd();
              if (e.key === "Escape") { setShowQuickAdd(false); setQuickAddTitle(""); }
            }}
            placeholder="Título do deal..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleQuickAdd}
            disabled={!quickAddTitle.trim() || quickAdding}
            className="rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {quickAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowQuickAdd(true)}
          className="mt-3 w-full justify-start border border-dashed border-white/10 bg-transparent text-white/40 hover:border-white/20 hover:bg-white/5 hover:text-white/70"
        >
          <Plus className="mr-1 h-3 w-3" />
          Adicionar deal
        </Button>
      )}
    </div>
  );
}

function DraggableDealCard({
  deal,
  stage,
  onEdit,
}: {
  deal: Deal;
  stage: PipelineStage;
  onEdit: (deal: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: "none" }}
    >
      <DealCard deal={deal} stage={stage} onEdit={onEdit} />
    </div>
  );
}
