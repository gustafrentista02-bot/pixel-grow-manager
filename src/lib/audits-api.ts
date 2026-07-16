import { supabase } from "@/integrations/supabase/client";

export type AuditNivel = "fraco" | "razoavel" | "bom" | "manual";

export type AuditMetrica = {
  chave: string;
  label: string;
  nivel: AuditNivel;
  detalhe?: string;
  percentual: number;
  visivel_cliente?: boolean;
};

export type Audit = {
  id: string;
  lead_id: string;
  owner_id: string;
  organization_id: string;
  score_geral: number;
  metricas: AuditMetrica[];
  dados_brutos: Record<string, any> | null;
  status: string;
  created_at: string;
  lead?: {
    id: string;
    nome: string;
    empresa: string | null;
    site: string | null;
    telefone: string | null;
    link_perfil_google: string | null;
    criado_por_extensao: boolean | null;
  } | null;
  owner?: { id: string; nome: string | null } | null;
};

const SELECT_FULL = `
  id, lead_id, owner_id, organization_id, score_geral, metricas, dados_brutos, status, created_at,
  lead:leads!gbp_audits_lead_id_fkey(id, nome, empresa, site, telefone, link_perfil_google, criado_por_extensao)
`;

async function attachOwners(rows: any[]): Promise<Audit[]> {
  const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean)));
  let ownerMap = new Map<string, { id: string; nome: string | null }>();
  if (ownerIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", ownerIds);
    ownerMap = new Map((profs ?? []).map((p) => [p.id, p]));
  }
  return rows.map((r) => normalize({ ...r, owner: ownerMap.get(r.owner_id) ?? null }));
}

export async function listAudits(): Promise<Audit[]> {
  const { data, error } = await supabase
    .from("gbp_audits")
    .select(SELECT_FULL)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachOwners(data ?? []);
}

export async function getAudit(id: string): Promise<Audit | null> {
  const { data, error } = await supabase
    .from("gbp_audits")
    .select(SELECT_FULL)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [result] = await attachOwners([data]);
  return result;
}

export async function listAuditsByLead(leadId: string): Promise<Audit[]> {
  const { data, error } = await supabase
    .from("gbp_audits")
    .select(SELECT_FULL)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachOwners(data ?? []);
}

export async function updateAuditMetricsVisibility(id: string, metricas: AuditMetrica[]): Promise<void> {
  const { error } = await supabase
    .from("gbp_audits")
    .update({ metricas })
    .eq("id", id);
  if (error) throw error;
}

function normalize(row: any): Audit {
  const metricas = Array.isArray(row.metricas)
    ? row.metricas.map((m: any) => ({ visivel_cliente: true, ...m }))
    : [];
  return { ...row, metricas };
}

export function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export function scoreBadgeClass(score: number): string {
  if (score >= 75) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 50) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

export function scoreLabel(score: number): string {
  if (score >= 75) return "Bom";
  if (score >= 50) return "Razoável";
  return "Fraco";
}
