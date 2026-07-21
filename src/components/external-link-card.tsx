import { ExternalLink, Copy, Link2, Globe, Instagram, Facebook, MessageCircle, MapPin, FileText, HardDrive, MapPinned, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ExternalLinkKind =
  | "google-profile"
  | "google-maps"
  | "site"
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "drive"
  | "contract"
  | "proposal"
  | "audit"
  | "generic";

const KIND_META: Record<ExternalLinkKind, { icon: LucideIcon; label: string; tone: string }> = {
  "google-profile": { icon: MapPinned, label: "Perfil Google", tone: "text-yellow-400" },
  "google-maps":    { icon: MapPin,    label: "Google Maps",   tone: "text-red-400" },
  site:             { icon: Globe,     label: "Site",           tone: "text-violet-300" },
  instagram:        { icon: Instagram, label: "Instagram",      tone: "text-pink-400" },
  facebook:         { icon: Facebook,  label: "Facebook",       tone: "text-sky-400" },
  whatsapp:         { icon: MessageCircle, label: "WhatsApp",   tone: "text-emerald-400" },
  drive:            { icon: HardDrive, label: "Drive",          tone: "text-sky-300" },
  contract:         { icon: FileText,  label: "Contrato",       tone: "text-amber-300" },
  proposal:         { icon: FileText,  label: "Proposta",       tone: "text-primary" },
  audit:            { icon: FileText,  label: "Auditoria",      tone: "text-emerald-300" },
  generic:          { icon: Link2,     label: "Link",           tone: "text-muted-foreground" },
};

async function copyToClipboard(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  } catch {
    toast.error("Não foi possível copiar");
  }
}

export interface ExternalLinkCardProps {
  /** URL completa — nunca exibida diretamente na interface */
  url?: string | null;
  /** Tipo do recurso (define ícone e rótulo padrão) */
  kind?: ExternalLinkKind;
  /** Rótulo customizado; se omitido, usa o rótulo padrão do kind */
  label?: string;
  className?: string;
}

/**
 * External Link Card — padrão único para exibir qualquer link externo no Pixel CRM.
 *
 * Regras:
 *  - Nunca exibir a URL completa na interface.
 *  - Mostrar apenas: ícone, nome do recurso, status (Vinculado / Não vinculado)
 *    e as ações Abrir / Copiar.
 *  - A URL completa aparece somente via tooltip (ao passar o mouse no status).
 */
export function ExternalLinkCard({
  url,
  kind = "generic",
  label,
  className,
}: ExternalLinkCardProps) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const hasLink = typeof url === "string" && url.trim().length > 0;
  const displayLabel = label ?? meta.label;

  const statusNode = (
    <span
      className={cn(
        "text-[11px] font-medium",
        hasLink ? "text-emerald-400" : "text-muted-foreground/60",
      )}
    >
      {hasLink ? "Vinculado" : "Não vinculado"}
    </span>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 transition-colors hover:bg-card/70",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40",
          meta.tone,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{displayLabel}</p>
        {hasLink ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] font-medium text-emerald-400 hover:underline"
                >
                  Vinculado
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs break-all">
                {url}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          statusNode
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!hasLink}
          title="Copiar link"
          onClick={() => hasLink && copyToClipboard(url!)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          asChild={hasLink}
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2.5 text-xs"
          disabled={!hasLink}
        >
          {hasLink ? (
            <a href={url!} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </a>
          ) : (
            <span>
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

/** Grid helper — organiza vários ExternalLinkCard lado a lado de forma consistente. */
export function ExternalLinkGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}
