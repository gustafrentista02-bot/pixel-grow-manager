// Ingest público chamado pela extensão de Chrome. Autentica via x-extension-token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-extension-token",
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

type Nivel = "fraco" | "razoavel" | "bom" | "manual";
type Metrica = { chave: string; label: string; nivel: Nivel; detalhe?: string; percentual: number; visivel_cliente: boolean };

function pct(nivel: Nivel): number {
  return nivel === "bom" ? 100 : nivel === "razoavel" ? 60 : nivel === "fraco" ? 20 : 0;
}
function mk(chave: string, label: string, nivel: Nivel, detalhe?: string): Metrica {
  return { chave, label, nivel, detalhe, percentual: pct(nivel), visivel_cliente: true };
}
function nText(v: unknown): Nivel {
  return typeof v === "string" && v.trim().length > 0 ? "bom" : "fraco";
}

function buildMetricas(p: any): Metrica[] {
  const m: Metrica[] = [];
  m.push(mk("nome_negocio", "Nome do negócio", nText(p.nome_negocio), p.nome_negocio || undefined));
  m.push(mk("telefone", "Telefone", nText(p.telefone), p.telefone || undefined));
  m.push(mk("website", "Website", nText(p.website), p.website || undefined));
  m.push(mk("horario", "Horário de funcionamento", nText(p.horario), p.horario || undefined));
  m.push(mk("endereco", "Endereço", nText(p.endereco), p.endereco || undefined));

  const rating = Number(p.rating);
  if (Number.isFinite(rating) && rating > 0) {
    const nivel: Nivel = rating < 3.5 ? "fraco" : rating <= 4.2 ? "razoavel" : "bom";
    m.push(mk("media_avaliacoes", "Média de avaliações", nivel, `${rating.toFixed(1)}`));
  } else {
    m.push(mk("media_avaliacoes", "Média de avaliações", "fraco", "Sem avaliações"));
  }

  const rc = Number(p.review_count) || 0;
  const nrc: Nivel = rc < 3 ? "fraco" : rc < 10 ? "razoavel" : "bom";
  m.push(mk("qtd_avaliacoes", "Quantidade de avaliações", nrc, `${rc} avaliações`));

  const fotos = Number(p.total_fotos) || 0;
  m.push(mk("total_fotos", "Fotos do perfil", fotos < 3 ? "fraco" : "bom", `${fotos} fotos`));

  const rd = p.reviews_detail ?? {};
  if (rd.disponivel) {
    const prop = Number(rd.proporcao_com_resposta_dono) || 0;
    m.push(mk(
      "avaliacoes_sem_resposta",
      "Avaliações respondidas pelo dono",
      prop >= 0.5 ? "bom" : "fraco",
      `${Math.round(prop * 100)}% respondidas`,
    ));
    const propC = Number(rd.proporcao_com_comentario) || 0;
    m.push(mk(
      "avaliacoes_sem_comentario",
      "Avaliações com comentário",
      propC >= 0.5 ? "bom" : "fraco",
      `${Math.round(propC * 100)}% com comentário`,
    ));
  } else {
    m.push(mk("avaliacoes_sem_resposta", "Avaliações respondidas pelo dono", "manual"));
    m.push(mk("avaliacoes_sem_comentario", "Avaliações com comentário", "manual"));
  }

  const qa = p.qa ?? {};
  if (qa.disponivel) {
    const total = Number(qa.total_perguntas) || 0;
    m.push(mk("perguntas_respostas", "Perguntas & respostas", total === 0 ? "razoavel" : "bom", `${total} perguntas`));
  } else {
    m.push(mk("perguntas_respostas", "Perguntas & respostas", "manual"));
  }

  const up = p.updates ?? {};
  if (up.disponivel && up.ultima_data) {
    const dias = Math.floor((Date.now() - new Date(up.ultima_data).getTime()) / 86_400_000);
    m.push(mk("ultima_postagem", "Última postagem", dias <= 30 ? "bom" : "fraco", `há ${dias} dias`));
  } else {
    m.push(mk("ultima_postagem", "Última postagem", "manual"));
  }

  return m;
}

function scoreOf(metricas: Metrica[]): number {
  const nonManual = metricas.filter((x) => x.nivel !== "manual");
  if (nonManual.length === 0) return 0;
  const s = nonManual.reduce((acc, x) => acc + x.percentual, 0) / nonManual.length;
  return Math.round(s);
}

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const token = req.headers.get("x-extension-token")?.trim();
  if (!token) return json({ error: "missing token" }, 401);

  const { data: tok, error: tokErr } = await admin
    .from("extension_tokens")
    .select("id, owner_id, organization_id, revogado")
    .eq("token", token)
    .maybeSingle();
  if (tokErr || !tok || tok.revogado) return json({ error: "invalid token" }, 401);

  await admin.from("extension_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tok.id);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const gmUrl = String(payload?.google_maps_url ?? "").trim();
  const nomeNeg = String(payload?.nome_negocio ?? "").trim();
  if (!gmUrl && !nomeNeg) return json({ error: "missing google_maps_url or nome_negocio" }, 400);

  // Tenta achar lead
  let leadId: string | null = null;
  let leadCriado = false;

  if (gmUrl) {
    const { data } = await admin
      .from("leads")
      .select("id")
      .eq("owner_id", tok.owner_id)
      .eq("link_perfil_google", gmUrl)
      .maybeSingle();
    if (data?.id) leadId = data.id;
  }
  if (!leadId && nomeNeg) {
    const { data } = await admin
      .from("leads")
      .select("id, nome, empresa")
      .eq("owner_id", tok.owner_id);
    const target = norm(nomeNeg);
    const found = (data ?? []).find(
      (l) => norm(l.empresa) === target || norm(l.nome) === target,
    );
    if (found) leadId = found.id;
  }

  if (!leadId) {
    const { data: novo, error: insErr } = await admin
      .from("leads")
      .insert({
        owner_id: tok.owner_id,
        organization_id: tok.organization_id,
        nome: nomeNeg || "Lead da extensão",
        empresa: nomeNeg || "",
        telefone: String(payload?.telefone ?? "").trim(),
        site: String(payload?.website ?? "").trim(),
        link_perfil_google: gmUrl,
        tem_perfil_google: true,
        stage: "lead_novo",
        criado_por_extensao: true,
      })
      .select("id")
      .single();
    if (insErr || !novo) return json({ error: insErr?.message ?? "failed to create lead" }, 500);
    leadId = novo.id;
    leadCriado = true;
  }

  const metricas = buildMetricas(payload);
  const score = scoreOf(metricas);
  const tipoRaw = String(payload?.tipo_auditoria ?? "").trim().toLowerCase();
  const tipo_auditoria = tipoRaw === "prospeccao" || tipoRaw === "gerenciado" ? tipoRaw : "desconhecido";

  const { error: audErr } = await admin.from("gbp_audits").insert({
    lead_id: leadId,
    owner_id: tok.owner_id,
    organization_id: tok.organization_id,
    dados_brutos: payload,
    metricas,
    score_geral: score,
    status: "concluida",
    tipo_auditoria,
  });
  if (audErr) return json({ error: audErr.message }, 500);

  return json({ score_geral: score, lead_id: leadId, lead_criado: leadCriado });
});
