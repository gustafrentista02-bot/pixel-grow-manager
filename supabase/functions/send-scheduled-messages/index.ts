// Cron-triggered: envia mensagens avulsas agendadas e avança cadências ativas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function fillTemplate(text: string, lead: Record<string, unknown>): string {
  const nome = String(lead.nome ?? "").split(" ")[0] ?? "";
  const vars: Record<string, string> = {
    nome,
    nome_completo: String(lead.nome ?? ""),
    empresa: String(lead.empresa ?? ""),
    cidade: String(lead.cidade ?? ""),
    uf: String(lead.uf ?? ""),
  };
  return text.replace(/\{([a-z_]+)\}/gi, (_, k) => vars[k.toLowerCase()] ?? `{${k}}`);
}

function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

async function getInstanceForOwner(ownerId: string): Promise<{ name: string; connected: boolean } | null> {
  const { data } = await supabase
    .from("whatsapp_instances")
    .select("instance_name, status")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!data) return null;
  return { name: data.instance_name, connected: data.status === "conectado" };
}

async function sendWhatsApp(ownerId: string, phone: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { ok: false, error: "Evolution API não configurada (URL/KEY ausentes)." };
  }
  const inst = await getInstanceForOwner(ownerId);
  if (!inst) return { ok: false, error: "Usuário sem WhatsApp conectado." };
  if (!inst.connected) return { ok: false, error: "WhatsApp do usuário está desconectado." };
  const number = normalizePhone(phone);
  if (!number) return { ok: false, error: "Lead sem telefone válido." };
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${inst.name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Evolution ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function logEvent(leadId: string, userId: string, tipo: string, descricao: string) {
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    user_id: userId,
    autor_nome: "Automação",
    tipo,
    descricao,
  });
}

function currentAnoMes(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getOrgIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
  return (data?.organization_id as string) ?? null;
}

// Retorna { ok: true } se pode enviar; { ok: false, error } se atingiu limite.
async function checkAndReserveQuota(userId: string): Promise<{ ok: boolean; orgId: string | null; error?: string }> {
  const orgId = await getOrgIdForUser(userId);
  if (!orgId) return { ok: true, orgId: null };
  const { data: org } = await supabase
    .from("organizations")
    .select("limite_mensagens_mes")
    .eq("id", orgId)
    .maybeSingle();
  const limite = (org?.limite_mensagens_mes as number) ?? 0;
  const anoMes = currentAnoMes();
  const { data: usage } = await supabase
    .from("message_usage")
    .select("total_enviadas")
    .eq("organization_id", orgId)
    .eq("ano_mes", anoMes)
    .maybeSingle();
  const total = (usage?.total_enviadas as number) ?? 0;
  if (limite > 0 && total >= limite) {
    return { ok: false, orgId, error: "Limite mensal de mensagens do plano atingido" };
  }
  return { ok: true, orgId };
}

async function incrementUsage(orgId: string | null) {
  if (!orgId) return;
  const anoMes = currentAnoMes();
  const { data: existing } = await supabase
    .from("message_usage")
    .select("total_enviadas")
    .eq("organization_id", orgId)
    .eq("ano_mes", anoMes)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("message_usage")
      .update({ total_enviadas: (existing.total_enviadas as number) + 1 })
      .eq("organization_id", orgId)
      .eq("ano_mes", anoMes);
  } else {
    await supabase.from("message_usage").insert({ organization_id: orgId, ano_mes: anoMes, total_enviadas: 1 });
  }
}

function computeNextSend(delayDias: number, horario: string, from: Date): Date {
  const [h, m] = horario.split(":").map((n) => parseInt(n, 10));
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + (delayDias || 0));
  // horario em -03 (BRT). Convertendo pra UTC = horario + 3
  d.setUTCHours((h ?? 9) + 3, m ?? 0, 0, 0);
  return d;
}

async function processScheduledMessages() {
  const nowIso = new Date().toISOString();
  const { data: rows } = await supabase
    .from("scheduled_messages")
    .select("*, leads(*)")
    .eq("status", "pendente")
    .lte("enviar_em", nowIso)
    .limit(50);
  let processed = 0;
  for (const row of rows ?? []) {
    const lead = (row as any).leads;
    if (!lead) {
      await supabase.from("scheduled_messages").update({ status: "erro", erro: "Lead não encontrado" }).eq("id", row.id);
      continue;
    }
    const phone = lead.whatsapp || lead.telefone;
    const text = fillTemplate(row.mensagem, lead);
    const quota = await checkAndReserveQuota(row.owner_id);
    if (!quota.ok) {
      await supabase.from("scheduled_messages").update({ status: "erro", erro: quota.error ?? "limite" }).eq("id", row.id);
      processed++;
      continue;
    }
    const result = await sendWhatsApp(row.owner_id, phone, text);
    if (result.ok) {
      await supabase.from("scheduled_messages").update({
        status: "enviada", enviado_em: new Date().toISOString(), erro: "",
      }).eq("id", row.id);
      await incrementUsage(quota.orgId);
      await logEvent(lead.id, row.owner_id, "mensagem_automatica", `WhatsApp enviado (avulsa): ${text.slice(0, 140)}`);
    } else {
      await supabase.from("scheduled_messages").update({ status: "erro", erro: result.error ?? "erro" }).eq("id", row.id);
    }
    processed++;
  }
  return processed;
}

async function processCadences() {
  const nowIso = new Date().toISOString();
  const { data: enrolls } = await supabase
    .from("cadence_enrollments")
    .select("*, leads(*), cadences(nome)")
    .eq("status", "ativa")
    .lte("next_send_at", nowIso)
    .limit(50);
  let processed = 0;
  for (const enr of enrolls ?? []) {
    const lead = (enr as any).leads;
    const cadenceName = (enr as any).cadences?.nome ?? "";
    if (!lead) {
      await supabase.from("cadence_enrollments").update({ status: "erro" }).eq("id", enr.id);
      continue;
    }
    // buscar etapa atual
    const { data: steps } = await supabase
      .from("cadence_steps")
      .select("*")
      .eq("cadence_id", enr.cadence_id)
      .order("ordem", { ascending: true });
    const current = steps?.[enr.current_step];
    if (!current) {
      await supabase.from("cadence_enrollments").update({ status: "concluida", next_send_at: null }).eq("id", enr.id);
      continue;
    }
    const text = fillTemplate(current.mensagem, lead);
    const phone = lead.whatsapp || lead.telefone;
    const quota = await checkAndReserveQuota(enr.owner_id);
    if (!quota.ok) {
      await logEvent(lead.id, enr.owner_id, "erro_automacao", `Cadência "${cadenceName}": ${quota.error}`);
      const retry = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      await supabase.from("cadence_enrollments").update({ next_send_at: retry }).eq("id", enr.id);
      processed++;
      continue;
    }
    const result = await sendWhatsApp(enr.owner_id, phone, text);
    if (result.ok) {
      const nextIdx = enr.current_step + 1;
      const nextStep = steps?.[nextIdx];
      const patch: Record<string, unknown> = { current_step: nextIdx };
      if (nextStep) {
        patch.next_send_at = computeNextSend(nextStep.delay_dias, nextStep.horario, new Date()).toISOString();
      } else {
        patch.status = "concluida";
        patch.next_send_at = null;
      }
      await supabase.from("cadence_enrollments").update(patch).eq("id", enr.id);
      await incrementUsage(quota.orgId);
      await logEvent(
        lead.id,
        enr.owner_id,
        "mensagem_automatica",
        `Cadência "${cadenceName}" · etapa ${enr.current_step + 1}: ${text.slice(0, 120)}`,
      );
    } else {
      await logEvent(lead.id, enr.owner_id, "erro_automacao", `Cadência "${cadenceName}": ${result.error}`);
      // não trava — tenta de novo em 30min
      const retry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await supabase.from("cadence_enrollments").update({ next_send_at: retry }).eq("id", enr.id);
    }
    processed++;
  }
  return processed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const scheduled = await processScheduledMessages();
    const cadences = await processCadences();
    return new Response(JSON.stringify({ ok: true, scheduled, cadences }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
