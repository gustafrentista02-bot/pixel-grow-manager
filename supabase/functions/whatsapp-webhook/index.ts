// Webhook público chamado pela Evolution API quando uma mensagem chega.
// Pausa automaticamente cadências ativas do lead que respondeu, se
// `cadences.parar_ao_responder = true`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/** Compara telefones ignorando DDI/9º dígito: usa os últimos 8 dígitos. */
function phoneMatches(a: string, b: string): boolean {
  const da = onlyDigits(a);
  const db = onlyDigits(b);
  if (!da || !db) return false;
  const tail = 8;
  return da.slice(-tail) === db.slice(-tail);
}

function extractInstanceName(payload: any): string {
  return (
    payload?.instance ??
    payload?.instanceName ??
    payload?.instance_name ??
    payload?.data?.instance ??
    ""
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const event = String(payload?.event ?? "").toLowerCase();
    if (event !== "messages.upsert" && event !== "messages_upsert") {
      return new Response(JSON.stringify({ ok: true, skipped: "event" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = payload?.data ?? {};
    const fromMe = Boolean(data?.key?.fromMe);
    if (fromMe) {
      return new Response(JSON.stringify({ ok: true, skipped: "fromMe" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const instanceName = extractInstanceName(payload);
    if (!instanceName) {
      return new Response(JSON.stringify({ ok: true, skipped: "no instance" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: inst } = await admin
      .from("whatsapp_instances")
      .select("owner_id")
      .eq("instance_name", instanceName)
      .maybeSingle();
    if (!inst) {
      return new Response(JSON.stringify({ ok: true, skipped: "instance not owned" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const ownerId = inst.owner_id as string;

    const remoteJid: string = String(data?.key?.remoteJid ?? "");
    const senderRaw = remoteJid.split("@")[0] ?? "";
    if (!senderRaw) {
      return new Response(JSON.stringify({ ok: true, skipped: "no sender" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Grupos não interessam
    if (remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ ok: true, skipped: "group" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Busca leads do dono e faz o match por sufixo do número
    const { data: leads } = await admin
      .from("leads")
      .select("id, nome, telefone, whatsapp")
      .eq("owner_id", ownerId);

    const lead = (leads ?? []).find(
      (l: any) => phoneMatches(l.whatsapp || "", senderRaw) || phoneMatches(l.telefone || "", senderRaw),
    );
    if (!lead) {
      return new Response(JSON.stringify({ ok: true, skipped: "no matching lead" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Inscrições ativas do lead
    const { data: enrolls } = await admin
      .from("cadence_enrollments")
      .select("id, cadence_id")
      .eq("lead_id", lead.id)
      .eq("owner_id", ownerId)
      .eq("status", "ativa");

    let paused = 0;
    for (const enr of enrolls ?? []) {
      const { data: cad } = await admin
        .from("cadences")
        .select("nome, parar_ao_responder")
        .eq("id", enr.cadence_id)
        .maybeSingle();
      if (!cad?.parar_ao_responder) continue;

      await admin
        .from("cadence_enrollments")
        .update({ status: "pausada_resposta", next_send_at: null })
        .eq("id", enr.id);

      await admin.from("lead_events").insert({
        lead_id: lead.id,
        user_id: ownerId,
        autor_nome: "Automação",
        tipo: "cadencia_pausada",
        descricao: `Cliente respondeu — cadência "${cad.nome}" pausada automaticamente.`,
      });
      paused++;
    }

    return new Response(JSON.stringify({ ok: true, lead_id: lead.id, paused }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
