import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Repeat,
  CheckCircle,
  CalendarClock,
  FileText,
  Trophy,
  XCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PeriodMetrics } from "@/hooks/use-dashboard-metrics";
import { TONES } from "./shared";

type Indicator = {
  key: keyof PeriodMetrics;
  label: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  hint: string;
};

const INDICATORS: readonly Indicator[] = [
  { key: "leadsNovos", label: "Leads novos", icon: Sparkles, tone: "green", hint: "Leads criados no período." },
  { key: "followupsPendentes", label: "Follow-ups pendentes", icon: Repeat, tone: "cyan", hint: "Follow-ups agendados até o fim do período e ainda não realizados." },
  { key: "followupsRealizados", label: "Follow-ups realizados", icon: CheckCircle, tone: "sky", hint: "Follow-ups concluídos no período." },
  { key: "reunioes", label: "Reuniões", icon: CalendarClock, tone: "violet", hint: "Reuniões agendadas para o período." },
  { key: "propostasEnviadas", label: "Propostas enviadas", icon: FileText, tone: "orange", hint: "Propostas enviadas no período." },
  { key: "ganhos", label: "Ganhos", icon: Trophy, tone: "amber", hint: "Movimentações para Ganho no período." },
  { key: "perdidos", label: "Perdidos", icon: XCircle, tone: "red", hint: "Movimentações para Perdido/Sem interesse no período." },
];

function pct(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${(Math.round((count / total) * 1000) / 10).toFixed(1)}%`;
}

export function PeriodMetricsGrid({
  metrics,
  totalLeads,
  loading,
}: {
  metrics: PeriodMetrics;
  totalLeads: number;
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {INDICATORS.map((ind) => {
        const value = metrics[ind.key];
        const percent = pct(value, totalLeads);
        return (
          <PeriodTile
            key={ind.key}
            indicator={ind}
            value={value}
            percent={percent}
            loading={loading}
          />
        );
      })}
    </div>
  );
}

function PeriodTile({
  indicator,
  value,
  percent,
  loading,
}: {
  indicator: Indicator;
  value: number;
  percent: string;
  loading?: boolean;
}) {
  const Icon = indicator.icon;
  const tone = TONES[indicator.tone];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group rounded-2xl border bg-card/40 p-4 transition-colors card-premium-hover",
            tone.border,
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105",
                tone.chip,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="rounded-md bg-muted/30 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {percent}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold leading-none tabular-nums tracking-tight">
            {loading ? "—" : value}
          </p>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">{indicator.label}</p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
        <p className="font-medium">{indicator.label}</p>
        <p className="mt-1 text-muted-foreground">{indicator.hint}</p>
        <p className="mt-1 text-muted-foreground">{percent} da base total de leads</p>
      </TooltipContent>
    </Tooltip>
  );
}
