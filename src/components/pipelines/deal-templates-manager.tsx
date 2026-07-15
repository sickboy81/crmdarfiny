"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { DealTemplate } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DealTemplatesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View = "list" | "form" | "delete";

interface FormData {
  name: string;
  title: string;
  description: string;
  value: string;
  currency: string;
  checklistRaw: string;
  labelsRaw: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  title: "",
  description: "",
  value: "",
  currency: "BRL",
  checklistRaw: "",
  labelsRaw: "",
};

function formFromTemplate(tpl: DealTemplate): FormData {
  return {
    name: tpl.name ?? "",
    title: tpl.title ?? "",
    description: tpl.description ?? "",
    value: tpl.value != null ? String(tpl.value) : "",
    currency: tpl.currency ?? "BRL",
    checklistRaw: (tpl.checklist_items ?? []).join("\n"),
    labelsRaw: (tpl.label_names ?? [])
      .map((n, i) => `${n}:${(tpl.label_colors ?? [])[i] ?? "#3b82f6"}`)
      .join("\n"),
  };
}

function parseFormToTemplate(
  form: FormData,
  accountId: string,
  userId: string,
): Omit<DealTemplate, "id" | "created_at"> {
  const checklistItems = form.checklistRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const labelNames: string[] = [];
  const labelColors: string[] = [];
  for (const line of form.labelsRaw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx > 0) {
      labelNames.push(trimmed.slice(0, idx));
      labelColors.push(trimmed.slice(idx + 1));
    } else {
      labelNames.push(trimmed);
      labelColors.push("#3b82f6");
    }
  }

  return {
    account_id: accountId,
    user_id: userId,
    name: form.name.trim(),
    title: form.title.trim(),
    description: form.description.trim() || null,
    value: form.value ? Number(form.value) : 0,
    currency: form.currency.trim() || "BRL",
    checklist_items: checklistItems.length > 0 ? checklistItems : undefined,
    label_names: labelNames.length > 0 ? labelNames : undefined,
    label_colors: labelColors.length > 0 ? labelColors : undefined,
  };
}

export function DealTemplatesManager({
  open,
  onOpenChange,
}: DealTemplatesManagerProps) {
  const t = useTranslations("dealTemplates");
  const tc = useTranslations("common");
  const { accountId, user, defaultCurrency } = useAuth();
  const supabase = createClient();

  const [templates, setTemplates] = useState<DealTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("list");
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [editing, setEditing] = useState<DealTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DealTemplate | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("deal_templates")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(t("error"));
      return;
    }
    setTemplates(data ?? []);
  }, [accountId, supabase, t]);

  // Reset view when dialog opens
  useEffect(() => {
    if (!open) return;
    setView("list");
    setEditing(null);
    setDeleting(null);
    fetchTemplates();
  }, [open, fetchTemplates]);

  function handleNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, currency: defaultCurrency });
    setView("form");
  }

  function handleEdit(tpl: DealTemplate) {
    setEditing(tpl);
    setForm(formFromTemplate(tpl));
    setView("form");
  }

  function handleDeleteClick(tpl: DealTemplate) {
    setDeleting(tpl);
    setView("delete");
  }

  async function handleSave() {
    if (!accountId || !user) return;
    setSaving(true);
    const payload = parseFormToTemplate(form, accountId, user.id);

    if (editing) {
      const { error } = await supabase
        .from("deal_templates")
        .update(payload)
        .eq("id", editing.id);
      setSaving(false);
      if (error) {
        toast.error(t("error"));
        return;
      }
      toast.success(t("updateSuccess"));
    } else {
      const { error } = await supabase
        .from("deal_templates")
        .insert(payload);
      setSaving(false);
      if (error) {
        toast.error(t("error"));
        return;
      }
      toast.success(t("createSuccess"));
    }
    setView("list");
    fetchTemplates();
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setDeletingLoading(true);
    const { error } = await supabase
      .from("deal_templates")
      .delete()
      .eq("id", deleting.id);
    setDeletingLoading(false);
    if (error) {
      toast.error(t("error"));
      return;
    }
    toast.success(t("deleteSuccess"));
    setDeleting(null);
    setView("list");
    fetchTemplates();
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-popover border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {/* ── Delete confirmation ── */}
        {view === "delete" && deleting && (
          <div className="py-4">
            <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  {t("deleteConfirm")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {deleting.name}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleting(null);
                  setView("list");
                }}
                className="border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deletingLoading}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deletingLoading ? tc("loading") : t("deleteTemplate")}
              </Button>
            </div>
          </div>
        )}

        {/* ── Create / Edit form ── */}
        {view === "form" && (
          <>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">{t("name")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder={t("templateNamePlaceholder")}
                  className="border-border bg-muted text-foreground"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-muted-foreground">{t("dealTitle")}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="border-border bg-muted text-foreground"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-muted-foreground">
                  {t("description")}
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={3}
                  className="border-border bg-muted text-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">{t("value")}</Label>
                  <Input
                    type="number"
                    value={form.value}
                    onChange={(e) => setField("value", e.target.value)}
                    min={0}
                    className="border-border bg-muted text-foreground"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Moeda</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => setField("currency", e.target.value)}
                    className="border-border bg-muted text-foreground"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-muted-foreground">
                  {t("checklistItems")}
                </Label>
                <Textarea
                  value={form.checklistRaw}
                  onChange={(e) => setField("checklistRaw", e.target.value)}
                  rows={4}
                  placeholder={"Item 1\nItem 2\nItem 3"}
                  className="border-border bg-muted text-foreground resize-none"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-muted-foreground">{t("labels")}</Label>
                <Textarea
                  value={form.labelsRaw}
                  onChange={(e) => setField("labelsRaw", e.target.value)}
                  rows={3}
                  placeholder={"Urgente:#f43f5e\nPrioritário:#eab308"}
                  className="border-border bg-muted text-foreground resize-none"
                />
              </div>
            </div>

            <DialogFooter className="border-border bg-popover/50">
              <Button
                variant="outline"
                onClick={() => setView("list")}
                className="border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? tc("loading") : t("save")}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── List view ── */}
        {view === "list" && (
          <>
            <div className="py-2">
              <Button
                variant="outline"
                onClick={handleNew}
                className="w-full border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                <Plus className="mr-1 h-3 w-3" />
                {t("createTemplate")}
              </Button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {tc("loading")}
              </div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("noTemplates")}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rounded-lg border border-border bg-muted/50 p-4 flex flex-col gap-2"
                  >
                    <p className="font-medium text-foreground truncate">
                      {tpl.name}
                    </p>
                    {tpl.title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {tpl.title}
                      </p>
                    )}
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tpl.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {tpl.value != null && tpl.value > 0 && (
                        <span>
                          {tpl.currency ?? "BRL"}{" "}
                          {tpl.value.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      {tpl.checklist_items &&
                        tpl.checklist_items.length > 0 && (
                          <span>
                            ✓ {tpl.checklist_items.length}
                          </span>
                        )}
                      {tpl.label_names && tpl.label_names.length > 0 && (
                        <span>● {tpl.label_names.length}</span>
                      )}
                    </div>
                    <div className="mt-auto flex gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tpl)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        {tc("edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(tpl)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {tc("delete")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="border-border bg-popover/50">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                {t("close")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
