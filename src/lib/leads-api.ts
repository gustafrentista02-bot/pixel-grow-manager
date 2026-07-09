import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { LeadStage, FollowupStage } from "@/lib/crm";
import { SEM_INTERESSE_TTL_HOURS } from "@/lib/crm";

export type Lead = Tables<"leads">;
export type LeadNote = Tables<"lead_notes">;
export type LeadMovement = Tables<"lead_movements">;
export type LeadEvent = Tables<"lead_events">;
export type LeadFile = Tables<"lead_files">;

export type LeadInput = {
  nome: string;
  telefone: string;
  whatsapp: string;
  cidade: string;
  uf: string;
  empresa: string;
  instagram: string;
  site: string;
  area_atendimento: string;
  segmento: string;
  faturamento_mensal: number;
  valor_contrato: number;
  plano: string;
  status_comercial: string;
  potencial: string;
  origem: Lead["origem"];
  responsavel_id: string | null;
  observacoes: string;
  tem_perfil_google: boolean;
  link_perfil_google: string;
  tem_site: boolean;
  faz_google_ads: boolean;
  faz_meta_ads: boolean;
  canais_aquisicao: string[];
  objetivo: string;
  dificuldade: string;
  proxima_acao: string;
  stage?: LeadStage;
};

export const EMPTY_LEAD_INPUT: LeadInput = {
  nome: "",
  telefone: "",
  whatsapp: "",
  cidade: "",
  uf: "",
  empresa: "",
  instagram: "",
  site: "",
  area_atendimento: "",
  segmento: "",
  faturamento_mensal: 0,
  valor_contrato: 0,
  plano: "",
  status_comercial: "",
  potencial: "media",
  origem: "outro",
  responsavel_id: null,
  observacoes: "",
  tem_perfil_google: false,
  link_perfil_google: "",
  tem_site: false,
  faz_google_ads: false,
  faz_meta_ads: false,
  canais_aquisicao: [],
  objetivo: "",
  dificuldade: "",
  proxima_acao: "",
};

export function leadToInput(lead: Lead): LeadInput {
  return {
    nome: lead.nome,
    telefone: lead.telefone,
    whatsapp: lead.whatsapp,
    cidade: lead.cidade,
    uf: lead.uf,
    empresa: lead.empresa,
    instagram: lead.instagram,
    site: lead.site,
    area_atendimento: lead.area_atendimento,
    segmento: lead.segmento,
    faturamento_mensal: lead.faturamento_mensal,
    valor_contrato: lead.valor_contrato,
    plano: lead.plano,
    status_comercial: lead.status_comercial,
    potencial: lead.potencial,
    origem: lead.origem,
    responsavel_id: lead.responsavel_id,
    observacoes: lead.observacoes,
    tem_perfil_google: lead.tem_perfil_google,
    link_perfil_google: lead.link_perfil_google,
    tem_site: lead.tem_site,
    faz_google_ads: lead.faz_google_ads,
    faz_meta_ads: lead.faz_meta_ads,
    canais_aquisicao: lead.canais_aquisicao,
    objetivo: lead.objetivo,
    dificuldade: lead.dificuldade,
    proxima_acao: lead.proxima_acao,
  };
}
export async function purgeExpiredLeads(): Promise<number> {
  const cutoff = new Date(Date.now() - SEM_INTERESSE_TTL_HOURS * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("stage", "sem_interesse")
    .lt("sem_interesse_at", cutoff)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Não autenticado");

  const payload: TablesInsert<"leads"> = {
    ...input,
    owner_id: uid,
    responsavel_id: input.responsavel_id ?? uid,
    stage: input.stage ?? "lead_novo",
    last_interaction_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("leads").insert(payload).select("*").single();
  if (error) throw error;
  await logLeadEvent(data.id, "criado", "Lead criado.").catch(() => {});
  return data;
}

export async function updateLead(id: string, input: Partial<LeadInput>): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({ ...input, last_interaction_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

const STAGE_EVENT_LABEL: Record<string, string> = {
  lead_novo: "Movido para Lead Novo.",
  conversando: "Iniciou conversa (Conversando).",
  reuniao: "Reunião agendada.",
  proposta: "Proposta enviada.",
  ganho: "Negócio ganho! 🎉",
  perdido: "Lead marcado como perdido.",
  follow_up: "Movido para Follow-up.",
  sem_interesse: "Marcado como sem interesse.",
};

export async function moveLeadStage(
  lead: Lead,
  to: LeadStage,
  extra?: { reuniao_at?: string | null; meet_link?: string | null; proxima_acao?: string | null },
): Promise<Lead> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Não autenticado");

  const patch: Partial<Lead> = {
    stage: to,
    last_interaction_at: new Date().toISOString(),
  };

  if (to === "follow_up") {
    patch.followup_stage = lead.followup_stage ?? "followup_1";
    patch.sem_interesse_at = null;
  } else if (to === "sem_interesse") {
    patch.sem_interesse_at = new Date().toISOString();
    patch.followup_stage = null;
  } else {
    patch.followup_stage = null;
    patch.sem_interesse_at = null;
  }

  if (extra?.reuniao_at !== undefined) patch.reuniao_at = extra.reuniao_at;
  if (extra?.meet_link !== undefined) patch.meet_link = extra.meet_link ?? "";
  if (extra?.proxima_acao !== undefined) patch.proxima_acao = extra.proxima_acao ?? "";

  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", lead.id)
    .select("*")
    .single();
  if (error) throw error;

  // log movement + timeline event (best-effort)
  if (lead.stage !== to) {
    await supabase.from("lead_movements").insert({
      lead_id: lead.id,
      user_id: uid,
      from_stage: lead.stage,
      to_stage: to,
    });
    let desc = STAGE_EVENT_LABEL[to] ?? `Movido para ${to}.`;
    if (to === "reuniao" && extra?.reuniao_at) {
      desc = `Reunião agendada para ${new Date(extra.reuniao_at).toLocaleString("pt-BR")}.`;
    }
    await logLeadEvent(lead.id, "movimentacao", desc).catch(() => {});
  }
  return data;
}

export async function moveFollowupStage(lead: Lead, to: FollowupStage): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({ followup_stage: to, last_interaction_at: new Date().toISOString() })
    .eq("id", lead.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listNotes(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addNote(leadId: string, conteudo: string, autorNome: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase.from("lead_notes").insert({
    lead_id: leadId,
    user_id: uid,
    autor_nome: autorNome,
    conteudo,
  });
  if (error) throw error;
}

export async function listMovements(leadId: string): Promise<LeadMovement[]> {
  const { data, error } = await supabase
    .from("lead_movements")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type TeamMetric = {
  user_id: string;
  nome: string;
  total_leads: number;
  ganhos: number;
  propostas: number;
  perdidos: number;
  reunioes: number;
  faturamento_ganho: number;
};

export async function getTeamMetrics(): Promise<TeamMetric[]> {
  const { data, error } = await supabase.rpc("get_team_metrics");
  if (error) throw error;
  return (data ?? []) as TeamMetric[];
}

// ---------- Timeline events ----------
export async function logLeadEvent(leadId: string, tipo: string, descricao: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  let autor = "";
  if (uid) {
    const { data: prof } = await supabase.from("profiles").select("nome").eq("id", uid).maybeSingle();
    autor = prof?.nome ?? "";
  }
  const { error } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    user_id: uid ?? null,
    autor_nome: autor,
    tipo,
    descricao,
  });
  if (error) throw error;
}

export async function listEvents(leadId: string): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from("lead_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Recent activity feed across all leads the user can see (RLS scoped). */
export async function listRecentEvents(limit = 15): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from("lead_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------- Files ----------
const FILES_BUCKET = "lead-files";

export async function listFiles(leadId: string): Promise<LeadFile[]> {
  const { data, error } = await supabase
    .from("lead_files")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadLeadFile(leadId: string, file: File, categoria: string): Promise<LeadFile> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${leadId}/${Date.now()}-${safeName}`;
  const up = await supabase.storage.from(FILES_BUCKET).upload(path, file, { upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from("lead_files")
    .insert({
      lead_id: leadId,
      user_id: uid,
      nome: file.name,
      categoria,
      path,
      tamanho: file.size,
      mime: file.type,
    })
    .select("*")
    .single();
  if (error) throw error;
  await logLeadEvent(leadId, "arquivo", `Arquivo anexado: ${file.name}`).catch(() => {});
  return data;
}

export async function getFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteLeadFile(f: LeadFile): Promise<void> {
  await supabase.storage.from(FILES_BUCKET).remove([f.path]);
  const { error } = await supabase.from("lead_files").delete().eq("id", f.id);
  if (error) throw error;
}

// ---------- Team members (for responsável selector) ----------
export type Member = { id: string; nome: string; email: string };

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from("profiles").select("id, nome, email").order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

