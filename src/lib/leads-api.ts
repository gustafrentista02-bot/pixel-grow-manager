import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { LeadStage, FollowupStage } from "@/lib/crm";
import { SEM_INTERESSE_TTL_HOURS } from "@/lib/crm";

export type Lead = Tables<"leads">;
export type LeadNote = Tables<"lead_notes">;
export type LeadMovement = Tables<"lead_movements">;

export type LeadInput = {
  nome: string;
  telefone: string;
  cidade: string;
  uf: string;
  empresa: string;
  segmento: string;
  faturamento_mensal: number;
  valor_contrato: number;
  origem: Lead["origem"];
  observacoes: string;
  stage?: LeadStage;
};

/** Remove leads marked "sem_interesse" older than the TTL. Runs on app load. */
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
    stage: input.stage ?? "lead_novo",
    last_interaction_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("leads").insert(payload).select("*").single();
  if (error) throw error;
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

export async function moveLeadStage(lead: Lead, to: LeadStage): Promise<Lead> {
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

  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", lead.id)
    .select("*")
    .single();
  if (error) throw error;

  // log movement (best-effort)
  if (lead.stage !== to) {
    await supabase.from("lead_movements").insert({
      lead_id: lead.id,
      user_id: uid,
      from_stage: lead.stage,
      to_stage: to,
    });
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
