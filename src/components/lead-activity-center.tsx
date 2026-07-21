import { useMemo, useState, type ComponentType } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Sparkles, StickyNote, CalendarClock,
  FilePlus2, ClipboardCheck, PhoneCall, Clock, User, Plus, FileText,
  MessageCircle, Upload, Pencil, Users, Thermometer, ArrowRightLeft,
  Award, Zap, TrendingUp, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { daysSince } from "@/lib/notifications";
import type { Lead, LeadEvent } from "@/lib/leads-api";

/* ================================================================== */
/* PULSE                                                                */
/* ================================================================== */

type PulseLevel = "healthy" | "attention" | "critical";

type PulseState = {
  level: PulseLevel;
  label: string;
  headline: string;
  reasons: string[];
};

function computePulse(lead: Lead): PulseState {
  const dias = daysSince(lead.last_interaction_at);
  const followupAt = lead.proximo_followup_at ? new Date(lead.proximo_followup_at) : null;
  const followupOverdue = followupAt ? followupAt.getTime() < Date.now() : false;
  const followupSoon =
    followupAt && !followupOverdue
      ? followupAt.getTime() - Date.now() < 1000 * 60 * 60 * 24
      : false;
  const hasProxima = Boolean(lead.proxima_acao?.trim());
  const isProposta = lead.stage === "proposta";
  const isFollowup = lead.stage === "follow_up";
  const isAbandonado = lead.stage === "sem_interesse";

  const reasons: string[] = [];

  // Critical
  if (isAbandonado) reasons.push("Lead marcado como sem interesse.");
  if (followupOverdue) reasons.push("Follow-up vencido — atualize a data ou faça contato.");
  if (dias >= 7) reasons.push(`Lead parado há ${dias} dias sem interação.`);
  if (!hasProxima && (isProposta || isFollowup)) reasons.push("Sem próxima ação definida.");
  if (isProposta && dias >= 5) reasons.push("Proposta enviada há dias sem retorno.");

  if (reasons.length > 0) {
    return {
      level: "critical",
      label: "Crítico",
      headline: "Este lead precisa de ação imediata.",
      reasons,
    };
  }

  // Attention
  const attention: string[] = [];
  if (dias >= 3) attention.push(`Sem interação há ${dias} dias.`);
  if (followupSoon && followupAt) attention.push(`Follow-up próximo (${formatDateTime(followupAt.toISOString())}).`);
  if (isProposta) attention.push("Proposta em aberto aguardando retorno.");
  if (!hasProxima) attention.push("Nenhuma próxima ação definida.");

  if (attention.length > 0) {
    return {
      level: "attention",
      label: "Atenção",
      headline: "Existem pendências comerciais neste lead.",
      reasons: attention,
    };
  }

  // Healthy
  const good: string[] = [];
  if (dias <= 2) good.push("Interações recentes.");
  if (followupAt && !followupOverdue) good.push("Follow-up em dia.");
  if (hasProxima) good.push(`Próxima ação: ${lead.proxima_acao}.`);
  if (good.length === 0) good.push("Lead ativo sem pendências detectadas.");

  return {
    level: "healthy",
    label: "Saudável",
    headline: "Lead sob controle.",
    reasons: good,
  };
}

const PULSE_STYLES: Record<PulseLevel, { bg: string; ring: string; text: string; dot: string; icon: ComponentType<{ className?: string }> }> = {
  healthy: {
    bg: "from-emerald-500/10 to-emerald-500/0",
    ring: "border-emerald-500/40",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    icon: CheckCircle2,
  },
  attention: {
    bg: "from-amber-500/10 to-amber-500/0",
    ring: "border-amber-500/40",
    text: "text-amber-300",
    dot: "bg-amber-400",
    icon: AlertTriangle,
  },
  critical: {
    bg: "from-red-500/10 to-red-500/0",
    ring: "border-red-500/40",
    text: "text-red-300",
    dot: "bg-red-400",
    icon: AlertTriangle,
  },
};

function PulseBanner({ lead }: { lead: Lead }) {
  const pulse = useMemo(() => computePulse(lead), [lead]);
  const st = PULSE_STYLES[pulse.level];
  const Icon = st.icon;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5", st.ring, st.bg)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("grid h-11 w-11 place-items-center rounded-xl border bg-background/60", st.ring)}>
            <Icon className={cn("h-5 w-5", st.text)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", st.dot)} />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Pulse do Lead</p>
            </div>
            <p className={cn("mt-0.5 text-lg font-semibold", st.text)}>{pulse.label}</p>
            <p className="text-sm text-foreground/80">{pulse.headline}</p>
          </div>
        </div>
        <ul className="grid gap-1 text-sm text-foreground/80 md:max-w-md">
          {pulse.reasons.slice(0, 4).map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", st.dot)} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ================================================================== */
/* QUICK ACTIONS                                                        */
/* ================================================================== */

type QuickActionsProps = {
  onNewNote: () => void;
  onNewFollowup: () => void;
  onNewProposal: () => void;
  onNewAudit: () => void;
  onRegisterCall: () => void;
};

function QuickActions(p: QuickActionsProps) {
  const items: Array<{ icon: ComponentType<{ className?: string }>; label: string; onClick: () => void; tone: string }> = [
    { icon: StickyNote, label: "Nova nota", onClick: p.onNewNote, tone: "text-accent" },
    { icon: CalendarClock, label: "Novo follow-up", onClick: p.onNewFollowup, tone: "text-sky-300" },
    { icon: FilePlus2, label: "Nova proposta", onClick: p.onNewProposal, tone: "text-emerald-300" },
    { icon: ClipboardCheck, label: "Nova auditoria", onClick: p.onNewAudit, tone: "text-violet-300" },
    { icon: PhoneCall, label: "Registrar ligação", onClick: p.onRegisterCall, tone: "text-amber-300" },
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ações rápidas</p>
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              onClick={it.onClick}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-background/40 p-3 text-left transition hover:border-border hover:bg-background/70"
            >
              <Icon className={cn("h-4 w-4", it.tone)} />
              <span className="text-xs font-medium text-foreground/90 group-hover:text-foreground">{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* INSIGHTS                                                             */
/* ================================================================== */

type Insight = {
  id: string;
  icon: ComponentType<{ className?: string }>;
  tone: "info" | "warn" | "success" | "danger";
  title: string;
  description: string;
  hint?: string;
};

const INSIGHT_TONE: Record<Insight["tone"], { border: string; text: string; bg: string; badge: string }> = {
  info:    { border: "border-sky-500/30",    text: "text-sky-300",     bg: "bg-sky-500/5",     badge: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  warn:    { border: "border-amber-500/30",  text: "text-amber-300",   bg: "bg-amber-500/5",   badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  success: { border: "border-emerald-500/30",text: "text-emerald-300", bg: "bg-emerald-500/5", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  danger:  { border: "border-red-500/30",    text: "text-red-300",     bg: "bg-red-500/5",     badge: "bg-red-500/15 text-red-300 border-red-500/30" },
};

function computeInsights(lead: Lead): Insight[] {
  const insights: Insight[] = [];
  const dias = daysSince(lead.last_interaction_at);
  const followupAt = lead.proximo_followup_at ? new Date(lead.proximo_followup_at) : null;
  const followupOverdue = followupAt ? followupAt.getTime() < Date.now() : false;

  if (dias >= 5) {
    insights.push({
      id: "sem-resposta",
      icon: Clock,
      tone: "warn",
      title: `Cliente sem resposta há ${dias} dias`,
      description: "Considere reengajar com uma mensagem personalizada ou movimentar para follow-up.",
      hint: "Sugerido pela IA em breve",
    });
  }

  if (followupOverdue && followupAt) {
    insights.push({
      id: "followup-atrasado",
      icon: AlertTriangle,
      tone: "danger",
      title: "Follow-up atrasado",
      description: `Estava previsto para ${formatDateTime(followupAt.toISOString())}. Atualize a agenda ou entre em contato agora.`,
    });
  }

  if (lead.stage === "proposta" && dias >= 4) {
    insights.push({
      id: "proposta-esquecida",
      icon: FileText,
      tone: "warn",
      title: "Proposta aguardando retorno",
      description: "A proposta foi enviada e o cliente ainda não respondeu. Que tal um checkpoint amigável?",
    });
  }

  if (!lead.tem_perfil_google) {
    insights.push({
      id: "sem-gbp",
      icon: Award,
      tone: "info",
      title: "Cliente ainda não tem Perfil Google",
      description: "Oportunidade de venda de SEO Local — abordar criação e otimização do Google Perfil da Empresa.",
    });
  } else if (lead.tem_perfil_google) {
    insights.push({
      id: "gbp-avaliacoes",
      icon: Sparkles,
      tone: "info",
      title: "Perfil Google pode precisar de mais avaliações",
      description: "Sugerir campanha de captação de reviews como upsell no plano de SEO Local.",
    });
  }

  if (!lead.tem_site) {
    insights.push({
      id: "sem-site",
      icon: TrendingUp,
      tone: "success",
      title: "Oportunidade de vender site / landing page",
      description: "O cliente ainda não possui site. Ótima entrada para pacote combinado com SEO Local.",
    });
  }

  if (lead.temperatura === "frio") {
    insights.push({
      id: "temperatura-baixa",
      icon: TrendingDown,
      tone: "warn",
      title: "Temperatura do lead está baixa",
      description: "Considere aquecer com conteúdo, cases ou uma auditoria gratuita antes de nova proposta.",
    });
  }

  if (lead.stage === "ganho") {
    insights.push({
      id: "upgrade",
      icon: Zap,
      tone: "success",
      title: "Cliente com potencial para upgrade",
      description: "Cliente já convertido — avaliar upsell de tráfego pago, site ou plano superior de SEO Local.",
    });
  }

  return insights;
}

function InsightsPanel({ lead }: { lead: Lead }) {
  const insights = useMemo(() => computeInsights(lead), [lead]);

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent" /> Insights
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Recomendações do sistema — em breve alimentadas pela IA do Pixel CRM.
          </p>
        </div>
        <Badge variant="outline" className="border-accent/40 bg-accent/10 text-[10px] text-accent">
          IA em breve
        </Badge>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/30 p-8 text-center">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma recomendação no momento</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              À medida que o lead evoluir, o Pixel CRM irá sugerir próximas ações, oportunidades comerciais e alertas automáticos aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((ins) => {
              const st = INSIGHT_TONE[ins.tone];
              const Icon = ins.icon;
              return (
                <div key={ins.id} className={cn("rounded-xl border p-4 transition", st.border, st.bg)}>
                  <div className="flex items-start gap-3">
                    <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border bg-background/60", st.border)}>
                      <Icon className={cn("h-4 w-4", st.text)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-semibold", st.text)}>{ins.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/80">{ins.description}</p>
                      {ins.hint && (
                        <Badge variant="outline" className={cn("mt-2 text-[10px]", st.badge)}>
                          {ins.hint}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ================================================================== */
/* HISTORY (TIMELINE)                                                   */
/* ================================================================== */

type EventKind =
  | "criado" | "atualizado" | "movimentacao" | "nota" | "arquivo"
  | "proposta" | "auditoria" | "contrato" | "cliente" | "followup"
  | "mensagem" | "responsavel" | "temperatura" | "automatico";

const EVENT_META: Record<string, { label: string; icon: ComponentType<{ className?: string }>; tone: string; ring: string }> = {
  criado:       { label: "Lead criado",         icon: Plus,             tone: "text-sky-300",     ring: "ring-sky-500/30" },
  atualizado:   { label: "Lead editado",        icon: Pencil,           tone: "text-muted-foreground", ring: "ring-border" },
  movimentacao: { label: "Mudança de etapa",    icon: ArrowRightLeft,   tone: "text-violet-300",  ring: "ring-violet-500/30" },
  responsavel:  { label: "Novo responsável",    icon: Users,            tone: "text-sky-300",     ring: "ring-sky-500/30" },
  temperatura:  { label: "Temperatura",         icon: Thermometer,      tone: "text-amber-300",   ring: "ring-amber-500/30" },
  nota:         { label: "Nota",                icon: StickyNote,       tone: "text-accent",      ring: "ring-accent/30" },
  arquivo:      { label: "Arquivo enviado",     icon: Upload,           tone: "text-amber-300",   ring: "ring-amber-500/30" },
  auditoria:    { label: "Auditoria",           icon: ClipboardCheck,   tone: "text-violet-300",  ring: "ring-violet-500/30" },
  proposta:     { label: "Proposta",            icon: FileText,         tone: "text-emerald-300", ring: "ring-emerald-500/30" },
  contrato:     { label: "Contrato",            icon: FilePlus2,        tone: "text-emerald-300", ring: "ring-emerald-500/30" },
  cliente:      { label: "Cliente convertido",  icon: Award,            tone: "text-emerald-300", ring: "ring-emerald-500/30" },
  followup:     { label: "Follow-up realizado", icon: CalendarClock,    tone: "text-sky-300",     ring: "ring-sky-500/30" },
  mensagem:     { label: "Mensagem",            icon: MessageCircle,    tone: "text-emerald-300", ring: "ring-emerald-500/30" },
  automatico:   { label: "Automação",           icon: Zap,              tone: "text-cyan-300",    ring: "ring-cyan-500/30" },
};

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "nota", label: "Notas" },
  { value: "movimentacao", label: "Etapa" },
  { value: "proposta", label: "Propostas" },
  { value: "auditoria", label: "Auditorias" },
  { value: "arquivo", label: "Arquivos" },
  { value: "mensagem", label: "Mensagens" },
  { value: "automatico", label: "Automações" },
];

function bucketize(date: Date): "today" | "yesterday" | "week" | "month" | "older" {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = date.getTime();
  if (t >= startToday) return "today";
  if (t >= startToday - 86400_000) return "yesterday";
  if (t >= startToday - 7 * 86400_000) return "week";
  if (t >= startToday - 30 * 86400_000) return "month";
  return "older";
}

const BUCKET_LABEL: Record<string, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  week: "Esta semana",
  month: "Este mês",
  older: "Mais antigos",
};

const BUCKET_ORDER = ["today", "yesterday", "week", "month", "older"] as const;

function EventItem({ ev }: { ev: LeadEvent }) {
  const meta = EVENT_META[ev.tipo] ?? EVENT_META.atualizado;
  const Icon = meta.icon;
  const d = new Date(ev.created_at);
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <li className="relative flex gap-3">
      <div className={cn("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/60 bg-background ring-2", meta.ring)}>
        <Icon className={cn("h-3.5 w-3.5", meta.tone)} />
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-background/40 p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className={cn("text-xs font-semibold", meta.tone)}>{meta.label}</p>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">{date} · {time}</span>
          {ev.autor_nome && (
            <>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="h-3 w-3" /> {ev.autor_nome}
              </span>
            </>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{ev.descricao}</p>
      </div>
    </li>
  );
}

function HistoryPanel({ events }: { events: LeadEvent[] }) {
  const [filter, setFilter] = useState("todos");
  const filtered = filter === "todos" ? events : events.filter((e) => e.tipo === filter);

  const grouped = useMemo(() => {
    const map = new Map<string, LeadEvent[]>();
    for (const ev of filtered) {
      const key = bucketize(new Date(ev.created_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [filtered]);

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" /> Histórico
          </CardTitle>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Tudo o que aconteceu com este lead, em ordem cronológica.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] transition",
                  active
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/30 p-10 text-center">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum evento no período</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Notas, mudanças de etapa, propostas, auditorias, arquivos e mensagens aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {BUCKET_ORDER.map((bucket) => {
              const items = grouped.get(bucket);
              if (!items || items.length === 0) return null;
              return (
                <div key={bucket}>
                  <div className="mb-3 flex items-center gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {BUCKET_LABEL[bucket]}
                    </p>
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-[11px] text-muted-foreground">{items.length}</span>
                  </div>
                  <ol className="relative space-y-3 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                    {items.map((ev) => <EventItem key={ev.id} ev={ev} />)}
                  </ol>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ================================================================== */
/* MAIN COMPONENT                                                       */
/* ================================================================== */

export type LeadActivityCenterProps = {
  lead: Lead;
  events: LeadEvent[];
  onNewNote: () => void;
  onNewFollowup: () => void;
  onNewProposal: () => void;
  onNewAudit: () => void;
  onRegisterCall: () => void;
};

export function LeadActivityCenter(props: LeadActivityCenterProps) {
  return (
    <div className="space-y-5">
      <PulseBanner lead={props.lead} />
      <QuickActions
        onNewNote={props.onNewNote}
        onNewFollowup={props.onNewFollowup}
        onNewProposal={props.onNewProposal}
        onNewAudit={props.onNewAudit}
        onRegisterCall={props.onRegisterCall}
      />
      <InsightsPanel lead={props.lead} />
      <HistoryPanel events={props.events} />
    </div>
  );
}
