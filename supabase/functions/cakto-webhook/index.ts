// Webhook público da Cakto — vincula pagamento à organização pelo e-mail do comprador.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function extractEmail(payload: any): string {
  return String(
    payload?.data?.customer?.email ??
      payload?.customer?.email ??
      payload?.data?.buyer?.email ??
      payload?.buyer?.email ??
      "",
  ).trim().toLowerCase();
}

function extractEvent(payload: any): string {
  return String(payload?.event ?? payload?.type ?? "").toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  const providedSecret = String(payload?.secret ?? payload?.data?.secret ?? "");
  if (!WEBHOOK_SECRET || providedSecret !== WEBHOOK_SECRET) {
    console.log("cakto-webhook: secret inválido");
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const event = extractEvent(payload);
  const email = extractEmail(payload);

  // 1) Sempre logar o evento bruto
  const { data: logRow } = await admin
    .from("cakto_webhook_log")
    .insert({ event, customer_email: email, raw_payload: payload })
    .select("id")
    .maybeSingle();

  if (!email) {
    console.log("cakto-webhook: sem e-mail no payload");
    return json({ ok: true, skipped: "no email" });
  }

  // 2) Encontrar organização pelo e-mail do usuário
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id, email")
    .ilike("email", email)
    .maybeSingle();

  if (!profile?.organization_id) {
    console.log(`cakto-webhook: nenhum usuário com email ${email}`);
    return json({ ok: true, skipped: "no matching user" });
  }

  const orgId = profile.organization_id as string;

  // 3) Aplicar atualização conforme evento
  let patch: Record<string, unknown> | null = null;
  if (
    event === "purchase_approved" ||
    event === "subscription_created" ||
    event === "subscription_renewed"
  ) {
    patch = {
      subscription_status: "ativa",
      current_period_end: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      cakto_customer_email: email,
    };
  } else if (event === "subscription_canceled") {
    patch = { subscription_status: "cancelada" };
  } else if (event === "subscription_renewal_refused") {
    patch = { subscription_status: "inadimplente" };
  }

  if (patch) {
    await admin.from("organizations").update(patch).eq("id", orgId);
  }

  if (logRow?.id) {
    await admin
      .from("cakto_webhook_log")
      .update({ matched_organization_id: orgId })
      .eq("id", logRow.id);
  }

  return json({ ok: true, event, organization_id: orgId, applied: Boolean(patch) });
});
