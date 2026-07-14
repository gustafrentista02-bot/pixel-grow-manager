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

export async function createCadence(nome: string): Promise<Cadence> {
  const owner_id = await getUid();
  const { data, error } = await supabase
    .from("cadences")
    .insert({ nome, owner_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCadence(id: string, input: Partial<Pick<Cadence, "nome" | "ativa">>): Promise<void> {
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
  // Substitui todas as etapas
  const { error: delErr } = await supabase.from("cadence_steps").delete().eq("cadence_id", cadence_id);
  if (delErr) throw delErr;
  if (steps.length === 0) return;
  const rows: TablesInsert<"cadence_steps">[] = steps.map((s, i) => ({
    cadence_id,
    ordem: i,
    delay_dias: s.delay_dias,
    horario: s.horario,
    mensagem: s.mensagem,
  }));
  const { error } = await supabase.from("cadence_steps").insert(rows);
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

export async function enrollLead(cadence_id: string, lead_id: string): Promise<CadenceEnrollment> {
  const owner_id = await getUid();
  const steps = await listCadenceSteps(cadence_id);
  if (steps.length === 0) throw new Error("Cadência sem etapas");
  const first = steps[0];
  const next_send_at = computeNextSend(first.delay_dias, first.horario);
  const { data, error } = await supabase
    .from("cadence_enrollments")
    .insert({ owner_id, cadence_id, lead_id, current_step: 0, next_send_at, status: "ativa" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("cadence_enrollments")
    .update({ status: "cancelada", next_send_at: null })
    .eq("id", id);
  if (error) throw error;
}
