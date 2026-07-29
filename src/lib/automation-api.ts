import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ScheduledMessage = Tables<"scheduled_messages">;
export type Cadence = Tables<"cadences">;
export type CadenceStep = Tables<"cadence_steps">;
export type CadenceEnrollment = Tables<"cadence_enrollments">;

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Não autenticado");
  return uid;
}

// ---------- Scheduled messages ----------
export async function listScheduledMessages(): Promise<ScheduledMessage[]> {
  const { data, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .order("enviar_em", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createScheduledMessage(input: {
  lead_id: string;
  mensagem: string;
  enviar_em: string;
}): Promise<ScheduledMessage> {
  const owner_id = await getUid();
  const payload: TablesInsert<"scheduled_messages"> = { ...input, owner_id };
  const { data, error } = await supabase.from("scheduled_messages").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function cancelScheduledMessage(id: string): Promise<void> {
  const { error } = await supabase.from("scheduled_messages").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Cadences ----------
export async function listCadences(): Promise<Cadence[]> {
  const { data, error } = await supabase.from("cadences").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listCadenceSteps(cadence_id: string): Promise<CadenceStep[]> {
  const { data, error } = await supabase
    .from("cadence_steps")
    .select("*")
    .eq("cadence_id", cadence_id)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCadence(
  nome: string,
  compartilhada = false,
  parar_ao_responder = true,
): Promise<Cadence> {
  const owner_id = await getUid();
  const { data, error } = await supabase
    .from("cadences")
    .insert({ nome, owner_id, compartilhada, parar_ao_responder })
    .select("*")
    .single();
  if (error) throw error;
  if (data?.id) {
    return {
      ...data,
      compartilhada: data.compartilhada ?? false,
      parar_ao_responder: data.parar_ao_responder ?? true,
      ativa: data.ativa ?? true,
    } as Cadence;
  }
  // Fallback: se por algum motivo o insert não retornou a linha completa,
  // busca pelo owner_id + nome mais recente para hidratar o objeto.
  const { data: fetched, error: fetchErr } = await supabase
    .from("cadences")
    .select("*")
    .eq("owner_id", owner_id)
    .eq("nome", nome)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!fetched?.id) {
    throw new Error("A cadência foi criada, mas não foi possível carregar seus dados.");
  }
  return {
    ...fetched,
    compartilhada: fetched.compartilhada ?? false,
    parar_ao_responder: fetched.parar_ao_responder ?? true,
    ativa: fetched.ativa ?? true,
  } as Cadence;
}

export async function updateCadence(
  id: string,
  input: Partial<Pick<Cadence, "nome" | "ativa" | "compartilhada" | "parar_ao_responder">>,
): Promise<void> {
  const { error } = await supabase.from("cadences").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteCadence(id: string): Promise<void> {
  const { error } = await supabase.from("cadences").delete().eq("id", id);
  if (error) throw error;
}

export async function saveCadenceSteps(
  cadence_id: string,
  steps: { delay_dias: number; horario: string; mensagem: string }[],
): Promise<void> {
  // Validação client-side (o banco é a última barreira via RPC transacional)
  if (steps.length === 0) throw new Error("Adicione pelo menos uma etapa.");
  const HHmm = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
  steps.forEach((s, i) => {
    if (!Number.isInteger(s.delay_dias) || s.delay_dias < 0) {
      throw new Error(`Etapa ${i + 1}: dias deve ser inteiro ≥ 0.`);
    }
    if (!HHmm.test(s.horario ?? "")) {
      throw new Error(`Etapa ${i + 1}: horário inválido (use HH:mm).`);
    }
    const msg = (s.mensagem ?? "").trim();
    if (!msg) throw new Error(`Etapa ${i + 1}: mensagem vazia.`);
    if (msg.length > 4000) throw new Error(`Etapa ${i + 1}: mensagem excede 4000 caracteres.`);
  });
  // Substituição transacional (delete + insert dentro da mesma tx no banco)
  const { error } = await supabase.rpc("replace_cadence_steps", {
    p_cadence_id: cadence_id,
    p_steps: steps.map((s) => ({
      delay_dias: s.delay_dias,
      horario: s.horario,
      mensagem: s.mensagem,
    })),
  });
  if (error) throw error;
}

// ---------- Enrollments ----------
export async function listEnrollments(): Promise<CadenceEnrollment[]> {
  const { data, error } = await supabase
    .from("cadence_enrollments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function getOrgId(uid: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("organization_id").eq("id", uid).single();
  return data?.organization_id ?? null;
}

export type BulkEnrollResult = {
  inseridos: number;
  ignorados_ja_nesta: number;
  ignorados_outra_cadencia: number;
  ignorados_sem_telefone: number;
  erros: number;
  detalhes: Array<{
    lead_id: string | null;
    status: "adicionado" | "ja_inscrito" | "outra_cadencia" | "sem_telefone" | "erro";
    message: string;
    enrollment_id: string | null;
    next_send_at: string | null;
  }>;
};

export async function enrollLeads(cadence_id: string, lead_ids: string[]): Promise<BulkEnrollResult> {
  const empty: BulkEnrollResult = {
    inseridos: 0, ignorados_ja_nesta: 0, ignorados_outra_cadencia: 0,
    ignorados_sem_telefone: 0, erros: 0, detalhes: [],
  };
  if (lead_ids.length === 0) return empty;

  const { data, error } = await supabase.rpc("enroll_leads_in_cadence", {
    p_cadence_id: cadence_id,
    p_lead_ids: lead_ids,
  });
  if (error) throw error;

  const rows = (data ?? []) as BulkEnrollResult["detalhes"];
  const summary: BulkEnrollResult = { ...empty, detalhes: rows };
  for (const r of rows) {
    if (r.status === "adicionado") summary.inseridos++;
    else if (r.status === "ja_inscrito") summary.ignorados_ja_nesta++;
    else if (r.status === "outra_cadencia") summary.ignorados_outra_cadencia++;
    else if (r.status === "sem_telefone") summary.ignorados_sem_telefone++;
    else summary.erros++;
  }
  return summary;
}

export async function enrollLead(cadence_id: string, lead_id: string): Promise<void> {
  const r = await enrollLeads(cadence_id, [lead_id]);
  if (r.inseridos === 0) {
    if (r.ignorados_ja_nesta > 0) throw new Error("Lead já está nesta cadência.");
    if (r.ignorados_outra_cadencia > 0) throw new Error("Lead já participa de outra cadência ativa.");
    if (r.ignorados_sem_telefone > 0) throw new Error("Lead sem telefone/WhatsApp para envio.");
    const firstErr = r.detalhes.find((d) => d.status === "erro")?.message;
    throw new Error(firstErr || "Não foi possível inscrever o lead.");
  }
}

export async function cancelEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("cadence_enrollments")
    .update({ status: "cancelada", next_send_at: null })
    .eq("id", id);
  if (error) throw error;
}

/** Retoma uma inscrição pausada por resposta: recalcula next_send_at para a próxima etapa pendente. */
export async function resumeEnrollment(id: string): Promise<void> {
  const { data: enr, error: e1 } = await supabase
    .from("cadence_enrollments")
    .select("*")
    .eq("id", id)
    .single();
  if (e1) throw e1;
  const steps = await listCadenceSteps(enr.cadence_id);
  const next = steps[enr.current_step];
  if (!next) {
    const { error } = await supabase
      .from("cadence_enrollments")
      .update({ status: "concluida", next_send_at: null })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  // Cálculo canônico do próximo envio no banco (fuso America/Sao_Paulo).
  const { data: nextTs, error: eCalc } = await supabase.rpc("compute_next_send_at", {
    p_delay_dias: next.delay_dias,
    p_horario: next.horario,
  });
  if (eCalc) throw eCalc;
  const { error } = await supabase
    .from("cadence_enrollments")
    .update({ status: "ativa", next_send_at: nextTs as unknown as string })
    .eq("id", id);
  if (error) throw error;
}
