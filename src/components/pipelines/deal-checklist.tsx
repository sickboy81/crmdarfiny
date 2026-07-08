"use client";

import { useState } from "react";
import type { DealChecklist, DealChecklistItem } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface DealChecklistProps {
  dealId: string;
  checklists: DealChecklist[];
  onChecklistsChange: () => void;
}

function ChecklistSection({
  checklist,
  onChange,
}: {
  checklist: DealChecklist;
  onChange: () => void;
}) {
  const items = checklist.items ?? [];
  const total = items.length;
  const checked = items.filter((i) => i.is_checked).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  const [newItem, setNewItem] = useState("");

  async function toggleItem(item: DealChecklistItem) {
    try {
      const db = createClient();
      const { error } = await db
        .from("deal_checklist_items")
        .update({ is_checked: !item.is_checked })
        .eq("id", item.id);
      if (error) throw error;
      onChange();
    } catch {
      toast.error("Erro ao atualizar item");
    }
  }

  async function addItem() {
    if (!newItem.trim()) return;
    try {
      const db = createClient();
      const { error } = await db.from("deal_checklist_items").insert({
        checklist_id: checklist.id,
        text: newItem.trim(),
        position: total,
      });
      if (error) throw error;
      setNewItem("");
      onChange();
    } catch {
      toast.error("Erro ao adicionar item");
    }
  }

  async function deleteItem(itemId: string) {
    try {
      const db = createClient();
      const { error } = await db.from("deal_checklist_items").delete().eq("id", itemId);
      if (error) throw error;
      onChange();
    } catch {
      toast.error("Erro ao remover item");
    }
  }

  async function deleteChecklist() {
    try {
      const db = createClient();
      const { error } = await db.from("deal_checklists").delete().eq("id", checklist.id);
      if (error) throw error;
      onChange();
    } catch {
      toast.error("Erro ao remover checklist");
    }
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground">{checklist.name}</h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">{checked}/{total}</span>
          <button onClick={deleteChecklist} className="text-muted-foreground hover:text-red-500">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#22c55e" : "#3b82f6" }}
          />
        </div>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.is_checked}
              onChange={() => toggleItem(item)}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            <span className={`flex-1 text-xs ${item.is_checked ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {item.text}
            </span>
            <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
          placeholder="Novo item..."
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function DealChecklists({ dealId, checklists, onChecklistsChange }: DealChecklistProps) {
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const db = createClient();
      const { error } = await db.from("deal_checklists").insert({
        deal_id: dealId,
        name: newName.trim(),
        position: checklists.length,
      });
      if (error) throw error;
      setNewName("");
      setShowNew(false);
      onChecklistsChange();
      toast.success("Checklist criado");
    } catch {
      toast.error("Erro ao criar checklist");
    }
  }

  return (
    <div className="space-y-3">
      {checklists.map((cl) => (
        <ChecklistSection key={cl.id} checklist={cl} onChange={onChecklistsChange} />
      ))}

      {showNew ? (
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            placeholder="Nome do checklist..."
            className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs"
            autoFocus
          />
          <button onClick={handleCreate} className="rounded bg-primary px-2 py-1.5 text-[11px] text-primary-foreground hover:bg-primary/90">Criar</button>
          <button onClick={() => { setShowNew(false); setNewName(""); }} className="rounded px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted">Cancelar</button>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:bg-muted/50"
        >
          <Plus className="h-3 w-3" />
          Adicionar checklist
        </button>
      )}
    </div>
  );
}
