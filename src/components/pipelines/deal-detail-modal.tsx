"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES } from "@/lib/currency";
import type {
  Deal,
  PipelineStage,
  Pipeline,
  DealLabel,
  DealChecklist,
  DealActivity,
  Profile,
  Contact,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Calendar,
  Check,
  DollarSign,
  Tag,
  Users,
  ArrowRight,
  Copy,
  Archive,
  Trash2,
  Loader2,
  Paperclip,
  MessageSquare,
  ListTodo,
  Image,
  ChevronDown,
  MoreHorizontal,
  Palette,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { DealLabels } from "./deal-labels";
import { DealChecklists } from "./deal-checklist";
import { DealActivityTimeline } from "./deal-activity";
import { DealAttachments } from "./deal-attachments";
import { DealCustomFields } from "./custom-fields";
import { CardColorPicker } from "./card-color-picker";

interface DealDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  stages: PipelineStage[];
  allPipelines?: Pipeline[];
  accountId?: string;
  profiles?: Profile[];
  contacts?: Contact[];
  onSaved: () => void;
  onMovePipeline?: (dealId: string, newPipelineId: string) => void;
}

export function DealDetailModal({
  open,
  onOpenChange,
  deal,
  stages,
  allPipelines,
  accountId,
  profiles = [],
  contacts = [],
  onSaved,
  onMovePipeline,
}: DealDetailModalProps) {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const supabase = createClient();
  const { accountId: authAccountId, defaultCurrency } = useAuth();

  // --- Deal data state ---
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [stageId, setStageId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [isWatching, setIsWatching] = useState(false);

  // --- Sub-entity data ---
  const [labels, setLabels] = useState<DealLabel[]>([]);
  const [checklists, setChecklists] = useState<DealChecklist[]>([]);
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [attachments, setAttachments] = useState<
    {
      id: string;
      deal_id: string;
      file_name: string;
      file_url: string;
      file_type: string | null;
      file_size: number | null;
      created_at: string;
    }[]
  >([]);

  // --- UI state ---
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Load deal sub-entities
  const loadDealDetails = useCallback(async () => {
    if (!deal) return;
    const db = createClient();
    const [labelsRes, checklistsRes, activitiesRes, attachmentsRes] =
      await Promise.all([
        db
          .from("deal_labels")
          .select("*")
          .eq("deal_id", deal.id)
          .order("position"),
        db
          .from("deal_checklists")
          .select("*, items:deal_checklist_items(*)")
          .eq("deal_id", deal.id)
          .order("position"),
        db
          .from("deal_activities")
          .select("*")
          .eq("deal_id", deal.id)
          .order("created_at", { ascending: false })
          .limit(50),
        db
          .from("deal_attachments")
          .select("*")
          .eq("deal_id", deal.id)
          .order("created_at", { ascending: false }),
      ]);
    setLabels((labelsRes.data ?? []) as DealLabel[]);
    setChecklists((checklistsRes.data ?? []) as DealChecklist[]);

    // Hydrate activity user names
    const activitiesData = (activitiesRes.data ?? []) as DealActivity[];
    const userIds = [
      ...new Set(activitiesData.map((a) => a.user_id).filter(Boolean)),
    ] as string[];
    let profilesMap = new Map<string, string>();
    if (userIds.length > 0) {
      const profilesRes = await db
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      for (const p of profilesRes.data ?? []) {
        profilesMap.set(p.id, p.full_name);
      }
    }
    const activitiesWithNames = activitiesData.map((a) => ({
      ...a,
      user: a.user_id
        ? { full_name: profilesMap.get(a.user_id) }
        : undefined,
    }));
    setActivities(activitiesWithNames as DealActivity[]);

    setAttachments(
      (attachmentsRes.data ?? []) as typeof attachments,
    );

    // Check if current user is watching this deal
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      const { data: watcher } = await db
        .from("deal_watchers")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("user_id", session.user.id)
        .maybeSingle();
      setIsWatching(!!watcher);
    }
  }, [deal]);

  // Sync fields when modal opens / deal prop changes
  useEffect(() => {
    if (!open || !deal) return;
    setConfirmDelete(false);
    setShowActionsMenu(false);
    setEditingTitle(false);
    setEditingDescription(false);
    setTitle(deal.title);
    setValue(String(deal.value ?? ""));
    setCurrency(deal.currency || defaultCurrency);
    setStageId(deal.stage_id);
    setAssignedTo(deal.assigned_to ?? "");
    setExpectedCloseDate(deal.expected_close_date ?? "");
    setNotes(deal.notes ?? "");
    setColor(deal.color ?? null);
    setDescription(deal.description ?? "");
    setCoverUrl(deal.cover_url ?? null);
    setArchived(deal.archived ?? false);
    loadDealDetails();
  }, [open, deal, defaultCurrency, loadDealDetails]);

  // Focus title input when editing starts
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  // Focus description textarea when editing starts
  useEffect(() => {
    if (editingDescription) descriptionRef.current?.focus();
  }, [editingDescription]);

  // Close modal on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  // --- Auto-save helpers ---
  async function saveField(field: string, updates: Record<string, unknown>) {
    if (!deal) return;
    setSavingField(field);
    const { error } = await supabase
      .from("deals")
      .update(updates)
      .eq("id", deal.id);
    setSavingField(null);
    if (error) {
      toast.error(tc("error"));
      return false;
    }
    onSaved();
    return true;
  }

  async function handleTitleBlur() {
    setEditingTitle(false);
    if (!deal) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === deal.title) return;
    await saveField("title", { title: trimmed });
  }

  async function handleDescriptionBlur() {
    setEditingDescription(false);
    if (!deal) return;
    const trimmed = description.trim();
    if (trimmed === (deal.description ?? "")) return;
    await saveField("description", { description: trimmed || null });
  }

  async function handleStageChange(newStageId: string) {
    if (!deal || newStageId === deal.stage_id) return;
    setStageId(newStageId);
    await saveField("stage", { stage_id: newStageId });
  }

  async function handleAssignedToChange(newAssignedTo: string) {
    if (!deal) return;
    const val = newAssignedTo || null;
    if (val === (deal.assigned_to ?? null)) return;
    setAssignedTo(newAssignedTo);
    await saveField("assigned_to", { assigned_to: val });
  }

  async function handleDateChange(newDate: string) {
    if (!deal) return;
    const val = newDate || null;
    if (val === (deal.expected_close_date ?? null)) return;
    setExpectedCloseDate(newDate);
    await saveField("expected_close_date", { expected_close_date: val });
  }

  async function handleValueChange(newValue: string) {
    setValue(newValue);
    if (!deal) return;
    const num = parseFloat(newValue) || 0;
    if (num === (deal.value ?? 0)) return;
    await saveField("value", { value: num });
  }

  async function handleCurrencyChange(newCurrency: string) {
    if (!deal) return;
    if (newCurrency === deal.currency) return;
    setCurrency(newCurrency);
    await saveField("currency", { currency: newCurrency });
  }

  async function handleCoverUpload(file: File) {
    if (!deal || !authAccountId) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `account-${authAccountId}/deals/covers/${Date.now()}-${ext}`;
    const { error } = await supabase.storage
      .from("deal-attachments")
      .upload(path, file, { contentType: file.type });
    if (error) {
      toast.error(tc("error"));
      return;
    }
    const { data } = supabase.storage
      .from("deal-attachments")
      .getPublicUrl(path);
    setCoverUrl(data.publicUrl);
    await saveField("cover_url", { cover_url: data.publicUrl });
  }

  async function handleCoverRemove() {
    setCoverUrl(null);
    await saveField("cover_url", { cover_url: null });
  }

  async function handleCopyDeal() {
    if (!deal) return;
    setShowActionsMenu(false);
    try {
      const db = createClient();
      const { data: newDeal, error } = await db
        .from("deals")
        .insert({
          title: `${deal.title} (copy)`,
          value: deal.value,
          currency: deal.currency,
          pipeline_id: deal.pipeline_id,
          stage_id: deal.stage_id,
          contact_id: deal.contact_id,
          assigned_to: deal.assigned_to,
          notes: deal.notes,
          expected_close_date: deal.expected_close_date,
          color: deal.color,
          description: deal.description,
          account_id: accountId || authAccountId,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Copy labels
      if (labels.length > 0 && newDeal) {
        await db.from("deal_labels").insert(
          labels.map((l, i) => ({
            deal_id: newDeal.id,
            name: l.name,
            color: l.color,
            position: i,
          })),
        );
      }

      toast.success(t("copySuccess"));
      onSaved();
    } catch {
      toast.error(t("copyError"));
    }
  }

  async function handleArchive() {
    if (!deal) return;
    setShowActionsMenu(false);
    const newArchived = !archived;
    await saveField("archive", { archived: newArchived });
    setArchived(newArchived);
    toast.success(newArchived ? t("archiveSuccess") : t("unarchiveSuccess"));
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!deal) return;
    setDeleting(true);
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    setDeleting(false);
    if (error) {
      toast.error(tc("error"));
      return;
    }
    toast.success(t("deleteSuccess"));
    setConfirmDelete(false);
    onOpenChange(false);
    onSaved();
  }

  async function toggleWatch() {
    if (!deal) return;
    const db = createClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user) return;

    if (isWatching) {
      await db
        .from("deal_watchers")
        .delete()
        .eq("deal_id", deal.id)
        .eq("user_id", session.user.id);
      setIsWatching(false);
    } else {
      await db
        .from("deal_watchers")
        .insert({ deal_id: deal.id, user_id: session.user.id });
      setIsWatching(true);
    }
  }

  if (!deal) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Card */}
          <div className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {/* Cover image */}
            {coverUrl && (
              <div className="relative h-48 w-full shrink-0">
                <img
                  src={coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleCoverRemove}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleCoverRemove();
                  }}
                  className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <X className="h-3 w-3" />
                  {t("coverRemove")}
                </div>
              </div>
            )}

            {/* Close button */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpenChange(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onOpenChange(false);
              }}
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </div>

            {/* Content area */}
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
              {/* Left column - main content */}
              <div className="flex flex-1 flex-col overflow-y-auto p-5">
                {/* Labels row */}
                {labels.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {labels.map((label) => (
                      <span
                        key={label.id}
                        className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <div className="mb-4">
                  {editingTitle ? (
                    <Input
                      ref={titleInputRef}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTitleBlur();
                      }}
                      className="border-transparent bg-transparent text-xl font-semibold text-foreground focus-visible:ring-0"
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingTitle(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          setEditingTitle(true);
                      }}
                      className="cursor-pointer rounded-lg px-2 py-1 text-xl font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      {title || tc("untitled")}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-5">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t("description")}
                  </h3>
                  {editingDescription ? (
                    <Textarea
                      ref={descriptionRef}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={handleDescriptionBlur}
                      placeholder={t("descriptionPlaceholder")}
                      className="min-h-[100px] border-border bg-muted text-foreground"
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingDescription(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          setEditingDescription(true);
                      }}
                      className="min-h-[60px] cursor-pointer rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {description || t("descriptionPlaceholder")}
                    </div>
                  )}
                </div>

                {/* Sections */}
                <div className="space-y-5">
                  {/* Checklists */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <ListTodo className="h-3.5 w-3.5" />
                      {t("tabChecklist")}
                    </h3>
                    <DealChecklists
                      dealId={deal.id}
                      checklists={checklists}
                      onChecklistsChange={loadDealDetails}
                    />
                  </div>

                  {/* Activity */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {t("tabActivity")}
                    </h3>
                    <DealActivityTimeline
                      dealId={deal.id}
                      activities={activities}
                      onRefresh={loadDealDetails}
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      {t("tabAttachments")}
                    </h3>
                    <DealAttachments
                      dealId={deal.id}
                      attachments={attachments}
                      onAttachmentsChange={loadDealDetails}
                    />
                  </div>

                  {/* Custom Fields */}
                  <DealCustomFields
                    dealId={deal.id}
                    pipelineId={deal.pipeline_id}
                    accountId={accountId || ""}
                  />
                </div>
              </div>

              {/* Right sidebar */}
              <div className="w-full shrink-0 border-t border-border bg-muted/30 p-4 lg:w-60 lg:border-l lg:border-t-0">
                <div className="space-y-4">
                  {/* Labels */}
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      {t("labels")}
                    </Label>
                    <DealLabels
                      dealId={deal.id}
                      labels={labels}
                      onLabelsChange={loadDealDetails}
                    />
                  </div>

                  {/* Members */}
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {t("owner")}
                    </Label>
                    <select
                      value={assignedTo}
                      onChange={(e) => handleAssignedToChange(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="">{tc("none")}</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stage */}
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      {t("stage")}
                    </Label>
                    <select
                      value={stageId}
                      onChange={(e) => handleStageChange(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {t("expectedCloseDate")}
                    </Label>
                    <Input
                      type="date"
                      value={expectedCloseDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="h-9 border-border bg-background text-foreground"
                    />
                  </div>

                  {/* Value */}
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      {t("value")}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => handleValueChange(e.target.value)}
                          placeholder="0"
                          className="h-9 border-border bg-background pl-7 text-foreground"
                        />
                      </div>
                      <select
                        value={currency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Palette className="h-3 w-3" />
                      {t("color")}
                    </Label>
                    <CardColorPicker
                      dealId={deal.id}
                      currentColor={color}
                      onColorChange={setColor}
                    />
                  </div>

                  {/* Cover image */}
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Image className="h-3 w-3" />
                      {t("coverImage")}
                    </Label>
                    {coverUrl ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={handleCoverRemove}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            handleCoverRemove();
                        }}
                        className="flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-background text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                        {t("coverRemove")}
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            if (file) handleCoverUpload(file);
                          };
                          input.click();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (ev) => {
                              const file = (
                                ev.target as HTMLInputElement
                              ).files?.[0];
                              if (file) handleCoverUpload(file);
                            };
                            input.click();
                          }
                        }}
                        className="flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
                      >
                        <Image className="h-3 w-3" />
                        {t("coverImage")}
                      </div>
                    )}
                  </div>

                  {/* Watch toggle */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={toggleWatch}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleWatch(); }}
                    className={`flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-sm transition-colors ${
                      isWatching
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {isWatching ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {isWatching ? t("unwatch") : t("watch")}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-border pt-3">
                    <div className="relative">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            setShowActionsMenu(!showActionsMenu);
                        }}
                        className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        {t("actions")}
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${showActionsMenu ? "rotate-180" : ""}`}
                        />
                      </div>

                      {showActionsMenu && (
                        <div className="absolute bottom-full left-0 z-30 mb-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={handleCopyDeal}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                handleCopyDeal();
                            }}
                            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {t("copy")}
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={handleArchive}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                handleArchive();
                            }}
                            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            {archived ? t("unarchive") : t("archive")}
                          </div>

                          {/* Move to pipeline */}
                          {allPipelines && allPipelines.length > 1 && (
                            <div className="border-t border-border">
                              {allPipelines.map((p) => (
                                <div
                                  key={p.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={async () => {
                                    if (p.id === deal.pipeline_id) return;
                                    setShowActionsMenu(false);
                                    if (onMovePipeline) {
                                      onMovePipeline(deal.id, p.id);
                                    } else {
                                      const { data: newStages } =
                                        await supabase
                                          .from("pipeline_stages")
                                          .select("id")
                                          .eq("pipeline_id", p.id)
                                          .order("position")
                                          .limit(1);
                                      if (newStages?.[0]) {
                                        await supabase
                                          .from("deals")
                                          .update({
                                            pipeline_id: p.id,
                                            stage_id: newStages[0].id,
                                          })
                                          .eq("id", deal.id);
                                        toast.success(t("moveSuccess"));
                                        onOpenChange(false);
                                        onSaved();
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      setShowActionsMenu(false);
                                    }
                                  }}
                                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted ${
                                    p.id === deal.pipeline_id
                                      ? "text-primary"
                                      : "text-foreground"
                                  }`}
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  {p.name}
                                  {p.id === deal.pipeline_id && (
                                    <Check className="ml-auto h-3.5 w-3.5" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="border-t border-border">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setShowActionsMenu(false);
                                setConfirmDelete(true);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  setShowActionsMenu(false);
                                  setConfirmDelete(true);
                                }
                              }}
                              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("delete")}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground">
              {t("delete")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("deleteConfirm")}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                className="flex-1"
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
              >
                {deleting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-4 w-4" />
                )}
                {tc("confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}