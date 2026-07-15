"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Count of unread notifications for the current user. Used by the
 * sidebar to surface a badge on the Notifications nav entry.
 *
 * RLS on `notifications` already scopes every read to `auth.uid() =
 * user_id`, so no explicit filter is needed here.
 */
export function useUnreadNotifications(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { count: unreadCount, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      if (cancelled || error) return;
      setCount(unreadCount ?? 0);
    })();

    const channel = supabase
      .channel("notifications-unread-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { is_read?: boolean };
            if (!row.is_read) setCount((n) => n + 1);
          } else if (payload.eventType === "UPDATE") {
            const newRow = payload.new as { is_read?: boolean };
            if (newRow.is_read) setCount((n) => Math.max(0, n - 1));
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { is_read?: boolean };
            if (!oldRow.is_read) setCount((n) => Math.max(0, n - 1));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
