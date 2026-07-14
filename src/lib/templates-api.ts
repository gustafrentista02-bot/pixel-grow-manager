import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProposalTemplate = Tables<"proposal_templates">;
export type MessageTemplate = Tables<"message_templates">;
export type ProposalSend = Tables<"proposal_sends">;

export type ProposalType = "pdf" | "link" | "documento";

export const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  pdf: "PDF",
  link: "Link",
  documento: "Documento",
};

export type ProposalInput = {
  nome: string;
  tipo: string;
  url: string;
  conteudo: string;
  favorito?: boolean;
};

export type MessageCategory =
  | "primeiro_contato"
  | "followup_1"
  | "followup_2"
  | "followup_3"
  | "followup_4"
  | "pos_reuniao"
  | "envio_proposta"
  | "outro";

export const MESSAGE_CATEGORY_LABELS: Record<MessageCategory, string> = {
  primeiro_contato: "Primeiro Contato",
  followup_1: "Follow-up 1",
  followup_2: "Follow-up 2",
  followup_3: "Follow-up 3",
  followup_4: "Follow-up 4",
  pos_reuniao: "Pós-Reunião",
  envio_proposta: "Envio de Proposta",
  outro: "Outro",
};

export type MessageInput = {
  nome: string;
  categoria: string;
  conteudo: string;
  favorito?: boolean;
};

// ---- Proposal templates ----
export async function listProposals(): Promise<ProposalTemplate[]> {
  const { data, error } = await supabase
    .from("proposal_templates")
    .select("*")
    .order("favorito", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createProposal(input: ProposalInput): Promise<ProposalTemplate> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("proposal_templates")
    .insert({ ...input, owner_id: uid })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProposal(id: string, input: Partial<ProposalInput>): Promise<ProposalTemplate> {
  const { data, error } = await supabase
    .from("proposal_templates")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.from("proposal_templates").delete().eq("id", id);
  if (error) throw error;
}

// ---- Message templates ----
export async function listMessages(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .order("favorito", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createMessage(input: MessageInput): Promise<MessageTemplate> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("message_templates")
    .insert({ ...input, owner_id: uid })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateMessage(id: string, input: Partial<MessageInput>): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from("message_templates")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  if (error) throw error;
}

// ---- Proposal sends (tracking) ----
export const PROPOSAL_SEND_STATUS = [
  { value: "enviada", label: "Enviada", color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
  { value: "visualizada", label: "Visualizada", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
  { value: "aceita", label: "Aceita", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  { value: "recusada", label: "Recusada", color: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
  { value: "expirada", label: "Expirada", color: "text-zinc-300 border-zinc-500/30 bg-zinc-500/10" },
] as const;

export type ProposalSendInput = {
  lead_id: string;
  proposal_id: string | null;
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
  const { data, error } = await supabase
    .from("proposal_sends")
    .insert({ ...input, owner_id: uid })
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
