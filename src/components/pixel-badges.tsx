/**
 * Pixel Design System — badges e indicadores reutilizáveis.
 * Consuma sempre estes componentes em vez de replicar estilos ad-hoc.
 */
import type { ComponentType } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/leads-api";
import type { LeadOrigin, LeadStage, Temperatura } from "@/lib/crm";
import { ORIGIN_LABELS, STAGE_META, TEMPERATURA_META } from "@/lib/crm";
import { daysSince } from "@/lib/notifications";

/* ------------------------------------------------------------------ */
/* Status (etapa do funil)                                             */
/* ------------------------------------------------------------------ */
export function StatusBadge({ stage, className }: { stage: LeadStage; className?: string }) {
  const meta = STAGE_META[stage];
  return (
    <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 text-[10px] font-medium", meta.badge, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Temperatura                                                         */
/* ------------------------------------------------------------------ */
export function TemperatureBadge({ value, className }: { value: Temperatura | null | undefined; className?: string }) {
  if (!value) return null;
  const meta = TEMPERATURA_META[value];
  return (
    <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 text-[10px] font-medium", meta.badge, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Origem                                                              */
/* ------------------------------------------------------------------ */
export function OriginBadge({ value, className }: { value: LeadOrigin; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-0 bg-secondary/60 px-2 py-0.5 text-[10px] font-normal text-muted-foreground", className)}
    >
      {ORIGIN_LABELS[value]}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Pulse (saúde do lead)                                               */
/* ------------------------------------------------------------------ */
export type PulseLevel = "healthy" | "attention" | "critical";

const PULSE_STYLES: Record<
  PulseLevel,
  { dot: string; text: string; ring: string; label: string; icon: ComponentType<{ className?: string }> }
> = {
  healthy:   { dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-500/30", label: "Saudável", icon: CheckCircle2 },
  attention: { dot: "bg-amber-400",   text: "text-amber-300",   ring: "ring-amber-500/30",   label: "Atenção",  icon: AlertTriangle },
  critical:  { dot: "bg-red-400",     text: "text-red-300",     ring: "ring-red-500/30",     label: "Crítico",  icon: AlertTriangle },
};

/** Lógica simples e local — espelha o cálculo do Workspace, mas leve para o Kanban. */
export function computeLeadPulse(lead: Lead): PulseLevel {
  const dias = daysSince(lead.last_interaction_at);
  const followupAt = lead.proximo_followup_at ? new Date(lead.proximo_followup_at) : null;
  const followupOverdue = followupAt ? followupAt.getTime() < Date.now() : false;
  const semProxima = !lead.proxima_acao?.trim();

  if (lead.stage === "sem_interesse") return "critical";
  if (followupOverdue) return "critical";
  if (dias >= 7) return "critical";
  if (lead.stage === "proposta" && dias >= 5) return "critical";

  if (dias >= 3) return "attention";
  if (lead.stage === "proposta") return "attention";
  if (semProxima && (lead.stage === "follow_up" || lead.stage === "conversando")) return "attention";

  return "healthy";
}

export function PulseIndicator({
  level,
  size = "sm",
  showLabel = false,
  className,
}: {
  level: PulseLevel;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const st = PULSE_STYLES[level];
  const dotSize = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  return (
    <span
      title={`Pulse: ${st.label}`}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <span className={cn("rounded-full ring-2", dotSize, st.dot, st.ring)} />
      {showLabel && <span className={cn("text-[11px] font-medium", st.text)}>{st.label}</span>}
    </span>
  );
}
