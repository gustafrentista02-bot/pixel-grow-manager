import { useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ListFilter,
  Sparkles,
  Building2,
  Tag,
  Phone,
  MapPin,
  Globe,
  Star,
  Image as ImageIcon,
  MessageSquare,
  Package,
  Wrench,
  HelpCircle,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/dashboard/shared";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type AuditStatus = "concluido" | "atencao" | "critico";
export type AuditImpact = "baixo" | "medio" | "alto";
export type AuditPriority = "alta" | "media" | "baixa";
export type AuditFilter = "todos" | "concluido" | "atencao" | "critico";

export interface AuditItem {
  id: string;
  criterio: string;
  status: AuditStatus;
  /** Nota placeholder — "—" quando ainda não avaliada. */
  nota?: string;
  peso: number;
  impacto: AuditImpact;
  prioridade: AuditPriority;
  descricao?: string;
}

export interface AuditSection {
  id: string;
  titulo: string;
  icon: LucideIcon;
  itens: AuditItem[];
}

/* ------------------------------------------------------------------ */
/* Metadados de status / impacto / prioridade                          */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<
  AuditStatus,
  { label: string; icon: LucideIcon; className: string; dot: string }
> = {
  concluido: {
    label: "Concluído",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  atencao: {
    label: "Atenção",
    icon: AlertTriangle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  critico: {
    label: "Crítico",
    icon: XCircle,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
  },
};

const IMPACT_META: Record<AuditImpact, { label: string; className: string }> = {
  alto: {
    label: "Alto impacto",
    className: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  medio: {
    label: "Médio impacto",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  baixo: {
    label: "Baixo impacto",
    className: "border-border/60 bg-muted/30 text-muted-foreground",
  },
};

const PRIORITY_META: Record<
  AuditPriority,
  { label: string; className: string; dot: string }
> = {
  alta: {
    label: "Alta",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
  },
  media: {
    label: "Média",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  baixa: {
    label: "Baixa",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
};

/* ------------------------------------------------------------------ */
/* Badges reutilizáveis                                                */
/* ------------------------------------------------------------------ */

export function AuditStatusBadge({ status }: { status: AuditStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 px-2 py-0.5 text-[10px] font-medium", meta.className)}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

export function AuditImpactBadge({ impact }: { impact: AuditImpact }) {
  const meta = IMPACT_META[impact];
  return (
    <Badge
      variant="outline"
      className={cn("px-2 py-0.5 text-[10px] font-medium", meta.className)}
    >
      {meta.label}
    </Badge>
  );
}

export function AuditPriorityBadge({ priority }: { priority: AuditPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 px-2 py-0.5 text-[10px] font-medium", meta.className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Linha de item                                                       */
/* ------------------------------------------------------------------ */

interface AuditItemRowProps {
  item: AuditItem;
  onDetails?: (item: AuditItem) => void;
}

function AuditItemRow({ item, onDetails }: AuditItemRowProps) {
  const status = STATUS_META[item.status];
  return (
    <div className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-colors hover:bg-card/70">
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1",
          item.status === "concluido" && "bg-emerald-500/10 ring-emerald-500/25 text-emerald-300",
          item.status === "atencao" && "bg-amber-500/10 ring-amber-500/25 text-amber-300",
          item.status === "critico" && "bg-rose-500/10 ring-rose-500/25 text-rose-300",
        )}
      >
        <status.icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {item.criterio}
          </p>
          <AuditPriorityBadge priority={item.prioridade} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="opacity-60">Nota</span>
            <span className="font-semibold text-foreground/80">
              {item.nota ?? "—"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="opacity-60">Peso</span>
            <span className="font-semibold text-foreground/80">{item.peso}</span>
          </span>
          <AuditImpactBadge impact={item.impacto} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <AuditStatusBadge status={item.status} />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1 text-xs opacity-70 group-hover:opacity-100"
          onClick={() => onDetails?.(item)}
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

const FILTER_OPTIONS: { value: AuditFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "concluido", label: "Concluídos" },
  { value: "atencao", label: "Pendentes" },
  { value: "critico", label: "Críticos" },
];

interface AuditFiltersProps {
  value: AuditFilter;
  onChange: (v: AuditFilter) => void;
  counts: Record<AuditFilter, number>;
}

function AuditFilters({ value, onChange, counts }: AuditFiltersProps) {
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
                active ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground",
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
/* AuditChecklistCard — componente principal                           */
/* ------------------------------------------------------------------ */

export interface AuditChecklistCardProps {
  sections: AuditSection[];
  title?: string;
  description?: string;
  onDetails?: (item: AuditItem) => void;
  className?: string;
}

export function AuditChecklistCard({
  sections,
  title = "Checklist da Auditoria",
  description,
  onDetails,
  className,
}: AuditChecklistCardProps) {
  const [filter, setFilter] = useState<AuditFilter>("todos");

  const allItems = useMemo(
    () => sections.flatMap((s) => s.itens),
    [sections],
  );

  const counts = useMemo<Record<AuditFilter, number>>(
    () => ({
      todos: allItems.length,
      concluido: allItems.filter((i) => i.status === "concluido").length,
      atencao: allItems.filter((i) => i.status === "atencao").length,
      critico: allItems.filter((i) => i.status === "critico").length,
    }),
    [allItems],
  );

  const filteredSections = useMemo(() => {
    if (filter === "todos") return sections;
    return sections
      .map((s) => ({ ...s, itens: s.itens.filter((i) => i.status === filter) }))
      .filter((s) => s.itens.length > 0);
  }, [sections, filter]);

  return (
    <Card className={cn("border-border/60 bg-card/40", className)}>
      <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <AuditFilters value={filter} onChange={setFilter} counts={counts} />
        </header>

        <div className="flex flex-col gap-5">
          {filteredSections.map((section) => (
            <section key={section.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-muted/40 text-muted-foreground">
                  <section.icon className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {section.titulo}
                </h4>
                <span className="text-[11px] tabular-nums text-muted-foreground/70">
                  {section.itens.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {section.itens.map((item) => (
                  <AuditItemRow
                    key={item.id}
                    item={item}
                    onDetails={onDetails}
                  />
                ))}
              </div>
            </section>
          ))}
          {filteredSections.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center text-sm text-muted-foreground">
              Nenhum item encontrado neste filtro.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Plano de Ação                                                       */
/* ------------------------------------------------------------------ */

export interface AuditActionItem {
  id: string;
  titulo: string;
  descricao?: string;
  prioridade: AuditPriority;
  impacto: AuditImpact;
}

export interface AuditActionPlanCardProps {
  items?: AuditActionItem[];
  className?: string;
}

export function AuditActionPlanCard({
  items = DEFAULT_ACTION_PLAN,
  className,
}: AuditActionPlanCardProps) {
  return (
    <Card className={cn("border-border/60 bg-card/40", className)}>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Plano de Ação
            </h3>
            <p className="text-xs text-muted-foreground">
              Recomendações priorizadas geradas a partir da auditoria.
            </p>
          </div>
        </div>

        <ol className="flex flex-col gap-2">
          {items.map((item, i) => (
            <li
              key={item.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/40 text-xs font-semibold tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.titulo}
                </p>
                {item.descricao && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.descricao}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <AuditImpactBadge impact={item.impacto} />
                <AuditPriorityBadge priority={item.prioridade} />
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Dados padrão (placeholders)                                         */
/* ------------------------------------------------------------------ */

export const DEFAULT_AUDIT_SECTIONS: AuditSection[] = [
  {
    id: "perfil",
    titulo: "Perfil",
    icon: Building2,
    itens: [
      { id: "perfil-nome", criterio: "Nome da empresa consistente", status: "concluido", nota: "—", peso: 5, impacto: "alto", prioridade: "alta" },
      { id: "perfil-verificado", criterio: "Perfil verificado", status: "atencao", nota: "—", peso: 5, impacto: "alto", prioridade: "alta" },
      { id: "perfil-descricao", criterio: "Descrição otimizada", status: "atencao", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
    ],
  },
  {
    id: "categoria",
    titulo: "Categoria",
    icon: Tag,
    itens: [
      { id: "cat-principal", criterio: "Categoria principal definida", status: "concluido", nota: "—", peso: 5, impacto: "alto", prioridade: "alta" },
      { id: "cat-secundarias", criterio: "Categorias secundárias relevantes", status: "atencao", nota: "—", peso: 4, impacto: "medio", prioridade: "media" },
    ],
  },
  {
    id: "contato",
    titulo: "Contato",
    icon: Phone,
    itens: [
      { id: "contato-telefone", criterio: "Telefone válido e ativo", status: "concluido", nota: "—", peso: 4, impacto: "alto", prioridade: "alta" },
      { id: "contato-whatsapp", criterio: "WhatsApp vinculado", status: "atencao", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
    ],
  },
  {
    id: "localizacao",
    titulo: "Localização",
    icon: MapPin,
    itens: [
      { id: "loc-endereco", criterio: "Endereço completo e correto", status: "concluido", nota: "—", peso: 5, impacto: "alto", prioridade: "alta" },
      { id: "loc-area", criterio: "Área de atuação definida", status: "atencao", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
    ],
  },
  {
    id: "website",
    titulo: "Website",
    icon: Globe,
    itens: [
      { id: "web-url", criterio: "Website vinculado ao perfil", status: "atencao", nota: "—", peso: 4, impacto: "alto", prioridade: "alta" },
      { id: "web-utm", criterio: "UTM de rastreamento configurada", status: "critico", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
    ],
  },
  {
    id: "avaliacoes",
    titulo: "Avaliações",
    icon: Star,
    itens: [
      { id: "aval-quantidade", criterio: "Volume de avaliações", status: "atencao", nota: "—", peso: 5, impacto: "alto", prioridade: "alta" },
      { id: "aval-media", criterio: "Média igual ou acima de 4.5", status: "atencao", nota: "—", peso: 5, impacto: "alto", prioridade: "alta" },
      { id: "aval-respostas", criterio: "Taxa de resposta às avaliações", status: "critico", nota: "—", peso: 4, impacto: "alto", prioridade: "alta" },
    ],
  },
  {
    id: "fotos",
    titulo: "Fotos",
    icon: ImageIcon,
    itens: [
      { id: "fotos-capa", criterio: "Foto de capa em alta qualidade", status: "concluido", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
      { id: "fotos-interior", criterio: "Fotos de interior", status: "atencao", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
      { id: "fotos-equipe", criterio: "Fotos da equipe", status: "critico", nota: "—", peso: 2, impacto: "baixo", prioridade: "baixa" },
    ],
  },
  {
    id: "postagens",
    titulo: "Postagens",
    icon: MessageSquare,
    itens: [
      { id: "post-frequencia", criterio: "Postagens semanais ativas", status: "critico", nota: "—", peso: 4, impacto: "alto", prioridade: "alta" },
      { id: "post-cta", criterio: "Postagens com CTA claro", status: "atencao", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
    ],
  },
  {
    id: "produtos",
    titulo: "Produtos",
    icon: Package,
    itens: [
      { id: "prod-cadastro", criterio: "Produtos cadastrados", status: "atencao", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
      { id: "prod-fotos", criterio: "Fotos vinculadas aos produtos", status: "critico", nota: "—", peso: 2, impacto: "baixo", prioridade: "baixa" },
    ],
  },
  {
    id: "servicos",
    titulo: "Serviços",
    icon: Wrench,
    itens: [
      { id: "serv-cadastro", criterio: "Serviços cadastrados", status: "atencao", nota: "—", peso: 4, impacto: "alto", prioridade: "alta" },
      { id: "serv-descricao", criterio: "Descrições completas por serviço", status: "atencao", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
    ],
  },
  {
    id: "qa",
    titulo: "Perguntas e Respostas",
    icon: HelpCircle,
    itens: [
      { id: "qa-respondidas", criterio: "Perguntas respondidas pela empresa", status: "critico", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
      { id: "qa-frequentes", criterio: "FAQ estratégico publicado", status: "atencao", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
    ],
  },
  {
    id: "seo-local",
    titulo: "SEO Local",
    icon: Gauge,
    itens: [
      { id: "seo-keywords", criterio: "Palavras-chave locais no perfil", status: "atencao", nota: "—", peso: 5, impacto: "alto", prioridade: "alta" },
      { id: "seo-nap", criterio: "NAP consistente na web", status: "atencao", nota: "—", peso: 4, impacto: "alto", prioridade: "alta" },
      { id: "seo-citations", criterio: "Citações em diretórios locais", status: "critico", nota: "—", peso: 3, impacto: "medio", prioridade: "media" },
    ],
  },
];

export const DEFAULT_ACTION_PLAN: AuditActionItem[] = [
  {
    id: "act-respostas",
    titulo: "Responder avaliações pendentes dos últimos 30 dias",
    descricao: "Impacto direto na conversão e no ranking local.",
    prioridade: "alta",
    impacto: "alto",
  },
  {
    id: "act-postagens",
    titulo: "Ativar rotina semanal de postagens no Perfil",
    descricao: "Manter o perfil ativo aumenta relevância no Maps.",
    prioridade: "alta",
    impacto: "alto",
  },
  {
    id: "act-utm",
    titulo: "Adicionar UTM de rastreamento no site vinculado",
    descricao: "Necessário para medir tráfego vindo do Google Business.",
    prioridade: "media",
    impacto: "medio",
  },
  {
    id: "act-servicos",
    titulo: "Cadastrar serviços com descrições completas",
    descricao: "Melhora correspondência com buscas locais específicas.",
    prioridade: "media",
    impacto: "medio",
  },
  {
    id: "act-qa",
    titulo: "Publicar FAQ estratégico no Perfil",
    descricao: "Reduz dúvidas frequentes e melhora percepção da marca.",
    prioridade: "baixa",
    impacto: "medio",
  },
];

/* ------------------------------------------------------------------ */
/* Wrapper de conveniência para o Google Business Hub                   */
/* ------------------------------------------------------------------ */

export interface SmartAuditBlockProps {
  sections?: AuditSection[];
  actionPlan?: AuditActionItem[];
}

export function SmartAuditBlock({
  sections = DEFAULT_AUDIT_SECTIONS,
  actionPlan = DEFAULT_ACTION_PLAN,
}: SmartAuditBlockProps) {
  const allItems = sections.flatMap((s) => s.itens);
  const total = allItems.length;
  const concluidos = allItems.filter((i) => i.status === "concluido").length;
  const criticos = allItems.filter((i) => i.status === "critico").length;
  const pendentes = allItems.filter((i) => i.status === "atencao").length;
  const somaPesos = allItems.reduce((acc, i) => acc + i.peso, 0);
  const pesoConcluido = allItems
    .filter((i) => i.status === "concluido")
    .reduce((acc, i) => acc + i.peso, 0);
  const score = somaPesos > 0 ? Math.round((pesoConcluido / somaPesos) * 100) : 0;

  return (
    <Block title="Auditoria Inteligente" icon={Sparkles}>
      <div className="flex flex-col gap-5">
        <AuditSummaryStrip
          concluidos={concluidos}
          pendentes={pendentes}
          criticos={criticos}
          score={score}
          total={total}
        />
        <AuditChecklistCard
          sections={sections}
          description="Critérios organizados por área. Filtre para focar no que exige atenção."
        />
        <AuditActionPlanCard items={actionPlan} />
      </div>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* Resumo (KPI strip)                                                  */
/* ------------------------------------------------------------------ */

interface AuditSummaryStripProps {
  concluidos: number;
  pendentes: number;
  criticos: number;
  score: number;
  total: number;
}

function AuditSummaryStrip({
  concluidos,
  pendentes,
  criticos,
  score,
  total,
}: AuditSummaryStripProps) {
  const kpis = [
    {
      icon: CheckCircle2,
      value: String(concluidos),
      label: "Itens concluídos",
      tone: "green" as const,
      hint: total > 0 ? `${Math.round((concluidos / total) * 100)}% do checklist` : undefined,
    },
    {
      icon: AlertTriangle,
      value: String(pendentes),
      label: "Itens pendentes",
      tone: "amber" as const,
      hint: "Requerem atenção",
    },
    {
      icon: XCircle,
      value: String(criticos),
      label: "Itens críticos",
      tone: "rose" as const,
      hint: "Prioridade máxima",
    },
    {
      icon: Gauge,
      value: `${score}`,
      label: "Pontuação geral",
      tone: "violet" as const,
      hint: "Score ponderado (0–100)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((k) => (
        <AuditKpi key={k.label} {...k} />
      ))}
    </div>
  );
}

const TONE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  green: { bg: "bg-emerald-500/10", text: "text-emerald-300", ring: "ring-emerald-500/25" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-300", ring: "ring-amber-500/25" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-300", ring: "ring-rose-500/25" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-300", ring: "ring-violet-500/25" },
};

function AuditKpi({
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
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{label}</p>
          {hint && <p className="truncate text-[10px] text-muted-foreground/70">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
