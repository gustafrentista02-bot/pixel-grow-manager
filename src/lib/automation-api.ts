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

function computeNextSend(delayDias: number, horario: string): string {
  const [h, m] = horario.split(":").map((n) => parseInt(n, 10));
  const d = new Date();
  d.setDate(d.getDate() + (delayDias || 0));
  d.setHours(h ?? 9, m ?? 0, 0, 0);
  // Se ficou no passado (delay=0), agenda pra daqui a 1 min pra próxima execução do cron
  if (d.getTime() < Date.now()) return new Date(Date.now() + 60_000).toISOString();
  return d.toISOString();
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
};

export async function enrollLeads(cadence_id: string, lead_ids: string[]): Promise<BulkEnrollResult> {
  const owner_id = await getUid();
  if (lead_ids.length === 0) {
    return { inseridos: 0, ignorados_ja_nesta: 0, ignorados_outra_cadencia: 0, ignorados_sem_telefone: 0 };
  }

  // Cadência precisa existir, estar ativa e ter etapas
  const { data: cad, error: cadErr } = await supabase
    .from("cadences").select("id, ativa").eq("id", cadence_id).single();
  if (cadErr) throw cadErr;
  if (!cad.ativa) throw new Error("Cadência está pausada. Ative-a antes de inscrever leads.");

  const steps = await listCadenceSteps(cadence_id);
  if (steps.length === 0) throw new Error("Cadência sem etapas. Salve pelo menos uma etapa.");
  const first = steps[0];
  const next_send_at = computeNextSend(first.delay_dias, first.horario);

  // Verifica leads que existem, têm telefone/whatsapp e estão na org (RLS filtra)
  const { data: leads, error: leadsErr } = await supabase
    .from("leads").select("id, telefone, whatsapp").in("id", lead_ids);
  if (leadsErr) throw leadsErr;
  const leadMap = new Map(leads?.map((l) => [l.id, l]) ?? []);

  // Inscrições ativas existentes
  const { data: activeEnr, error: enrErr } = await supabase
    .from("cadence_enrollments")
    .select("lead_id, cadence_id")
    .eq("status", "ativa")
    .in("lead_id", lead_ids);
  if (enrErr) throw enrErr;
  const activeByLead = new Map(activeEnr?.map((e) => [e.lead_id, e.cadence_id]) ?? []);

  let ignorados_sem_telefone = 0;
  let ignorados_ja_nesta = 0;
  let ignorados_outra_cadencia = 0;
  const toInsert: TablesInsert<"cadence_enrollments">[] = [];

  const organization_id = await getOrgId(owner_id);

  for (const lid of lead_ids) {
    const lead = leadMap.get(lid);
    if (!lead) continue;
    if (!(lead.telefone?.trim() || lead.whatsapp?.trim())) {
      ignorados_sem_telefone++;
      continue;
    }
    const activeCad = activeByLead.get(lid);
    if (activeCad === cadence_id) { ignorados_ja_nesta++; continue; }
    if (activeCad) { ignorados_outra_cadencia++; continue; }
    toInsert.push({
      owner_id, cadence_id, lead_id: lid, current_step: 0, next_send_at, status: "ativa",
      organization_id,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("cadence_enrollments").insert(toInsert);
    if (error) throw error;
  }
  return {
    inseridos: toInsert.length,
    ignorados_ja_nesta,
    ignorados_outra_cadencia,
    ignorados_sem_telefone,
  };
}

export async function enrollLead(cadence_id: string, lead_id: string): Promise<void> {
  const r = await enrollLeads(cadence_id, [lead_id]);
  if (r.inseridos === 0) {
    if (r.ignorados_ja_nesta > 0) throw new Error("Lead já está nesta cadência.");
    if (r.ignorados_outra_cadencia > 0) throw new Error("Lead já participa de outra cadência ativa.");
    if (r.ignorados_sem_telefone > 0) throw new Error("Lead sem telefone/WhatsApp para envio.");
    throw new Error("Não foi possível inscrever o lead.");
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
    // sem próximas etapas: marca como concluída
    const { error } = await supabase
      .from("cadence_enrollments")
      .update({ status: "concluida", next_send_at: null })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  const next_send_at = computeNextSend(next.delay_dias, next.horario);
  const { error } = await supabase
    .from("cadence_enrollments")
    .update({ status: "ativa", next_send_at })
    .eq("id", id);
  if (error) throw error;
}
