"use client";

import { useState } from "react";
import type { DealActivity } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MessageSquare, Bot, Send } from "lucide-react";

interface DealActivityProps {
  dealId: string;
  activities: DealActivity[];
  onRefresh: () => void;
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function DealActivityTimeline({ dealId, activities, onRefresh }: DealActivityProps) {
  const { user } = useAuth();
  const t = useTranslations("dealActivity");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function sendComment() {
    if (!comment.trim()) return;
    setSending(true);
    try {
      const db = createClient();
      const { error } = await db.from("deal_activities").insert({
        deal_id: dealId,
        user_id: user?.id,
        activity_type: "comment",
        content: comment.trim(),
      });
      if (error) throw error;
      setComment("");
      onRefresh();
    } catch {
      toast.error(t("commentError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto space-y-3 p-1">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs">{t("noActivity")}</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                {activity.activity_type === "system" ? (
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {(activity.user?.full_name ?? "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-foreground">
                    {activity.activity_type === "system" ? t("system") : (activity.user?.full_name ?? t("user"))}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(activity.created_at)}</span>
                </div>
                {activity.content && (
                  <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-line">{activity.content}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment input */}
      <div className="border-t border-border pt-3 mt-3">
        <div className="flex items-center gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
            placeholder={t("commentPlaceholder")}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs"
          />
          <button
            onClick={sendComment}
            disabled={!comment.trim() || sending}
            className="rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
