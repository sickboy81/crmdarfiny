"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bell, CheckCheck, MessageSquare, Users, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  deal_id?: string;
  from_user_id?: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

function typeIcon(type: string) {
  switch (type) {
    case "comment":
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case "assignment":
      return <Users className="h-4 w-4 text-purple-500" />;
    case "mention":
      return <ArrowRight className="h-4 w-4 text-amber-500" />;
    case "status_change":
      return <CheckCheck className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

export function NotificationBell() {
  const t = useTranslations("notificationBell");
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, deal_id, from_user_id, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[NotificationBell] fetch error:", error.message);
      return;
    }

    setNotifications(data ?? []);
  }, [user?.id]);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  async function markAsRead(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao marcar como lida");
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllAsRead() {
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id ?? "")
      .eq("is_read", false);

    if (error) {
      toast.error("Erro ao marcar todas como lidas");
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir notificação");
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-border bg-popover shadow-xl z-50">
          {unreadCount > 0 && (
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-sm font-medium">{t("markAllRead")}</span>
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-sm text-primary hover:underline"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("noNotifications")}
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={`flex items-start gap-3 p-3 hover:bg-muted cursor-pointer border-b border-border last:border-0 ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {typeIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {notification.title}
                      </span>
                      {!notification.is_read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {notification.body && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => deleteNotification(notification.id, e)}
                    className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
