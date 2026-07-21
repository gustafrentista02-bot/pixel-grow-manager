import { useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  ChevronRight,
  ListFilter,
  ListChecks,
  AlertTriangle,
  Flame,
  MessageSquare,
  ListPlus,
  CalendarPlus,
  Brain,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/dashboard/shared";
import {
  AuditImpactBadge,
  AuditPriorityBadge,
  type AuditImpact,
  type AuditPriority,
} from "./audit-checklist";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type ActionStatus = "pendente" | "em_andamento" | "concluida";
export type ActionCategory =
  | "perfil"
  | "avaliacoes"
  | "postagens"
  | "fotos"
  | "servicos"
  | "seo"
  | "website"
  | "qa";
export type ActionFilter = "todos" | "pendente" | "concluida" | "alta";

export interface ActionItem {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: ActionCategory;
  impacto: AuditImpact;
  prioridade: AuditPriority;
  /** Ex: "5 minutos", "20 minutos", "1 hora". */
  tempoEstimado: string;
  status: ActionStatus;
}

/**
 * Ganchos preparados para integrações futuras — todos opcionais.
 * Nenhum é chamado nesta Sprint; existem apenas para expor a arquitetura.
 */
export interface ActionPlanHandlers {
  onComplete?: (item: ActionItem) => void;
  onDetails?: (item: ActionItem) => void;
  onSendToActivity?: (item: ActionItem) => void;
  onCreateTask?: (item: ActionItem) => void;
  onScheduleFollowup?: (item: ActionItem) => void;
  onGenerateInsight?: (item: ActionItem) => void;
  onUpdateSeoScore?: (item: ActionItem) => void;
}

/* ------------------------------------------------------------------ */
/* Metadados                                                           */
/* ------------------------------------------------------------------ */

const CATEGORY_META: Record<ActionCategory, { label: string }> = {
  perfil: { label: "Perfil" },
  avaliacoes: { label: "Avaliações" },
  postagens: { label: "Postagens" },
  fotos: { label: "Fotos" },
  servicos: { label: "Serviços" },
  seo: { label: "SEO Local" },
  website: { label: "Website" },
  qa: { label: "Perguntas & Respostas" },
};

const STATUS_META: Record<
  ActionStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  pendente: {
    label: "Pendente",
    icon: Circle,
    className: "border-border/60 bg-muted/30 text-muted-foreground",
  },
  em_andamento: {
    label: "Em andamento",
    icon: Loader2,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  concluida: {
    label: "Concluída",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
};

const PRIORITY_GROUP_META: Record<
  AuditPriority,
  { label: string; icon: LucideIcon; accent: string }
> = {
  alta: { label: "Alta prioridade", icon: Flame, accent: "text-rose-300" },
  media: { label: "Média prioridade", icon: AlertTriangle, accent: "text-amber-300" },
  baixa: { label: "Baixa prioridade", icon: ListChecks, accent: "text-emerald-300" },
};

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 px-2 py-0.5 text-[10px] font-medium", meta.className)}
    >
      <Icon
        className={cn(
          "h-3 w-3",
          status === "em_andamento" && "animate-spin",
        )}
      />
      {meta.label}
    </Badge>
  );
}

export function ActionCategoryBadge({
  category,
}: {
  category: ActionCategory;
}) {
  return (
    <Badge
      variant="outline"
      className="border-border/60 bg-card/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
    >
      {CATEGORY_META[category].label}
    </Badge>
  );
}

export function ActionTimeBadge({ time }: { time: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Clock className="h-3 w-3" />
      {time}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Linha de ação                                                       */
/* ------------------------------------------------------------------ */

interface ActionRowProps {
  item: ActionItem;
  handlers?: ActionPlanHandlers;
}

function ActionRow({ item, handlers }: ActionRowProps) {
  const done = item.status === "concluida";
  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-colors hover:bg-card/70",
        done && "opacity-70",
      )}
    >
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1",
          done && "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
          item.status === "em_andamento" &&
            "bg-sky-500/10 text-sky-300 ring-sky-500/25",
          item.status === "pendente" &&
            "bg-muted/40 text-muted-foreground ring-border/60",
        )}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : item.status === "em_andamento" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate text-sm font-medium text-foreground",
              done && "line-through decoration-muted-foreground/60",
            )}
          >
            {item.titulo}
          </p>
          <AuditPriorityBadge priority={item.prioridade} />
        </div>
        {item.descricao && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {item.descricao}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ActionCategoryBadge category={item.categoria} />
          <AuditImpactBadge impact={item.impacto} />
          <ActionTimeBadge time={item.tempoEstimado} />
          <ActionStatusBadge status={item.status} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Button
          size="sm"
          variant={done ? "outline" : "default"}
          className="h-8 gap-1 text-xs"
          disabled={done}
          onClick={() => handlers?.onComplete?.(item)}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {done ? "Concluída" : "Concluir"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs opacity-70 group-hover:opacity-100"
          onClick={() => handlers?.onDetails?.(item)}
        >
          Ver detalhes
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

const FILTER_OPTIONS: { value: ActionFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendentes" },
  { value: "concluida", label: "Concluídas" },
  { value: "alta", label: "Alta prioridade" },
];

interface ActionFiltersProps {
  value: ActionFilter;
  onChange: (v: ActionFilter) => void;
  counts: Record<ActionFilter, number>;
}

function ActionFilters({ value, onChange, counts }: ActionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <ListFilter className="h-3.5 w-3.5" />
        Filtrar
      </div>
      {FILTER_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground",
            )}
          >
            {opt.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px] tabular-nums",
                active
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/40 text-muted-foreground",
              )}
            >
              {counts[opt.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ActionPlanCard — componente principal                               */
/* ------------------------------------------------------------------ */

export interface ActionPlanCardProps {
  items: ActionItem[];
  title?: string;
  description?: string;
  handlers?: ActionPlanHandlers;
  className?: string;
}

export function ActionPlanCard({
  items,
  title = "Plano de Ação Inteligente",
  description = "Recomendações priorizadas pela auditoria — pronto para virar tarefa, follow-up ou insight.",
  handlers,
  className,
}: ActionPlanCardProps) {
  const [filter, setFilter] = useState<ActionFilter>("todos");

  const counts = useMemo<Record<ActionFilter, number>>(
    () => ({
      todos: items.length,
      pendente: items.filter((i) => i.status === "pendente").length,
      concluida: items.filter((i) => i.status === "concluida").length,
      alta: items.filter((i) => i.prioridade === "alta").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "pendente":
        return items.filter((i) => i.status === "pendente");
      case "concluida":
        return items.filter((i) => i.status === "concluida");
      case "alta":
        return items.filter((i) => i.prioridade === "alta");
      default:
        return items;
    }
  }, [items, filter]);

  const grouped = useMemo(() => {
    const order: AuditPriority[] = ["alta", "media", "baixa"];
    return order
      .map((p) => ({
        prioridade: p,
        itens: filtered.filter((i) => i.prioridade === p),
      }))
      .filter((g) => g.itens.length > 0);
  }, [filtered]);

  return (
    <Card className={cn("border-border/60 bg-card/40", className)}>
      <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold tracking-tight">
                {title}
              </h3>
              {description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          <ActionFilters value={filter} onChange={setFilter} counts={counts} />
        </header>

        <div className="flex flex-col gap-5">
          {grouped.map((group) => {
            const meta = PRIORITY_GROUP_META[group.prioridade];
            const GroupIcon = meta.icon;
            return (
              <section key={group.prioridade} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-muted/40">
                    <GroupIcon className={cn("h-3.5 w-3.5", meta.accent)} />
                  </div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {meta.label}
                  </h4>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">
                    {group.itens.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {group.itens.map((item) => (
                    <ActionRow key={item.id} item={item} handlers={handlers} />
                  ))}
                </div>
              </section>
            );
          })}

          {grouped.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center text-sm text-muted-foreground">
              Nenhuma ação encontrada neste filtro.
            </div>
          )}
        </div>

        {/* Faixa de integrações futuras — apenas visual nesta Sprint */}
        <FutureIntegrationsHint />
      </CardContent>
    </Card>
  );
}

function FutureIntegrationsHint() {
  const items = [
    { icon: MessageSquare, label: "Central de Atividades" },
    { icon: ListPlus, label: "Criar tarefa" },
    { icon: CalendarPlus, label: "Agendar follow-up" },
    { icon: Brain, label: "Gerar insight de IA" },
    { icon: Gauge, label: "Atualizar SEO Score" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/50 bg-card/20 p-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Ações preparadas
      </span>
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          <it.icon className="h-3 w-3" />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resumo KPI                                                          */
/* ------------------------------------------------------------------ */

const TONE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  sky: { bg: "bg-sky-500/10", text: "text-sky-300", ring: "ring-sky-500/25" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/25" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-300", ring: "ring-amber-500/25" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-300", ring: "ring-rose-500/25" },
};

function KpiTile({
  icon: Icon,
  value,
  label,
  tone,
  hint,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone: keyof typeof TONE_STYLES;
  hint?: string;
}) {
  const t = TONE_STYLES[tone];
  return (
    <Card className="border-border/60 bg-card/40">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1", t.bg, t.text, t.ring)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold leading-none tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
            {label}
          </p>
          {hint && (
            <p className="truncate text-[10px] text-muted-foreground/70">
              {hint}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface ActionPlanSummaryProps {
  items: ActionItem[];
  className?: string;
}

export function ActionPlanSummary({ items, className }: ActionPlanSummaryProps) {
  const total = items.length;
  const concluidas = items.filter((i) => i.status === "concluida").length;
  const pendentes = items.filter((i) => i.status !== "concluida").length;
  const alta = items.filter((i) => i.prioridade === "alta").length;
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      <KpiTile icon={ListChecks} value={String(total)} label="Total de ações" tone="sky" />
      <KpiTile
        icon={CheckCircle2}
        value={String(concluidas)}
        label="Concluídas"
        tone="green"
        hint={total > 0 ? `${Math.round((concluidas / total) * 100)}% do plano` : undefined}
      />
      <KpiTile icon={Circle} value={String(pendentes)} label="Pendentes" tone="amber" />
      <KpiTile icon={Flame} value={String(alta)} label="Alta prioridade" tone="rose" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Wrapper para o Google Business Hub                                  */
/* ------------------------------------------------------------------ */

export interface SmartActionPlanBlockProps {
  items?: ActionItem[];
  handlers?: ActionPlanHandlers;
}

export function SmartActionPlanBlock({
  items = DEFAULT_ACTION_PLAN_ITEMS,
  handlers,
}: SmartActionPlanBlockProps) {
  return (
    <Block title="Plano de Ação Inteligente" icon={Sparkles}>
      <div className="flex flex-col gap-5">
        <ActionPlanSummary items={items} />
        <ActionPlanCard items={items} handlers={handlers} />
      </div>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* Dados padrão (placeholders)                                         */
/* ------------------------------------------------------------------ */

export const DEFAULT_ACTION_PLAN_ITEMS: ActionItem[] = [
  {
    id: "act-01",
    titulo: "Responder avaliações pendentes dos últimos 30 dias",
    descricao: "Impacto direto na conversão e no ranking local do Perfil.",
    categoria: "avaliacoes",
    impacto: "alto",
    prioridade: "alta",
    tempoEstimado: "20 minutos",
    status: "pendente",
  },
  {
    id: "act-02",
    titulo: "Ativar rotina semanal de postagens no Perfil",
    descricao: "Manter o perfil ativo aumenta relevância nas buscas do Maps.",
    categoria: "postagens",
    impacto: "alto",
    prioridade: "alta",
    tempoEstimado: "1 hora",
    status: "pendente",
  },
  {
    id: "act-03",
    titulo: "Verificar o Perfil da Empresa",
    descricao: "Perfis verificados ganham prioridade nos resultados locais.",
    categoria: "perfil",
    impacto: "alto",
    prioridade: "alta",
    tempoEstimado: "5 minutos",
    status: "em_andamento",
  },
  {
    id: "act-04",
    titulo: "Adicionar UTM de rastreamento no site vinculado",
    descricao: "Necessário para medir o tráfego vindo do Google Business.",
    categoria: "website",
    impacto: "medio",
    prioridade: "media",
    tempoEstimado: "20 minutos",
    status: "pendente",
  },
  {
    id: "act-05",
    titulo: "Cadastrar serviços com descrições completas",
    descricao: "Melhora correspondência com buscas locais específicas.",
    categoria: "servicos",
    impacto: "medio",
    prioridade: "media",
    tempoEstimado: "1 hora",
    status: "pendente",
  },
  {
    id: "act-06",
    titulo: "Publicar FAQ estratégico no Perfil",
    descricao: "Reduz dúvidas frequentes e melhora percepção da marca.",
    categoria: "qa",
    impacto: "medio",
    prioridade: "baixa",
    tempoEstimado: "20 minutos",
    status: "pendente",
  },
  {
    id: "act-07",
    titulo: "Adicionar fotos da equipe no Perfil",
    descricao: "Humaniza a marca e aumenta engajamento.",
    categoria: "fotos",
    impacto: "baixo",
    prioridade: "baixa",
    tempoEstimado: "5 minutos",
    status: "concluida",
  },
];
