"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { CustomFieldDefinition, CustomFieldValue } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import { toast } from "sonner";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type FieldType = CustomFieldDefinition["field_type"];

interface NewFieldDraft {
  name: string;
  field_type: FieldType;
  required: boolean;
  options: string[];
}

const EMPTY_DRAFT: NewFieldDraft = {
  name: "",
  field_type: "text",
  required: false,
  options: [],
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  select: "Seleção",
  boolean: "Sim/Não",
};

// ──────────────────────────────────────────────────────────────
// CustomFieldsManager – pipeline settings
// ──────────────────────────────────────────────────────────────

interface CustomFieldsManagerProps {
  pipelineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomFieldsManager({
  pipelineId,
  open,
  onOpenChange,
}: CustomFieldsManagerProps) {
  const t = useTranslations("customFields");
  const tc = useTranslations("common");
  const { accountId } = useAuth();
  const supabase = createClient();

  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<NewFieldDraft>({ ...EMPTY_DRAFT });
  const [adding, setAdding] = useState(false);
  const [newOptionText, setNewOptionText] = useState("");

  // ── Fetch ──

  const fetchFields = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_field_definitions")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(t("error"));
      return;
    }
    setFields((data as CustomFieldDefinition[]) ?? []);
  }, [supabase, pipelineId, t]);

  useEffect(() => {
    if (!open) return;
    setDraft({ ...EMPTY_DRAFT });
    setAdding(false);
    fetchFields();
  }, [open, fetchFields]);

  // ── Add field ──

  async function handleAddField() {
    if (!accountId || !draft.name.trim()) return;
    setAdding(true);

    const payload = {
      account_id: accountId,
      pipeline_id: pipelineId,
      name: draft.name.trim(),
      field_type: draft.field_type,
      required: draft.required,
      options:
        draft.field_type === "select" && draft.options.length > 0
          ? draft.options
          : null,
      position: fields.length,
    };

    const { error } = await supabase
      .from("custom_field_definitions")
      .insert(payload);
    setAdding(false);

    if (error) {
      toast.error(t("error"));
      return;
    }
    toast.success(t("fieldCreated"));
    setDraft({ ...EMPTY_DRAFT });
    fetchFields();
  }

  // ── Delete field ──

  async function handleDeleteField(id: string) {
    const { error } = await supabase
      .from("custom_field_definitions")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(t("error"));
      return;
    }
    toast.success(t("fieldDeleted"));
    fetchFields();
  }

  // ── Reorder (position) ──

  async function handleMoveField(id: string, direction: -1 | 1) {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= fields.length) return;

    const reordered = [...fields];
    [reordered[idx], reordered[targetIdx]] = [
      reordered[targetIdx],
      reordered[idx],
    ];

    // Optimistic update
    setFields(
      reordered.map((f, i) => ({ ...f, position: i })),
    );

    const updates = reordered.map((f, i) =>
      supabase
        .from("custom_field_definitions")
        .update({ position: i })
        .eq("id", f.id),
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);
    if (hasError) {
      toast.error(t("error"));
      fetchFields();
    }
  }

  // ── Draft helpers ──

  function addOption() {
    const text = newOptionText.trim();
    if (!text || draft.options.includes(text)) return;
    setDraft((prev) => ({ ...prev, options: [...prev.options, text] }));
    setNewOptionText("");
  }

  function removeOption(index: number) {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-popover border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {tc("loading")}
          </div>
        ) : (
          <>
            {/* ── Existing fields ── */}
            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {field.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {FIELD_TYPE_LABELS[field.field_type]}
                      {field.required && " · Obrigatório"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={fields.indexOf(field) === 0}
                      onClick={() => handleMoveField(field.id, -1)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        fields.indexOf(field) === fields.length - 1
                      }
                      onClick={() => handleMoveField(field.id, 1)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <GripVertical className="h-3 w-3 -rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteField(field.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t("noFields")}
                </p>
              )}
            </div>

            {/* ── Add new field ── */}
            <div className="mt-4 rounded-lg border border-dashed border-border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t("addField")}
              </p>

              <div className="grid gap-2">
                <Input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t("fieldNamePlaceholder")}
                  className="border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={draft.field_type}
                  onValueChange={(val) => {
                    if (!val) return;
                    setDraft((prev) => ({
                      ...prev,
                      field_type: val as FieldType,
                      options: val === "select" ? prev.options : [],
                    }));
                  }}
                >
                  <SelectTrigger className="w-full border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(FIELD_TYPE_LABELS) as [
                        FieldType,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={draft.required}
                    onCheckedChange={(checked: boolean) =>
                      setDraft((prev) => ({ ...prev, required: checked }))
                    }
                  />
                  <Label className="text-xs text-muted-foreground">
                    {t("required")}
                  </Label>
                </div>
              </div>

              {/* ── Options for select type ── */}
              {draft.field_type === "select" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Input
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                      placeholder={t("addOption")}
                      className="flex-1 border-border bg-background text-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      disabled={!newOptionText.trim()}
                      className="border-border bg-transparent text-muted-foreground hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {draft.options.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {draft.options.map((opt, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
                        >
                          {opt}
                          <button
                            type="button"
                            onClick={() => removeOption(i)}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleAddField}
                disabled={adding || !draft.name.trim()}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {adding ? tc("loading") : t("addField")}
              </Button>
            </div>
          </>
        )}

        <DialogFooter className="border-border bg-popover/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border bg-transparent text-muted-foreground hover:bg-muted"
          >
            {tc("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────
// DealCustomFields – deal detail modal
// ──────────────────────────────────────────────────────────────

interface DealCustomFieldsProps {
  dealId: string;
  pipelineId: string;
  accountId: string;
}

export function DealCustomFields({
  dealId,
  pipelineId,
  accountId,
}: DealCustomFieldsProps) {
  const supabase = createClient();
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [values, setValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load definitions + values ──

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [defsRes, valsRes] = await Promise.all([
        supabase
          .from("custom_field_definitions")
          .select("*")
          .eq("pipeline_id", pipelineId)
          .order("position", { ascending: true }),
        supabase
          .from("custom_field_values")
          .select("*")
          .eq("deal_id", dealId),
      ]);

      if (cancelled) return;

      setDefinitions((defsRes.data as CustomFieldDefinition[]) ?? []);
      setValues((valsRes.data as CustomFieldValue[]) ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, pipelineId, dealId]);

  // ── Save value ──

  const saveValue = useCallback(
    async (fieldDefId: string, newValue: string | null) => {
      const existing = values.find(
        (v) => v.field_definition_id === fieldDefId,
      );

      if (existing) {
        const { error } = await supabase
          .from("custom_field_values")
          .update({ value: newValue })
          .eq("id", existing.id);
        if (error) {
          toast.error("Erro ao salvar");
          return;
        }
        setValues((prev) =>
          prev.map((v) =>
            v.id === existing.id ? { ...v, value: newValue } : v,
          ),
        );
      } else {
        const { data, error } = await supabase
          .from("custom_field_values")
          .insert({
            deal_id: dealId,
            field_definition_id: fieldDefId,
            value: newValue,
          })
          .select()
          .single();
        if (error) {
          toast.error("Erro ao salvar");
          return;
        }
        setValues((prev) => [...prev, data as CustomFieldValue]);
      }
    },
    [supabase, dealId, values],
  );

  function getValue(fieldDefId: string): string {
    const v = values.find((v) => v.field_definition_id === fieldDefId);
    return v?.value ?? "";
  }

  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (definitions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {definitions.map((def) => {
        const currentValue = getValue(def.id);

        if (def.field_type === "boolean") {
          return (
            <div
              key={def.id}
              className="flex items-center justify-between gap-3"
            >
              <Label className="text-xs text-muted-foreground shrink-0">
                {def.name}
                {def.required && (
                  <span className="ml-0.5 text-red-400">*</span>
                )}
              </Label>
              <Switch
                checked={currentValue === "true"}
                onCheckedChange={(checked: boolean) =>
                  saveValue(def.id, checked ? "true" : "false")
                }
              />
            </div>
          );
        }

        if (def.field_type === "select") {
          return (
            <div
              key={def.id}
              className="flex items-center justify-between gap-3"
            >
              <Label className="text-xs text-muted-foreground shrink-0">
                {def.name}
                {def.required && (
                  <span className="ml-0.5 text-red-400">*</span>
                )}
              </Label>
              <Select
                value={currentValue}
                onValueChange={(val) => { if (val) saveValue(def.id, val); }}
              >
                <SelectTrigger className="h-7 w-full max-w-[180px] border-border bg-background text-xs">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {(def.options ?? []).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        // text, number, date
        const inputType =
          def.field_type === "date"
            ? "date"
            : def.field_type === "number"
              ? "number"
              : "text";

        return (
          <div
            key={def.id}
            className="flex items-center justify-between gap-3"
          >
            <Label className="text-xs text-muted-foreground shrink-0">
              {def.name}
              {def.required && (
                <span className="ml-0.5 text-red-400">*</span>
              )}
            </Label>
            <Input
              type={inputType}
              value={currentValue}
              onBlur={(e) => {
                const newVal = e.target.value || null;
                if (newVal !== currentValue) {
                  saveValue(def.id, newVal);
                }
              }}
              placeholder={
                def.field_type === "date"
                  ? ""
                  : def.field_type === "number"
                    ? "0"
                    : "..."
              }
              className="h-7 w-full max-w-[180px] border-border bg-background text-xs"
            />
          </div>
        );
      })}
    </div>
  );
}
