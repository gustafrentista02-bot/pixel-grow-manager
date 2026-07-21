import { useDraggable } from "@dnd-kit/core";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle, MessageCircle, MoreHorizontal, Pencil, ExternalLink,
  CalendarClock, User as UserIcon, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Lead } from "@/lib/leads-api";
import { formatCurrency, formatDate } from "@/lib/format";
import { daysSince } from "@/lib/notifications";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import {
  OriginBadge, PulseIndicator, TemperatureBadge, computeLeadPulse,
} from "@/components/pixel-badges";

function initials(name: string) {
  return (name || "?")
    .trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function KanbanCard({
  lead,
  responsavelNome,
  onOpenWorkspace,
  onEdit,
  onMore,
}: {
  lead: Lead;
  responsavelNome?: string;
  onOpenWorkspace?: () => void;
  onEdit?: () => void;
  onMore?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  const pulse = computeLeadPulse(lead);
  const dias = daysSince(lead.last_interaction_at);
  const valor = lead.valor_proposta || lead.valor_contrato || lead.faturamento_mensal || 0;
  const phone = lead.whatsapp || lead.telefone || "";
  const wa = phone ? buildWhatsappLink(phone) : null;

  const followupAt = lead.proximo_followup_at ? new Date(lead.proximo_followup_at) : null;
  const followupOverdue = followupAt ? followupAt.getTime() < Date.now() : false;

  function stop(e: React.SyntheticEvent) { e.stopPropagation(); }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative cursor-grab rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm",
        "transition hover:border-border hover:shadow-md hover:-translate-y-[1px] active:cursor-grabbing",
        isDragging && "opacity-70 ring-2 ring-ring shadow-lg",
      )}
    >
      {/* Row 1 — pulse + company/name + hover actions */}
      <div className="flex items-start gap-2">
        <PulseIndicator level={pulse} className="mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {lead.empresa || lead.nome || "Sem nome"}
          </p>
          {lead.empresa && lead.nome && lead.empresa !== lead.nome && (
            <p className="truncate text-[11px] text-muted-foreground">{lead.nome}</p>
          )}
        </div>

        {/* Quick actions — visíveis no hover */}
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100"
          onPointerDown={stop}
          onClick={stop}
        >
          {wa && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/leads/$leadId" params={{ leadId: lead.id }} aria-label="Abrir workspace">
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Abrir workspace</TooltipContent>
          </Tooltip>
          {onEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
          )}
          {onMore && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onMore}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mais opções</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Row 2 — click alvo (abre workspace) com badges */}
      <button
        type="button"
        className="mt-2 block w-full text-left"
        onPointerDown={stop}
        onClick={(e) => { stop(e); onOpenWorkspace?.(); }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <TemperatureBadge value={lead.temperatura} />
          <OriginBadge value={lead.origem} />
        </div>
      </button>

      {/* Row 3 — valor + responsável */}
      {(valor > 0 || responsavelNome) && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {valor > 0 ? (
            <span className="text-xs font-semibold text-emerald-300">{formatCurrency(valor)}</span>
          ) : <span />}
          {responsavelNome && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  {initials(responsavelNome)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {responsavelNome}</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Row 4 — follow-up + última interação */}
      {(followupAt || dias > 0) && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px]">
          {followupAt ? (
            <span
              className={cn(
                "flex items-center gap-1",
                followupOverdue ? "text-red-400" : "text-muted-foreground",
              )}
            >
              {followupOverdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
              {followupOverdue ? "Atrasado " : "Follow-up "}
              {formatDate(followupAt.toISOString())}
            </span>
          ) : <span />}
          {dias > 0 && (
            <span className={cn("flex items-center gap-1", dias >= 3 ? "text-amber-400" : "text-muted-foreground/70")}>
              <Clock className="h-3 w-3" /> {dias}d
            </span>
          )}
        </div>
      )}
    </div>
  );
}
