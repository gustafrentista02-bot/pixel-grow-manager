// Gerencia a instância Evolution de cada usuário (connect/status/disconnect).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/+$/, "");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function evo(path: string, init: RequestInit = {}) {
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return json({ error: "Evolution API não configurada (URL/KEY)." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: "Não autenticado" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: { action?: string } = {};
  try { payload = await req.json(); } catch { /* ignore */ }
  const action = payload.action ?? "";

  const { data: existing } = await admin
    .from("whatsapp_instances")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  const instanceName = existing?.instance_name ?? `user-${user.id}`;

  try {
    if (action === "connect") {
      // Cria a instância se não existir (Evolution ignora se já existe)
      if (!existing) {
        await evo("/instance/create", {
          method: "POST",
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });
        await admin.from("whatsapp_instances").insert({
          owner_id: user.id,
          instance_name: instanceName,
          status: "conectando",
        });
      } else {
        await admin.from("whatsapp_instances")
          .update({ status: "conectando" })
          .eq("owner_id", user.id);
      }

      // Busca o QR
      const qr = await evo(`/instance/connect/${instanceName}`, { method: "GET" });
      const base64 =
        qr.data?.base64 ??
        qr.data?.qrcode?.base64 ??
        qr.data?.qr ??
        null;
      const code = qr.data?.code ?? qr.data?.qrcode?.code ?? null;

      return json({ ok: true, instanceName, base64, code, raw: qr.data, status: "conectando" });
    }

    if (action === "status") {
      if (!existing) return json({ ok: true, status: "desconectado" });
      const s = await evo(`/instance/connectionState/${instanceName}`, { method: "GET" });
      const stateRaw =
        s.data?.instance?.state ??
        s.data?.state ??
        s.data?.status ??
        "";
      const isOpen = String(stateRaw).toLowerCase() === "open";
      const status = isOpen ? "conectado" : (existing.status === "conectado" ? "desconectado" : (existing.status || "desconectado"));

      let numero = existing.numero_conectado ?? "";
      if (isOpen) {
        // Tenta pegar o número via fetchInstances
        try {
          const info = await evo(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`, { method: "GET" });
          const arr = Array.isArray(info.data) ? info.data : (info.data?.instances ?? []);
          const inst = arr?.[0];
          numero = inst?.owner ?? inst?.instance?.owner ?? inst?.number ?? numero;
          if (typeof numero === "string" && numero.includes("@")) numero = numero.split("@")[0];
        } catch { /* ignore */ }
      }

      await admin.from("whatsapp_instances").update({
        status,
        numero_conectado: numero || "",
        connected_at: isOpen && !existing.connected_at ? new Date().toISOString() : existing.connected_at,
      }).eq("owner_id", user.id);

      return json({ ok: true, status, numero_conectado: numero, raw: s.data });
    }

    if (action === "disconnect") {
      if (existing) {
        await evo(`/instance/logout/${instanceName}`, { method: "DELETE" });
        await admin.from("whatsapp_instances")
          .update({ status: "desconectado", numero_conectado: "", connected_at: null })
          .eq("owner_id", user.id);
      }
      return json({ ok: true, status: "desconectado" });
    }

    return json({ error: "action inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
