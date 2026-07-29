import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, CalendarDays } from "lucide-react";
import { useLeads, usePurgeExpired } from "@/hooks/use-leads";
import { useTasks } from "@/hooks/use-tasks";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { Block } from "@/components/dashboard/shared";
import { PeriodMetricsGrid } from "@/components/dashboard/period-block";
import { AttentionBlock } from "@/components/dashboard/attention-block";
import { formatOrgDate } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Comercial · Pixel CRM" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();
  const { data: metrics, isLoading } = useDashboardMetrics();
  const purge = usePurgeExpired();

  useEffect(() => {
    purge.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-16">
      <header className="space-y-1.5">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard Comercial
        </h1>
        <p className="text-sm capitalize text-muted-foreground">{formatOrgDate()}</p>
      </header>

      <Block title="Visão do dia" icon={BarChart3}>
        <PeriodMetricsGrid
          metrics={metrics.dia}
          totalLeads={metrics.totalLeads}
          loading={isLoading}
        />
      </Block>

      <Block title="Visão mensal" icon={CalendarDays}>
        <PeriodMetricsGrid
          metrics={metrics.mes}
          totalLeads={metrics.totalLeads}
          loading={isLoading}
        />
      </Block>

      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">
              Prioridades do dia
            </h2>
            <p className="text-xs text-muted-foreground">
              Sua próxima ação, em ordem de urgência
            </p>
          </div>
        </div>
        <AttentionBlock leads={leads} tasks={tasks} />
      </section>
    </div>
  );
}
