import type { ComponentType } from "react";
import {
  BadgeCheck,
  Tag,
  Tags,
  FileText,
  Globe,
  Phone,
  MapPin,
  Clock,
  Image as ImageIcon,
  Star,
  MessageSquare,
  ShoppingBag,
  Wrench,
  HelpCircle,
  Megaphone,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ==================================================================== */
/* SEO Score — tiers e estilos                                          */
/* ==================================================================== */

export type SeoScoreTier = "excellent" | "great" | "good" | "fair" | "critical";

export interface SeoScoreTierMeta {
  key: SeoScoreTier;
  label: string;
  /** Nota mínima (inclusiva) do tier. */
  min: number;
  /** Cor semântica (usada em texto, dot, ring, gradient stops). */
  color: string;
  ring: string;
  chip: string;
  gradient: string;
}

const SEO_SCORE_TIERS: readonly SeoScoreTierMeta[] = [
  {
    key: "excellent",
    label: "Excelente",
    min: 90,
    color: "text-emerald-300",
    ring: "ring-emerald-500/40",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    gradient: "from-emerald-500/25 to-emerald-500/5",
  },
  {
    key: "great",
    label: "Muito Bom",
    min: 75,
    color: "text-sky-300",
    ring: "ring-sky-500/40",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    gradient: "from-sky-500/25 to-sky-500/5",
  },
  {
    key: "good",
    label: "Bom",
    min: 60,
    color: "text-violet-300",
    ring: "ring-violet-500/40",
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    gradient: "from-violet-500/25 to-violet-500/5",
  },
  {
    key: "fair",
    label: "Regular",
    min: 40,
    color: "text-amber-300",
    ring: "ring-amber-500/40",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    gradient: "from-amber-500/25 to-amber-500/5",
  },
  {
    key: "critical",
    label: "Crítico",
    min: 0,
    color: "text-red-300",
    ring: "ring-red-500/40",
    chip: "border-red-500/30 bg-red-500/10 text-red-300",
    gradient: "from-red-500/25 to-red-500/5",
  },
];

/** Deriva o tier a partir de uma nota 0–100. Retorna o tier de "pendente" quando score é null. */
export function getSeoScoreTier(score: number | null | undefined): SeoScoreTierMeta {
  if (typeof score !== "number" || !Number.isFinite(score)) return SEO_SCORE_TIERS[SEO_SCORE_TIERS.length - 1];
  return SEO_SCORE_TIERS.find((t) => score >= t.min) ?? SEO_SCORE_TIERS[SEO_SCORE_TIERS.length - 1];
}

/* ==================================================================== */
/* Indicador SEO — item da lista de fatores                             */
/* ==================================================================== */

export type SeoIndicatorStatus = "ok" | "warning" | "missing" | "pending";

const INDICATOR_STATUS_META: Record<
  SeoIndicatorStatus,
  { label: string; dot: string; chip: string; progress: string }
> = {
  ok:      { label: "Completo",   dot: "bg-emerald-400", chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", progress: "bg-emerald-500" },
  warning: { label: "Atenção",    dot: "bg-amber-400",   chip: "border-amber-500/30 bg-amber-500/10 text-amber-300",       progress: "bg-amber-500" },
  missing: { label: "Faltando",   dot: "bg-red-400",     chip: "border-red-500/30 bg-red-500/10 text-red-300",             progress: "bg-red-500" },
  pending: { label: "Pendente",   dot: "bg-muted-foreground/50", chip: "border-border/60 bg-muted/30 text-muted-foreground", progress: "bg-muted-foreground/40" },
};

export interface SeoIndicator {
  key: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  name: string;
  status: SeoIndicatorStatus;
  /** Nota 0–100 do indicador (null = aguardando dados). */
  score: number | null;
  /** Peso relativo desse indicador no score total (0–100). */
  weight: number;
  hint?: string;
}

/** Conjunto inicial de indicadores usado como placeholder até o cálculo real chegar. */
export const DEFAULT_SEO_INDICATORS: readonly SeoIndicator[] = [
  { key: "verificado",   icon: BadgeCheck,    name: "Perfil Verificado",       status: "pending", score: null, weight: 10 },
  { key: "categoria",    icon: Tag,           name: "Categoria Principal",     status: "pending", score: null, weight: 8 },
  { key: "sub-categorias", icon: Tags,         name: "Categorias Secundárias", status: "pending", score: null, weight: 5 },
  { key: "descricao",    icon: FileText,      name: "Descrição",               status: "pending", score: null, weight: 6 },
  { key: "site",         icon: Globe,         name: "Website",                 status: "pending", score: null, weight: 6 },
  { key: "telefone",     icon: Phone,         name: "Telefone",                status: "pending", score: null, weight: 5 },
  { key: "endereco",     icon: MapPin,        name: "Endereço",                status: "pending", score: null, weight: 5 },
  { key: "horario",      icon: Clock,         name: "Horário",                 status: "pending", score: null, weight: 5 },
  { key: "fotos",        icon: ImageIcon,     name: "Fotos",                   status: "pending", score: null, weight: 10 },
  { key: "avaliacoes",   icon: Star,          name: "Avaliações",              status: "pending", score: null, weight: 12 },
  { key: "respostas",    icon: MessageSquare, name: "Respostas às avaliações", status: "pending", score: null, weight: 8 },
  { key: "produtos",     icon: ShoppingBag,   name: "Produtos",                status: "pending", score: null, weight: 4 },
  { key: "servicos",     icon: Wrench,        name: "Serviços",                status: "pending", score: null, weight: 6 },
  { key: "qa",           icon: HelpCircle,    name: "Perguntas e Respostas",   status: "pending", score: null, weight: 4 },
  { key: "postagens",    icon: Megaphone,     name: "Postagens",               status: "pending", score: null, weight: 6 },
] as const;

function SeoIndicatorRow({ item }: { item: SeoIndicator }) {
  const meta = INDICATOR_STATUS_META[item.status];
  const Icon = item.icon;
  const scoreLabel = typeof item.score === "number" ? `${Math.round(item.score)}` : "—";
  const progressValue = typeof item.score === "number" ? Math.max(0, Math.min(100, item.score)) : 0;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 transition-colors hover:bg-card/60">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/40 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
          <span className="shrink-0 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            peso {item.weight}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Progress
            value={progressValue}
            className="h-1.5 flex-1 bg-muted/30"
            indicatorClassName={meta.progress}
          />
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {scoreLabel}/100
          </span>
        </div>
      </div>

      <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 text-[10px] font-medium", meta.chip)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
        {meta.label}
      </Badge>
    </div>
  );
}

/* ==================================================================== */
/* Oportunidades                                                        */
/* ==================================================================== */

export interface SeoOpportunity {
  key: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  title: string;
  description: string;
  impact?: "alto" | "medio" | "baixo";
}

const IMPACT_META: Record<NonNullable<SeoOpportunity["impact"]>, { label: string; chip: string }> = {
  alto:  { label: "Alto impacto",  chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  medio: { label: "Médio impacto", chip: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  baixo: { label: "Baixo impacto", chip: "border-border/60 bg-muted/30 text-muted-foreground" },
};

export const DEFAULT_SEO_OPPORTUNITIES: readonly SeoOpportunity[] = [
  { key: "fotos",       icon: ImageIcon,     title: "Adicionar mais fotos",   description: "Perfis com galeria completa recebem até 35% mais cliques.", impact: "alto"  },
  { key: "reviews",     icon: Star,          title: "Responder avaliações",   description: "Respostas frequentes aumentam a confiança e o ranqueamento local.", impact: "alto"  },
  { key: "postagens",   icon: Megaphone,     title: "Publicar postagens",     description: "Postagens semanais mantêm o perfil ativo aos olhos do Google.", impact: "medio" },
  { key: "descricao",   icon: FileText,      title: "Completar descrição",    description: "Uma descrição rica em palavras-chave melhora a relevância local.", impact: "medio" },
  { key: "servicos",    icon: Wrench,        title: "Adicionar serviços",     description: "Serviços cadastrados aparecem em buscas específicas do setor.", impact: "medio" },
] as const;

function SeoOpportunityItem({ item }: { item: SeoOpportunity }) {
  const Icon = item.icon;
  const impact = item.impact ? IMPACT_META[item.impact] : null;
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/30 hover:bg-card/70">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
          {impact && (
            <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px] font-medium", impact.chip)}>
              {impact.label}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* Evolução — gráfico placeholder                                        */
/* ==================================================================== */

export interface SeoEvolutionPoint {
  label: string;
  score: number | null;
}

/** Sparkline SVG com pontos + linha. Aceita null para períodos sem dados. */
function SeoEvolutionChart({
  data,
  className,
}: {
  data: readonly SeoEvolutionPoint[];
  className?: string;
}) {
  const width = 100;
  const height = 40;
  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
    const y = typeof d.score === "number" ? height - (Math.max(0, Math.min(100, d.score)) / 100) * height : null;
    return { ...d, x, y };
  });
  const withY = points.filter((p): p is typeof p & { y: number } => typeof p.y === "number");
  const path = withY.length > 1
    ? withY.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")
    : "";

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
        aria-hidden
      >
        {/* Baseline */}
        <line x1="0" y1={height} x2={width} y2={height} className="stroke-border" strokeWidth="0.4" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="stroke-border/40" strokeDasharray="1 2" strokeWidth="0.3" />

        {path && (
          <>
            <path
              d={`${path} L${withY[withY.length - 1].x},${height} L${withY[0].x},${height} Z`}
              className="fill-primary/15"
            />
            <path d={path} className="stroke-primary" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {points.map((p) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y ?? height}
            r={p.y === null ? 0.9 : 1.4}
            className={p.y === null ? "fill-muted-foreground/40" : "fill-primary"}
          />
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-6 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {points.map((p) => (
          <span key={p.label} className="truncate text-center">{p.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ==================================================================== */
/* SeoScoreCard — componente principal exportado                        */
/* ==================================================================== */

export type SeoScoreVariant = "full" | "compact";

export interface SeoScoreCardProps {
  /** Nota geral 0–100. `null` = aguardando primeira auditoria. */
  score?: number | null;
  /** Indicadores exibidos abaixo do score. Default: `DEFAULT_SEO_INDICATORS`. */
  indicators?: readonly SeoIndicator[];
  /** Oportunidades sugeridas. Default: `DEFAULT_SEO_OPPORTUNITIES`. */
  opportunities?: readonly SeoOpportunity[];
  /** Histórico do score para o mini-gráfico. Default: 6 pontos vazios. */
  evolution?: readonly SeoEvolutionPoint[];
  /** Variação percentual vs período anterior (opcional). */
  delta?: number | null;
  /** Renderiza apenas o cabeçalho + score (para reuso em Dashboard/Workspace). */
  variant?: SeoScoreVariant;
  className?: string;
}

const DEFAULT_EVOLUTION: readonly SeoEvolutionPoint[] = [
  { label: "Jan", score: null },
  { label: "Fev", score: null },
  { label: "Mar", score: null },
  { label: "Abr", score: null },
  { label: "Mai", score: null },
  { label: "Jun", score: null },
];

/**
 * SeoScoreCard — Pixel DS.
 *
 * Card do Score SEO Local com:
 *   • Anel de pontuação (0–100) + tier semântico
 *   • Lista de indicadores (peso, status, progresso)
 *   • Oportunidades sugeridas
 *   • Mini-gráfico de evolução
 *
 * Reutilizável em Dashboard, Workspace, Google Business Hub, Auditorias,
 * Relatórios e IA. Use `variant="compact"` fora do Hub.
 */
export function SeoScoreCard({
  score = null,
  indicators = DEFAULT_SEO_INDICATORS,
  opportunities = DEFAULT_SEO_OPPORTUNITIES,
  evolution = DEFAULT_EVOLUTION,
  delta = null,
  variant = "full",
  className,
}: SeoScoreCardProps) {
  const tier = getSeoScoreTier(score);
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const shownScore = hasScore ? Math.round(score as number) : null;
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const deltaPositive = hasDelta && (delta as number) >= 0;

  // Anel circular
  const ringSize = variant === "compact" ? 96 : 132;
  const stroke = variant === "compact" ? 8 : 10;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = hasScore ? (shownScore as number) / 100 : 0;
  const dash = circumference * progress;

  const header = (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
      {/* Anel */}
      <div
        className={cn(
          "relative shrink-0 rounded-full bg-gradient-to-br p-1 ring-1",
          tier.gradient,
          tier.ring,
        )}
        style={{ width: ringSize, height: ringSize }}
      >
        <svg
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            className="fill-none stroke-border/50"
            strokeWidth={stroke}
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            className={cn("fill-none transition-[stroke-dasharray] duration-500", tier.color)}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <p className="font-display text-3xl font-bold tabular-nums leading-none sm:text-4xl">
              {shownScore ?? "—"}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              /100
            </p>
          </div>
        </div>
      </div>

      {/* Título + status */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <h3 className="font-display text-lg font-bold tracking-tight">Score SEO Local</h3>
          <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 text-[10px] font-medium", tier.chip)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", tier.color.replace("text-", "bg-"))} />
            {hasScore ? tier.label : "Aguardando dados"}
          </Badge>
          {hasDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                deltaPositive ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300",
              )}
            >
              <TrendingUp className={cn("h-3 w-3", !deltaPositive && "rotate-180")} />
              {deltaPositive ? "+" : ""}
              {Math.round(delta as number)}%
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasScore
            ? "Pontuação consolidada do Perfil da Empresa no Google, ponderada pelos fatores de SEO Local."
            : "Realize a primeira auditoria para calcular o Score SEO Local deste perfil."}
        </p>

        {variant === "full" && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat label="Ficha" value={hasScore ? "—" : "—"} />
            <MiniStat label="Fotos" value={hasScore ? "—" : "—"} />
            <MiniStat label="Reviews" value={hasScore ? "—" : "—"} />
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "compact") {
    return (
      <Card className={cn("border-border/60 bg-card/40", className)}>
        <CardContent className="p-5">{header}</CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden border-border/60 bg-card/40", className)}>
      <CardContent className="flex flex-col gap-6 p-5 sm:p-6">
        {header}

        {/* Evolução */}
        <section className="space-y-2 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Evolução do Score
            </h4>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Últimos 6 meses
            </span>
          </div>
          <SeoEvolutionChart data={evolution} />
        </section>

        {/* Indicadores */}
        <section className="space-y-3 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Indicadores
            </h4>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {indicators.length} fatores
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {indicators.map((item) => (
              <SeoIndicatorRow key={item.key} item={item} />
            ))}
          </div>
        </section>

        {/* Oportunidades */}
        <section className="space-y-3 border-t border-border/60 pt-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Oportunidades
            </h4>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {opportunities.map((op) => (
              <SeoOpportunityItem key={op.key} item={op} />
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
      <p className="font-display text-base font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
