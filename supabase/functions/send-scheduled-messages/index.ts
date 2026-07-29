// Cron-triggered: envia mensagens avulsas agendadas e avança cadências ativas.
// Robustez: claim atômico (evita envio duplicado), cálculo de horário no fuso
// America/Sao_Paulo via RPC, respeito a cadência pausada/inativa, limite de
// tentativas, cota por organização contabilizada dentro do lote.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/+$/, "");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

const BATCH_SIZE = 50;
const MAX_RETRIES = 5;
const RETRY_MINUTES = 30;
const QUOTA_RETRY_HOURS = 6;
const SEND_TIMEOUT_MS = 20_000;
const STOP_STAGES = new Set(["ganho", "perdido", "sem_interesse"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------- Autenticação do cron ----------
// verify_jwt = false é intencional: quem chama é o pg_cron, que não possui
// sessão de usuário. A autenticação é feita EXCLUSIVAMENTE pelo segredo
// guardado no Supabase Vault (pixel_crm_cron_secret) e validado no banco pela
// RPC privada public.verify_cron_secret. O segredo nunca é lido pela função,
// nunca é logado e não existe em variável de ambiente.
const CRON_HEADER = "x-cron-secret";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}



const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function fillTemplate(text: string, lead: Record<string, unknown>): string {
  const nome = String(lead.nome ?? "").trim().split(/\s+/)[0] ?? "";
  const vars: Record<string, string> = {
    nome,
    nome_completo: String(lead.nome ?? ""),
    empresa: String(lead.empresa ?? ""),
    cidade: String(lead.cidade ?? ""),
    uf: String(lead.uf ?? ""),
  };
  return text.replace(/\{([a-z_]+)\}/gi, (_, k) => vars[String(k).toLowerCase()] ?? `{${k}}`);
}

function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  // Precisa de DDD + número (10~11 dígitos) ou já vir com DDI 55.
  if (digits.length < 10 || digits.length > 13) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** Extrai o contador de tentativas guardado no texto do erro. */
function readAttempts(erro: string | null | undefined): number {
  const m = /^\[tentativa (\d+)\]/.exec(erro ?? "");
  return m ? parseInt(m[1], 10) : 0;
}
function stampAttempts(n: number, msg: string): string {
  return `[tentativa ${n}] ${msg}`.slice(0, 900);
}

// ---------- WhatsApp (Evolution) ----------
const instanceCache = new Map<string, { name: string; connected: boolean } | null>();

async function getInstanceForOwner(ownerId: string) {
  if (instanceCache.has(ownerId)) return instanceCache.get(ownerId)!;
  const { data } = await supabase
    .from("whatsapp_instances")
    .select("instance_name, status")
    .eq("owner_id", ownerId)
    .limit(1)
    .maybeSingle();
  const result = data ? { name: data.instance_name as string, connected: data.status === "conectado" } : null;
  instanceCache.set(ownerId, result);
  return result;
}

type SendResult = { ok: boolean; error?: string; permanent?: boolean };

async function sendWhatsApp(ownerId: string, phone: string, text: string): Promise<SendResult> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { ok: false, error: "Evolution API não configurada (URL/KEY ausentes)." };
  }
  if (!text.trim()) return { ok: false, error: "Mensagem vazia.", permanent: true };
  const inst = await getInstanceForOwner(ownerId);
  if (!inst) return { ok: false, error: "Usuário sem WhatsApp conectado.", permanent: true };
  if (!inst.connected) return { ok: false, error: "WhatsApp do usuário está desconectado." };
  const number = normalizePhone(phone);
  if (!number) return { ok: false, error: "Lead sem telefone válido.", permanent: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(inst.name)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number, text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // 4xx (exceto 429) = erro de requisição, não adianta repetir indefinidamente.
      const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
      return { ok: false, error: `Evolution ${res.status}: ${body.slice(0, 300)}`, permanent };
    }
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).name === "AbortError" ? "Timeout ao chamar Evolution API." : (e as Error).message;
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function logEvent(leadId: string, userId: string, tipo: string, descricao: string) {
  const { error } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    user_id: userId,
    autor_nome: "Automação",
    tipo,
    descricao: descricao.slice(0, 1000),
  });
  if (error) console.error("logEvent falhou:", error.message);
}

// ---------- Cota mensal ----------
function currentAnoMes(): string {
  // Mês de referência no fuso comercial (America/Sao_Paulo).
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return parts.slice(0, 7);
}

type OrgQuota = { orgId: string | null; limite: number; total: number };
const quotaCache = new Map<string, OrgQuota>();

async function loadQuota(userId: string): Promise<OrgQuota> {
  if (quotaCache.has(userId)) return quotaCache.get(userId)!;
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();
  const orgId = (profile?.organization_id as string | null) ?? null;
  if (!orgId) {
    const q = { orgId: null, limite: 0, total: 0 };
    quotaCache.set(userId, q);
    return q;
  }
  const [{ data: org }, { data: usage }] = await Promise.all([
    supabase.from("organizations").select("limite_mensagens_mes").eq("id", orgId).maybeSingle(),
    supabase
      .from("message_usage")
      .select("total_enviadas")
      .eq("organization_id", orgId)
      .eq("ano_mes", currentAnoMes())
      .maybeSingle(),
  ]);
  const q: OrgQuota = {
    orgId,
    limite: (org?.limite_mensagens_mes as number) ?? 0,
    total: (usage?.total_enviadas as number) ?? 0,
  };
  quotaCache.set(userId, q);
  return q;
}

function quotaExceeded(q: OrgQuota): boolean {
  return q.limite > 0 && q.total >= q.limite;
}

async function persistUsage(q: OrgQuota) {
  if (!q.orgId) return;
  q.total += 1; // contabiliza no lote atual (evita ultrapassar o limite dentro da mesma execução)
  const anoMes = currentAnoMes();
  const { error } = await supabase
    .from("message_usage")
    .upsert(
      { organization_id: q.orgId, ano_mes: anoMes, total_enviadas: q.total },
      { onConflict: "organization_id,ano_mes" },
    );
  if (error) console.error("persistUsage falhou:", error.message);
}

// ---------- Agendamento canônico (fuso America/Sao_Paulo) ----------
async function computeNextSend(delayDias: number, horario: string): Promise<string> {
  const { data, error } = await supabase.rpc("compute_next_send_at", {
    p_delay_dias: delayDias ?? 0,
    p_horario: horario,
  });
  if (!error && data) return data as unknown as string;
  console.error("compute_next_send_at falhou, usando fallback:", error?.message);
  const [h, m] = String(horario ?? "09:00").split(":").map((n) => parseInt(n, 10));
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + (delayDias || 0));
  d.setUTCHours((Number.isFinite(h) ? h : 9) + 3, Number.isFinite(m) ? m : 0, 0, 0);
  return d.toISOString();
}

// ---------- Mensagens avulsas ----------
async function processScheduledMessages() {
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from("scheduled_messages")
    .select("*, leads(*)")
    .eq("status", "pendente")
    .lte("enviar_em", nowIso)
    .order("enviar_em", { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw error;

  let enviadas = 0;
  let falhas = 0;

  for (const row of rows ?? []) {
    // Claim atômico: só processa se ainda estiver 'pendente'.
    const { data: claimed } = await supabase
      .from("scheduled_messages")
      .update({ status: "processando", updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();
    if (!claimed) continue; // outra execução já pegou

    const lead = (row as any).leads;
    const attempts = readAttempts(row.erro) + 1;

    const fail = async (msg: string, permanent: boolean) => {
      falhas++;
      const giveUp = permanent || attempts >= MAX_RETRIES;
      await supabase
        .from("scheduled_messages")
        .update({
          status: giveUp ? "erro" : "pendente",
          erro: stampAttempts(attempts, msg),
          ...(giveUp ? {} : { enviar_em: new Date(Date.now() + RETRY_MINUTES * 60_000).toISOString() }),
        })
        .eq("id", row.id);
    };

    if (!lead) {
      await fail("Lead não encontrado", true);
      continue;
    }

    const quota = await loadQuota(row.owner_id);
    if (quotaExceeded(quota)) {
      await fail("Limite mensal de mensagens do plano atingido", false);
      continue;
    }

    const text = fillTemplate(row.mensagem, lead);
    const result = await sendWhatsApp(row.owner_id, lead.whatsapp || lead.telefone, text);
    if (!result.ok) {
      await fail(result.error ?? "erro", !!result.permanent);
      continue;
    }

    await supabase
      .from("scheduled_messages")
      .update({ status: "enviada", enviado_em: new Date().toISOString(), erro: "" })
      .eq("id", row.id);
    await persistUsage(quota);
    await logEvent(lead.id, row.owner_id, "mensagem_automatica", `WhatsApp enviado (avulsa): ${text.slice(0, 140)}`);
    enviadas++;
  }

  return { enviadas, falhas, lidas: rows?.length ?? 0 };
}

// ---------- Cadências ----------
async function processCadences() {
  const nowIso = new Date().toISOString();
  const { data: enrolls, error } = await supabase
    .from("cadence_enrollments")
    .select("*, leads(*), cadences(nome, ativa, parar_ao_responder)")
    .eq("status", "ativa")
    .not("next_send_at", "is", null)
    .lte("next_send_at", nowIso)
    .order("next_send_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw error;

  let enviadas = 0;
  let falhas = 0;

  for (const enr of enrolls ?? []) {
    const lead = (enr as any).leads;
    const cadence = (enr as any).cadences;
    const cadenceName = cadence?.nome ?? "";

    // Claim atômico da inscrição (bloqueia a janela até o próximo passo).
    const claimUntil = new Date(Date.now() + RETRY_MINUTES * 60_000).toISOString();
    const { data: claimed } = await supabase
      .from("cadence_enrollments")
      .update({ next_send_at: claimUntil })
      .eq("id", enr.id)
      .eq("status", "ativa")
      .eq("current_step", enr.current_step)
      .lte("next_send_at", nowIso)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const stop = async (status: string, motivo?: string) => {
      await supabase
        .from("cadence_enrollments")
        .update({ status, next_send_at: null })
        .eq("id", enr.id);
      if (motivo && lead) await logEvent(lead.id, enr.owner_id, "erro_automacao", `Cadência "${cadenceName}": ${motivo}`);
    };
    const retryLater = async (minutes: number) => {
      await supabase
        .from("cadence_enrollments")
        .update({ next_send_at: new Date(Date.now() + minutes * 60_000).toISOString() })
        .eq("id", enr.id);
    };

    if (!lead) {
      await stop("erro");
      continue;
    }
    if (!cadence || cadence.ativa === false) {
      await retryLater(60); // cadência pausada pelo usuário: reavalia mais tarde
      continue;
    }
    if (STOP_STAGES.has(String(lead.stage ?? ""))) {
      await stop("concluida", `encerrada porque o lead está em "${lead.stage}"`);
      continue;
    }

    const { data: steps } = await supabase
      .from("cadence_steps")
      .select("*")
      .eq("cadence_id", enr.cadence_id)
      .order("ordem", { ascending: true });

    const current = steps?.[enr.current_step];
    if (!current) {
      await stop("concluida");
      continue;
    }

    const quota = await loadQuota(enr.owner_id);
    if (quotaExceeded(quota)) {
      await logEvent(lead.id, enr.owner_id, "erro_automacao", `Cadência "${cadenceName}": limite mensal de mensagens atingido`);
      await retryLater(QUOTA_RETRY_HOURS * 60);
      falhas++;
      continue;
    }

    const text = fillTemplate(current.mensagem, lead);
    const result = await sendWhatsApp(enr.owner_id, lead.whatsapp || lead.telefone, text);

    if (!result.ok) {
      falhas++;
      await logEvent(lead.id, enr.owner_id, "erro_automacao", `Cadência "${cadenceName}": ${result.error}`);
      if (result.permanent) await stop("erro");
      else await retryLater(RETRY_MINUTES);
      continue;
    }

    const nextIdx = enr.current_step + 1;
    const nextStep = steps?.[nextIdx];
    const patch: Record<string, unknown> = { current_step: nextIdx };
    if (nextStep) {
      patch.next_send_at = await computeNextSend(nextStep.delay_dias, nextStep.horario);
    } else {
      patch.status = "concluida";
      patch.next_send_at = null;
    }
    await supabase.from("cadence_enrollments").update(patch).eq("id", enr.id);
    await persistUsage(quota);
    await logEvent(
      lead.id,
      enr.owner_id,
      "mensagem_automatica",
      `Cadência "${cadenceName}" · etapa ${enr.current_step + 1}: ${text.slice(0, 120)}`,
    );
    enviadas++;
  }

  return { enviadas, falhas, lidas: enrolls?.length ?? 0 };
}

/** Devolve à fila itens que ficaram presos em "processando" (crash/timeout). */
async function recoverStuck() {
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const { error } = await supabase
    .from("scheduled_messages")
    .update({ status: "pendente" })
    .eq("status", "processando")
    .lt("updated_at", cutoff);
  if (error) console.error("recoverStuck falhou:", error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // 1) Método: apenas POST processa a fila.
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método não permitido. Use POST." }, 405);
  }

  // 2) Fail-closed: sem segredo configurado no ambiente, nada é processado.
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!expectedSecret) {
    console.error("send-scheduled-messages: CRON_SECRET ausente no ambiente; requisição recusada.");
    return jsonResponse({ ok: false, error: "Serviço não configurado." }, 503);
  }

  // 3) Segredo do cron (nunca logado, nunca devolvido).
  const receivedSecret = req.headers.get(CRON_HEADER);
  if (!receivedSecret || !safeCompare(receivedSecret, expectedSecret)) {
    console.warn("send-scheduled-messages: chamada não autorizada recusada.");
    return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
  }

  // Só a partir daqui a fila é tocada.
  const started = Date.now();
  try {
    instanceCache.clear();
    quotaCache.clear();
    await recoverStuck();

    const scheduled = await processScheduledMessages();
    const cadences = await processCadences();
    const payload = { ok: true, ms: Date.now() - started, scheduled, cadences };
    console.log("send-scheduled-messages:", JSON.stringify(payload));
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-scheduled-messages falhou:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
