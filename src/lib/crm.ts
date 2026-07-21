import type { Database } from "@/integrations/supabase/types";

export type LeadStage = Database["public"]["Enums"]["lead_stage"];
export type FollowupStage = Database["public"]["Enums"]["followup_stage"];
export type LeadOrigin = Database["public"]["Enums"]["lead_origin"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const ORIGINS: { value: LeadOrigin; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "site", label: "Site" },
  { value: "indicacao", label: "Indicação" },
  { value: "trafego_pago", label: "Tráfego Pago" },
  { value: "outro", label: "Outro" },
];

export const ORIGIN_LABELS: Record<LeadOrigin, string> = Object.fromEntries(
  ORIGINS.map((o) => [o.value, o.label]),
) as Record<LeadOrigin, string>;

export type StageMeta = {
  value: LeadStage;
  label: string;
  emoji: string;
  /** tailwind classes for accent dot / badge */
  dot: string;
  badge: string;
};

export const STAGES: StageMeta[] = [
  { value: "lead_novo", label: "Lead Novo", emoji: "🟡", dot: "bg-yellow-400", badge: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30" },
  { value: "conversando", label: "Conversando", emoji: "🔵", dot: "bg-sky-400", badge: "bg-sky-400/15 text-sky-300 border-sky-400/30" },
  { value: "reuniao", label: "Reunião", emoji: "🟣", dot: "bg-violet-400", badge: "bg-violet-400/15 text-violet-300 border-violet-400/30" },
  { value: "proposta", label: "Proposta", emoji: "🟠", dot: "bg-orange-400", badge: "bg-orange-400/15 text-orange-300 border-orange-400/30" },
  { value: "ganho", label: "Ganho", emoji: "🟢", dot: "bg-emerald-400", badge: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
  { value: "perdido", label: "Perdido", emoji: "🔴", dot: "bg-red-400", badge: "bg-red-400/15 text-red-300 border-red-400/30" },
  { value: "follow_up", label: "Follow-up", emoji: "🔁", dot: "bg-cyan-400", badge: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30" },
  { value: "sem_interesse", label: "Sem Interesse", emoji: "🧠", dot: "bg-zinc-400", badge: "bg-zinc-400/15 text-zinc-300 border-zinc-400/30" },
];

/** Stages shown as columns in the main sales kanban */
export const KANBAN_STAGES: LeadStage[] = [
  "lead_novo", "conversando", "reuniao", "proposta", "ganho", "perdido", "follow_up", "sem_interesse",
];

export const STAGE_META: Record<LeadStage, StageMeta> = Object.fromEntries(
  STAGES.map((s) => [s.value, s]),
) as Record<LeadStage, StageMeta>;

export type FollowupMeta = {
  value: FollowupStage;
  label: string;
  emoji: string;
  hint: string;
};

export const FOLLOWUP_STAGES: FollowupMeta[] = [
  { value: "followup_1", label: "Follow-up 1", emoji: "📲", hint: "24h depois" },
  { value: "followup_2", label: "Follow-up 2", emoji: "📲", hint: "2 dias depois" },
  { value: "followup_3", label: "Follow-up 3", emoji: "📲", hint: "3 a 4 dias depois" },
  { value: "followup_4", label: "Follow-up 4", emoji: "📲", hint: "última tentativa" },
];

export const FOLLOWUP_META: Record<FollowupStage, FollowupMeta> = Object.fromEntries(
  FOLLOWUP_STAGES.map((s) => [s.value, s]),
) as Record<FollowupStage, FollowupMeta>;

/** hours until a "sem_interesse" lead is auto-deleted */
export const SEM_INTERESSE_TTL_HOURS = 24;

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador: "Administrador",
  gerente: "Gerente Geral",
  vendedor: "Vendedor",
};

/** roles with elevated (team-wide) access */
export const MANAGER_ROLES: AppRole[] = ["administrador", "gerente"];

export type Potencial = "alta" | "media" | "baixa";

export const POTENCIAL_OPTIONS: { value: Potencial; label: string; dot: string; badge: string }[] = [
  { value: "alta", label: "Alta", dot: "bg-emerald-400", badge: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
  { value: "media", label: "Média", dot: "bg-amber-400", badge: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  { value: "baixa", label: "Baixa", dot: "bg-zinc-400", badge: "bg-zinc-400/15 text-zinc-300 border-zinc-400/30" },
];

export const POTENCIAL_META: Record<Potencial, (typeof POTENCIAL_OPTIONS)[number]> = Object.fromEntries(
  POTENCIAL_OPTIONS.map((p) => [p.value, p]),
) as Record<Potencial, (typeof POTENCIAL_OPTIONS)[number]>;

/** SEO-local oriented plans (editable text stored on lead) */
export const PLANO_OPTIONS = [
  "SEO Local",
  "Google Meu Negócio",
  "Gestão de Tráfego",
  "Combo Completo",
  "Social Media",
  "Site / Landing Page",
  "Outro",
] as const;

export const STATUS_COMERCIAL_OPTIONS = [
  "Novo",
  "Em negociação",
  "Aguardando retorno",
  "Proposta enviada",
  "Fechado",
  "Perdido",
] as const;

/** how leads currently acquire customers (marketing tab) */
export const CANAIS_AQUISICAO_OPTIONS = [
  "Google",
  "Instagram",
  "Indicação",
  "Meta Ads",
  "Google Ads",
  "Outros",
] as const;

export type Temperatura = Database["public"]["Enums"]["lead_temperatura"];

export const TEMPERATURA_OPTIONS: { value: Temperatura; label: string; dot: string; badge: string }[] = [
  { value: "quente", label: "Quente", dot: "bg-red-400", badge: "bg-red-400/15 text-red-300 border-red-400/30" },
  { value: "morno", label: "Morno", dot: "bg-amber-400", badge: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  { value: "frio", label: "Frio", dot: "bg-sky-400", badge: "bg-sky-400/15 text-sky-300 border-sky-400/30" },
];

export const TEMPERATURA_META: Record<Temperatura, (typeof TEMPERATURA_OPTIONS)[number]> = Object.fromEntries(
  TEMPERATURA_OPTIONS.map((t) => [t.value, t]),
) as Record<Temperatura, (typeof TEMPERATURA_OPTIONS)[number]>;

