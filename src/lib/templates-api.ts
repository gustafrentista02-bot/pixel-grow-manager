import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProposalTemplate = Tables<"proposal_templates">;
export type MessageTemplate = Tables<"message_templates">;

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
};

// ---- Proposal templates ----
export async function listProposals(): Promise<ProposalTemplate[]> {
  const { data, error } = await supabase
    .from("proposal_templates")
    .select("*")
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
