"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import type { Pipeline, PipelineStage, Deal } from "@/types";
import { PipelineBoard } from "@/components/pipelines/pipeline-board";
import { PipelineSettings } from "@/components/pipelines/pipeline-settings";
import { DealForm } from "@/components/pipelines/deal-form";
import { PipelineAnalytics } from "@/components/pipelines/pipeline-analytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitBranch, Plus, ChevronDown, Settings } from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/hooks/use-can";
import { useAuth } from "@/hooks/use-auth";
import { GatedButton } from "@/components/ui/gated-button";

// Pipeline creation is admin-class (settings-tier write under
// the new RLS); deal creation is operational and only requires
// agent+. The two CTAs gate on different `useCan` capabilities,
// not on different copy.

// Default stages with translated names via i18n
const DEFAULT_STAGES = (t: (key: string) => string) => [
  { name: t("stageNewLead"), color: "#3b82f6", position: 0 },
  { name: t("stageQualified"), color: "#eab308", position: 1 },
  { name: t("stageProposalSent"), color: "#f97316", position: 2 },
  { name: t("stageNegotiation"), color: "#8b5cf6", position: 3 },
  { name: t("stageWon"), color: "#22c55e", position: 4 },
];

export default function PipelinesPage() {
  const supabase = createClient();
  const canEditSettings = useCan("edit-settings");
  const canCreateDeals = useCan("send-messages");
  const { accountId } = useAuth();
  const t = useTranslations("pipelines");
  const tc = useTranslations("common");

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog / sheet state
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Deal form state is lifted here so both the top-bar "Add Deal" and
  // the per-column "+" trigger the same Sheet.
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<string>("");

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLabel, setFilterLabel] = useState<string>("");
  const [filterMember, setFilterMember] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);

  // Guard against double-seeding (React StrictMode double-effect in dev).
  const seedAttempted = useRef(false);

  const loadPipelines = useCallback(async () => {
    const { data, error } = await supabase
      .from("pipelines")
      .select("*")
      .order("created_at");
    if (error) {
      console.error("Failed to load pipelines:", error.message);
      return [];
    }
    return data ?? [];
  }, [supabase]);

  const loadStages = useCallback(
    async (pipelineId: string) => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("position");
      return data ?? [];
    },
    [supabase],
  );

  const loadDeals = useCallback(
    async (pipelineId: string) => {
      const { data } = await supabase
        .from("deals")
        .select("*, contact:contacts(*), assignee:profiles!deals_assigned_to_fkey(*)")
        .eq("pipeline_id", pipelineId)
        .order("created_at", { ascending: false });
      const dealsList = (data ?? []) as Deal[];
      if (dealsList.length === 0) return dealsList;

      const dealIds = dealsList.map((d) => d.id);

      // Batch-fetch labels, checklists+items, activity counts, and attachment counts
      const [labelsRes, checklistsRes, activitiesRes, attachmentsRes] = await Promise.all([
        supabase.from("deal_labels").select("*").in("deal_id", dealIds).order("position"),
        supabase.from("deal_checklists").select("*, items:deal_checklist_items(*)").in("deal_id", dealIds).order("position"),
        supabase.from("deal_activities").select("deal_id").in("deal_id", dealIds),
        supabase.from("deal_attachments").select("deal_id").in("deal_id", dealIds),
      ]);

      const labelsMap = new Map<string, typeof dealsList[0]["labels"]>();
      for (const l of labelsRes.data ?? []) {
        const arr = labelsMap.get(l.deal_id) ?? [];
        arr.push(l);
        labelsMap.set(l.deal_id, arr);
      }

      const checklistsMap = new Map<string, typeof dealsList[0]["checklists"]>();
      for (const c of checklistsRes.data ?? []) {
        const arr = checklistsMap.get(c.deal_id) ?? [];
        arr.push(c);
        checklistsMap.set(c.deal_id, arr);
      }

      const activityCountMap = new Map<string, number>();
      for (const a of activitiesRes.data ?? []) {
        activityCountMap.set(a.deal_id, (activityCountMap.get(a.deal_id) ?? 0) + 1);
      }

      const attachmentCountMap = new Map<string, number>();
      for (const a of attachmentsRes.data ?? []) {
        attachmentCountMap.set(a.deal_id, (attachmentCountMap.get(a.deal_id) ?? 0) + 1);
      }

      return dealsList.map((d) => ({
        ...d,
        labels: labelsMap.get(d.id) ?? [],
        checklists: checklistsMap.get(d.id) ?? [],
        activity_count: activityCountMap.get(d.id) ?? 0,
        attachment_count: attachmentCountMap.get(d.id) ?? 0,
      }));
    },
    [supabase],
  );

  const seedDefaultPipeline = useCallback(async (): Promise<Pipeline | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;
    // pipelines.account_id is NOT NULL post-017 with no DB default.
    if (!accountId) return null;

    const { data: pipeline, error } = await supabase
      .from("pipelines")
      .insert({ user_id: user.id, account_id: accountId, name: t("defaultPipelineName") })
      .select()
      .single();

    if (error || !pipeline) {
      console.error("Failed to seed pipeline:", error?.message);
      return null;
    }

    const stagesPayload = DEFAULT_STAGES(t).map((s) => ({
      pipeline_id: pipeline.id,
      name: s.name,
      color: s.color,
      position: s.position,
    }));
    await supabase.from("pipeline_stages").insert(stagesPayload);

    return pipeline as Pipeline;
  }, [supabase, accountId, t]);

  // Initial load + seed-if-empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let list = await loadPipelines();

      if (list.length === 0 && !seedAttempted.current) {
        seedAttempted.current = true;
        const seeded = await seedDefaultPipeline();
        if (seeded) list = await loadPipelines();
      }

      if (cancelled) return;
      setPipelines(list);
      if (list.length > 0) {
        setSelectedPipelineId((prev) =>
          prev && list.some((p) => p.id === prev) ? prev : list[0].id,
        );
      } else {
        setSelectedPipelineId("");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPipelines, seedDefaultPipeline]);

  // Load stages + deals whenever selected pipeline changes.
  // Clearing on no-selection is a legitimate sync with URL/prop
  // state; the load completion uses async setters inside promise
  // callbacks (not synchronous in the effect body).
  useEffect(() => {
    if (!selectedPipelineId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStages([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeals([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [s, d] = await Promise.all([
        loadStages(selectedPipelineId),
        loadDeals(selectedPipelineId),
      ]);
      if (cancelled) return;
      setStages(s);
      setDeals(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPipelineId, loadStages, loadDeals]);

  const refreshPipelines = useCallback(async () => {
    const list = await loadPipelines();
    setPipelines(list);
    if (list.length === 0) setSelectedPipelineId("");
    else if (!list.some((p) => p.id === selectedPipelineId))
      setSelectedPipelineId(list[0].id);
  }, [loadPipelines, selectedPipelineId]);

  const refreshStages = useCallback(async () => {
    if (!selectedPipelineId) return;
    setStages(await loadStages(selectedPipelineId));
  }, [loadStages, selectedPipelineId]);

  const refreshDeals = useCallback(async () => {
    if (!selectedPipelineId) return;
    setDeals(await loadDeals(selectedPipelineId));
  }, [loadDeals, selectedPipelineId]);

  const handleDealMoved = useCallback(
    async (dealId: string, newStageId: string) => {
      // Optimistic update — board already animated; just persist.
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)),
      );
      const { error } = await supabase
        .from("deals")
        .update({ stage_id: newStageId })
        .eq("id", dealId);
      if (error) {
        toast.error(t("failedToMove"));
        refreshDeals();
      }
    },
    [supabase, refreshDeals],
  );

  const handleAddDeal = useCallback(
    (stageId?: string) => {
      setEditingDeal(null);
      setDefaultStageId(stageId ?? stages[0]?.id ?? "");
      setDealFormOpen(true);
    },
    [stages],
  );

  const handleEditDeal = useCallback((deal: Deal) => {
    setEditingDeal(deal);
    setDefaultStageId(deal.stage_id);
    setDealFormOpen(true);
  }, []);

  const handleColorChange = useCallback((dealId: string, color: string | null) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, color } : d))
    );
  }, []);

  // Collect all unique labels and members for filter dropdowns
  const allLabels = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const deal of deals) {
      for (const label of deal.labels ?? []) {
        map.set(label.id, { name: label.name, color: label.color });
      }
    }
    return Array.from(map.entries());
  }, [deals]);

  const allMembers = useMemo(() => {
    const map = new Map<string, string>();
    for (const deal of deals) {
      if (deal.assigned_to && deal.assignee?.full_name) {
        map.set(deal.assigned_to, deal.assignee.full_name);
      }
    }
    return Array.from(map.entries());
  }, [deals]);

  // Apply filters
  const filteredDeals = useMemo(() => {
    let result = deals.filter((d) => (d.archived ?? false) === showArchived);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.contact?.name?.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q),
      );
    }
    if (filterLabel) {
      result = result.filter((d) =>
        (d.labels ?? []).some((l) => l.id === filterLabel),
      );
    }
    if (filterMember) {
      result = result.filter((d) => d.assigned_to === filterMember);
    }
    return result;
  }, [deals, searchQuery, filterLabel, filterMember, showArchived]);

  const handleArchive = useCallback(async (dealId: string) => {
    const { error } = await supabase
      .from("deals")
      .update({ archived: true })
      .eq("id", dealId);
    if (error) {
      toast.error(t("failedToMove"));
      return;
    }
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    toast.success(t("archiveSuccess"));
  }, [supabase, t]);

  const handleUnarchive = useCallback(async (dealId: string) => {
    const { error } = await supabase
      .from("deals")
      .update({ archived: false })
      .eq("id", dealId);
    if (error) {
      toast.error(t("failedToMove"));
      return;
    }
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    toast.success(t("unarchiveSuccess"));
  }, [supabase, t]);

  const handleCopy = useCallback(async (deal: Deal) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !accountId) return;
    const { error } = await supabase.from("deals").insert({
      title: `${deal.title} (cópia)`,
      pipeline_id: deal.pipeline_id,
      stage_id: deal.stage_id,
      user_id: user.id,
      account_id: accountId,
      contact_id: deal.contact_id,
      value: deal.value,
      currency: deal.currency,
      notes: deal.notes,
      status: "open",
    });
    if (error) {
      toast.error(t("copyError"));
      return;
    }
    toast.success(t("copySuccess"));
    refreshDeals();
  }, [supabase, accountId, refreshDeals, t]);

  const handleBoardBackground = useCallback(async (bg: string | null) => {
    if (!selectedPipelineId) return;
    const { error } = await supabase
      .from("pipelines")
      .update({ board_background: bg })
      .eq("id", selectedPipelineId);
    if (!error) {
      setPipelines((prev) =>
        prev.map((p) =>
          p.id === selectedPipelineId ? { ...p, board_background: bg } : p,
        ),
      );
    }
  }, [supabase, selectedPipelineId]);

  async function handleCreatePipeline() {
    const name = newPipelineName.trim();
    if (!name) return;
    setCreating(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setCreating(false);
      return;
    }
    // pipelines.account_id is NOT NULL post-017 with no DB default.
    if (!accountId) {
      toast.error(t("profileNotLinked"));
      setCreating(false);
      return;
    }

    const { data: pipeline, error } = await supabase
      .from("pipelines")
      .insert({ user_id: user.id, account_id: accountId, name })
      .select()
      .single();

    if (error || !pipeline) {
      toast.error(t("failedToCreate"));
      setCreating(false);
      return;
    }

    const stagesPayload = DEFAULT_STAGES(t).map((s) => ({
      pipeline_id: pipeline.id,
      name: s.name,
      color: s.color,
      position: s.position,
    }));
    await supabase.from("pipeline_stages").insert(stagesPayload);

    setNewPipelineName("");
    setNewPipelineOpen(false);
    setSelectedPipelineId(pipeline.id);
    await refreshPipelines();
    setCreating(false);
    toast.success(t("pipelineCreated"));
  }

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-96 w-72 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Pipeline selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors data-[popup-open]:bg-muted"
            >
              <GitBranch className="h-4 w-4 text-primary" />
              <span className="font-semibold">
                {selectedPipeline?.name ?? t("selectPipeline")}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64 border-border bg-popover text-popover-foreground"
            >
              {pipelines.length === 0 && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  {t("noPipelines")}
                </DropdownMenuItem>
              )}
              {pipelines.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setSelectedPipelineId(p.id)}
                  className={
                    p.id === selectedPipelineId
                      ? "text-primary"
                      : "text-popover-foreground"
                  }
                >
                  <GitBranch className="mr-2 h-3.5 w-3.5" />
                  {p.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-border" />
              {selectedPipeline && (
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="text-popover-foreground"
                >
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  {t("managePipelines")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <GatedButton
            variant="outline"
            canAct={canEditSettings}
            gateReason="create pipelines"
            onClick={() => setNewPipelineOpen(true)}
            className="border-border bg-card text-foreground hover:bg-muted"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("addPipeline")}
          </GatedButton>
          <GatedButton
            canAct={canCreateDeals}
            gateReason="create deals"
            disabled={!selectedPipelineId || stages.length === 0}
            onClick={() => handleAddDeal()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("addDeal")}
          </GatedButton>
        </div>
      </div>

      {/* Board */}
      {pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <GitBranch className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {t("noPipelines")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("noPipelinesDescription")}
          </p>
          <GatedButton
            canAct={canEditSettings}
            gateReason="create pipelines"
            onClick={() => setNewPipelineOpen(true)}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("createPipeline")}
          </GatedButton>
        </div>
      ) : (
        <>
          <PipelineAnalytics stages={stages} deals={deals} />
          <PipelineBoard
            stages={stages}
            deals={filteredDeals}
            onDealMoved={handleDealMoved}
            onAddDeal={handleAddDeal}
            onEditDeal={handleEditDeal}
            onColorChange={handleColorChange}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onCopy={handleCopy}
            pipelineId={selectedPipelineId}
            onDealsChanged={refreshDeals}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterLabel={filterLabel}
            onFilterLabelChange={setFilterLabel}
            filterMember={filterMember}
            onFilterMemberChange={setFilterMember}
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
            allLabels={allLabels}
            allMembers={allMembers}
            boardBackground={selectedPipeline?.board_background ?? null}
            onBoardBackgroundChange={handleBoardBackground}
          />
        </>
      )}

      {/* New Pipeline Dialog */}
      <Dialog open={newPipelineOpen} onOpenChange={setNewPipelineOpen}>
        <DialogContent className="sm:max-w-sm bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">{t("newPipeline")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-muted-foreground">{t("pipelineName")}</Label>
            <Input
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder={t("pipelineNamePlaceholder")}
              className="mt-2 bg-muted border-border text-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreatePipeline();
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t("defaultStagesHint")}
            </p>
          </div>
          <DialogFooter className="bg-popover/50 border-border">
            <Button
              variant="outline"
              onClick={() => setNewPipelineOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleCreatePipeline}
              disabled={creating || !newPipelineName.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {creating ? t("creating") : t("createPipeline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pipeline Settings */}
      {selectedPipeline && (
        <PipelineSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          pipeline={selectedPipeline}
          stages={stages}
          onPipelinesChanged={refreshPipelines}
          onStagesChanged={refreshStages}
          onCreateNewPipeline={() => {
            setSettingsOpen(false);
            setNewPipelineOpen(true);
          }}
        />
      )}

      {/* Deal Form (Sheet) */}
      <DealForm
        open={dealFormOpen}
        onOpenChange={setDealFormOpen}
        deal={editingDeal}
        pipelineId={selectedPipelineId}
        stages={stages}
        defaultStageId={defaultStageId}
        onSaved={refreshDeals}
      />
    </div>
  );
}
