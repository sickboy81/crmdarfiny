"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import type { Deal, PipelineStage, Pipeline } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface AdvancedReportsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stages: PipelineStage[];
}

interface ActivityRow {
  id: string;
  deal_id: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
}

interface DayCount {
  date: string;
  label: string;
  count: number;
}

interface Performer {
  userId: string;
  name: string;
  count: number;
}

export function AdvancedReports({
  open,
  onOpenChange,
  pipelineId,
  stages,
}: AdvancedReportsProps) {
  const t = useTranslations("advancedReports");
  const { defaultCurrency } = useAuth();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !pipelineId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data: dealsData } = await supabase
        .from("deals")
        .select("*")
        .eq("pipeline_id", pipelineId);

      if (cancelled) return;
      const allDeals = (dealsData ?? []) as Deal[];
      setDeals(allDeals);

      const dealIds = allDeals.map((d) => d.id);

      if (dealIds.length > 0) {
        const [activitiesRes, profilesRes] = await Promise.all([
          supabase
            .from("deal_activities")
            .select("id, deal_id, created_at")
            .in("deal_id", dealIds),
          supabase
            .from("profiles")
            .select("id, full_name"),
        ]);

        if (cancelled) return;
        setActivities((activitiesRes.data ?? []) as ActivityRow[]);
        setProfiles((profilesRes.data ?? []) as ProfileRow[]);
      } else {
        setActivities([]);
        setProfiles([]);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open, pipelineId]);

  const sortedStages = stages
    .slice()
    .sort((a, b) => a.position - b.position);

  // --- Conversion Funnel ---
  const stageCounts = sortedStages.map((stage) => ({
    stage,
    count: deals.filter((d) => d.stage_id === stage.id).length,
  }));
  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);

  // --- Value by Stage ---
  const stageValues = sortedStages.map((stage) => {
    const stageDeals = deals.filter(
      (d) => d.stage_id === stage.id && d.status !== "lost",
    );
    const total = stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
    return { stage, total };
  });

  // --- Win/Lost ---
  const wonCount = deals.filter((d) => d.status === "won").length;
  const lostCount = deals.filter((d) => d.status === "lost").length;
  const totalDecided = wonCount + lostCount;
  const winRate = totalDecided > 0 ? Math.round((wonCount / totalDecided) * 100) : 0;
  const lostRate = totalDecided > 0 ? 100 - winRate : 0;

  // --- Activity Timeline (last 7 days) ---
  const now = new Date();
  const last7Days: DayCount[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
    const count = activities.filter((a) => a.created_at.slice(0, 10) === dateStr).length;
    last7Days.push({ date: dateStr, label: dayLabel, count });
  }
  const maxActivityCount = Math.max(...last7Days.map((d) => d.count), 1);

  // --- Top Performers ---
  const assignedDealCounts = new Map<string, number>();
  for (const deal of deals) {
    if (deal.assigned_to) {
      assignedDealCounts.set(
        deal.assigned_to,
        (assignedDealCounts.get(deal.assigned_to) ?? 0) + 1,
      );
    }
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));
  const topPerformers: Performer[] = Array.from(assignedDealCounts.entries())
    .map(([userId, count]) => ({
      userId,
      name: profileMap.get(userId) ?? userId.slice(0, 8),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- Average Deal Value (open deals) ---
  const openDeals = deals.filter((d) => d.status === "open" || !d.status);
  const avgValue =
    openDeals.length > 0
      ? openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0) /
        openDeals.length
      : 0;

  // --- Deals Created This Week ---
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const dealsThisWeek = deals.filter(
    (d) => new Date(d.created_at) >= weekAgo,
  ).length;

  // --- Conversion Rate (first → last stage) ---
  const firstStageId = sortedStages[0]?.id;
  const lastStageId = sortedStages[sortedStages.length - 1]?.id;
  const dealsFromFirst = deals.filter((d) => d.stage_id === firstStageId).length;
  const dealsAtLast = deals.filter((d) => d.stage_id === lastStageId).length;
  const conversionRate =
    dealsFromFirst > 0
      ? Math.round((dealsAtLast / dealsFromFirst) * 100)
      : 0;

  const hasData = deals.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !hasData ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("noData")}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t("winRate")}
                </div>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {winRate}%
                </p>
                <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    {wonCount} {t("wonDeals")}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                    {lostCount} {t("lostDeals")}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {t("avgValue")}
                </div>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatCurrency(avgValue, defaultCurrency)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {openDeals.length} {t("totalDeals")}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t("newThisWeek")}
                </div>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {dealsThisWeek}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {conversionRate}% {t("conversionRate")}
                </p>
              </div>
            </div>

            {/* Conversion Funnel */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t("conversionFunnel")}
              </h3>
              <div className="space-y-2">
                {stageCounts.map(({ stage, count }) => (
                  <div key={stage.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
                      {stage.name}
                    </span>
                    <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-muted/50">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg transition-all duration-300"
                        style={{
                          width: `${(count / maxCount) * 100}%`,
                          backgroundColor: stage.color,
                          minWidth: count > 0 ? "2rem" : 0,
                        }}
                      />
                      <span className="relative z-10 flex h-full items-center pl-2 text-xs font-medium text-foreground">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Value by Stage */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t("valueByStage")}
              </h3>
              <div className="space-y-1.5">
                {stageValues
                  .filter((sv) => sv.total > 0)
                  .map(({ stage, total }) => (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {stage.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(total, defaultCurrency)}
                      </span>
                    </div>
                  ))}
              </div>
            </section>

            {/* Win/Lost Visualization */}
            {totalDecided > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {t("winRate")}
                </h3>
                <div className="flex h-6 overflow-hidden rounded-full bg-muted">
                  {winRate > 0 && (
                    <div
                      className="flex items-center justify-center bg-emerald-500 text-[10px] font-medium text-white transition-all duration-300"
                      style={{ width: `${winRate}%` }}
                    >
                      {winRate >= 15 && `${winRate}%`}
                    </div>
                  )}
                  {lostRate > 0 && (
                    <div
                      className="flex items-center justify-center bg-red-500 text-[10px] font-medium text-white transition-all duration-300"
                      style={{ width: `${lostRate}%` }}
                    >
                      {lostRate >= 15 && `${lostRate}%`}
                    </div>
                  )}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {t("wonDeals")}: {wonCount}
                  </span>
                  <span>
                    {t("lostDeals")}: {lostCount}
                  </span>
                </div>
              </section>
            )}

            {/* Activity Timeline */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t("activityTimeline")}
              </h3>
              <div className="flex items-end gap-1.5 h-20">
                {last7Days.map((day) => (
                  <div
                    key={day.date}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {day.count}
                    </span>
                    <div
                      className="w-full rounded-md bg-primary/20 transition-all duration-300"
                      style={{
                        height: `${(day.count / maxActivityCount) * 100}%`,
                        minHeight: day.count > 0 ? "0.25rem" : "0.125rem",
                        backgroundColor:
                          day.count > 0
                            ? "hsl(var(--primary) / 0.3)"
                            : undefined,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Top Performers */}
            {topPerformers.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {t("topPerformers")}
                </h3>
                <div className="space-y-1.5">
                  {topPerformers.map((p, i) => (
                    <div
                      key={p.userId}
                      className="flex items-center justify-between rounded-md px-3 py-2 bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {i + 1}.
                        </span>
                        <span className="text-sm text-foreground">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.count} {t("deals")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
