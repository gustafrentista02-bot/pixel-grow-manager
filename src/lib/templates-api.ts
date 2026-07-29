/**
 * Após a simplificação do CRM, este arquivo mantém apenas o registro de
 * "propostas enviadas" (histórico comercial). Bibliotecas de modelos de
 * proposta e modelos de mensagem foram removidas.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProposalSend = Tables<"proposal_sends">;

export const PROPOSAL_SEND_STATUS = [
  { value: "enviada", label: "Enviada", color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
  { value: "visualizada", label: "Visualizada", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
  { value: "aceita", label: "Aceita", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  { value: "recusada", label: "Recusada", color: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
  { value: "expirada", label: "Expirada", color: "text-zinc-300 border-zinc-500/30 bg-zinc-500/10" },
] as const;

export type ProposalSendInput = {
  lead_id: string;
  proposal_id?: string | null;
  nome: string;
  valor: number;
  status: string;
  observacao: string;
};

export async function listProposalSends(leadId: string): Promise<ProposalSend[]> {
  const { data, error } = await supabase
    .from("proposal_sends")
    .select("*")
    .eq("lead_id", leadId)
    .order("enviada_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProposalSend(input: ProposalSendInput): Promise<ProposalSend> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const payload = {
    lead_id: input.lead_id,
    proposal_id: input.proposal_id ?? null,
    nome: input.nome,
    valor: input.valor,
    status: input.status,
    observacao: input.observacao,
    owner_id: uid,
  };
  const { data, error } = await supabase
    .from("proposal_sends")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProposalSend(id: string, input: Partial<ProposalSendInput>): Promise<ProposalSend> {
  const { data, error } = await supabase
    .from("proposal_sends")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProposalSend(id: string): Promise<void> {
  const { error } = await supabase.from("proposal_sends").delete().eq("id", id);
  if (error) throw error;
}
