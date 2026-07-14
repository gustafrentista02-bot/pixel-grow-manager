import { MessageCircle, Instagram, MapPinned, Globe, Phone, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/leads-api";
import { ORIGIN_LABELS, STAGE_META, POTENCIAL_META } from "@/lib/crm";
import type { Potencial } from "@/lib/crm";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { buildWhatsappLink, buildTelLink } from "@/lib/whatsapp";
import { daysSince } from "@/lib/notifications";

/** Discreet key/value row used inside the lead sidebar. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-foreground">{children}</span>
    </div>
  );
}

function copy(text: string, label: string) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copiado`),
    () => toast.error("Não foi possível copiar"),
  );
}

/**
 * Fixed sidebar shown on the lead detail page and inside the drawer.
 * Renders headline + summary fields + quick action row.
 */
export function LeadSidebar({ lead }: { lead: Lead }) {
  const priority = (lead.potencial as Potencial) in POTENCIAL_META ? (lead.potencial as Potencial) : "media";
  const pot = POTENCIAL_META[priority];
  const stage = STAGE_META[lead.stage];
  const wa = buildWhatsappLink(lead.whatsapp || lead.telefone);
  const tel = buildTelLink(lead.telefone || lead.whatsapp);
  const site = lead.site;
  const google = lead.link_perfil_google;
  const insta = lead.instagram ? `https://instagram.com/${lead.instagram.replace(/^@/, "")}` : "";
  const dias = daysSince(lead.last_interaction_at);

  return (
    <aside className="space-y-6 rounded-2xl border border-border/60 bg-card/60 p-5">
      {/* Headline */}
      <div className="space-y-1.5">
        <h2 className="font-display text-xl font-bold leading-tight">{lead.nome || "Sem nome"}</h2>
        {lead.empresa && (
          <p className="text-sm text-muted-foreground">{lead.empresa}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <Badge variant="outline" className={stage?.badge}>{stage?.emoji} {stage?.label}</Badge>
          <Badge variant="outline" className={pot.badge}>{pot.label}</Badge>
        </div>
      </div>

      {/* Summary */}
      <div className="divide-y divide-border/60">
        <Row label="Telefone">{lead.telefone || "—"}</Row>
        <Row label="WhatsApp">{lead.whatsapp || "—"}</Row>
        <Row label="Cidade">{[lead.cidade, lead.uf].filter(Boolean).join(" / ") || "—"}</Row>
        <Row label="Origem">{ORIGIN_LABELS[lead.origem]}</Row>
        <Row label="Valor">
          <span className="font-medium text-emerald-300">
            {formatCurrency(lead.valor_contrato || lead.faturamento_mensal)}
          </span>
        </Row>
        <Row label="Criado em">{formatDateTime(lead.created_at)}</Row>
        <Row label="Última interação">{formatDateTime(lead.last_interaction_at)}</Row>
        <Row label="Dias sem contato">
          <span className={dias >= 3 ? "text-amber-400" : "text-muted-foreground"}>{dias} dia(s)</span>
        </Row>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Ações rápidas</p>
        <div className="grid grid-cols-4 gap-1.5">
          {wa && (
            <Button asChild variant="outline" size="icon" title="WhatsApp" className="text-emerald-400">
              <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>
            </Button>
          )}
          {tel && (
            <Button asChild variant="outline" size="icon" title="Ligar" className="text-sky-400">
              <a href={tel}><Phone className="h-4 w-4" /></a>
            </Button>
          )}
          {insta && (
            <Button asChild variant="outline" size="icon" title="Instagram" className="text-pink-400">
              <a href={insta} target="_blank" rel="noreferrer"><Instagram className="h-4 w-4" /></a>
            </Button>
          )}
          {google && (
            <Button asChild variant="outline" size="icon" title="Perfil Google" className="text-yellow-400">
              <a href={google} target="_blank" rel="noreferrer"><MapPinned className="h-4 w-4" /></a>
            </Button>
          )}
          {site && (
            <Button asChild variant="outline" size="icon" title="Site" className="text-violet-300">
              <a href={site} target="_blank" rel="noreferrer"><Globe className="h-4 w-4" /></a>
            </Button>
          )}
        </div>

        <div className="grid gap-1.5">
          {(lead.telefone || lead.whatsapp) && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-xs text-muted-foreground hover:text-foreground"
              onClick={() => copy(lead.telefone || lead.whatsapp, "Telefone")}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar telefone
            </Button>
          )}
          {google && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-xs text-muted-foreground hover:text-foreground"
              onClick={() => copy(google, "Perfil Google")}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar Perfil Google
            </Button>
          )}
          {site && (
            <a
              href={site}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Abrir site
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
