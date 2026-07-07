import { useDraggable } from "@dnd-kit/core";
import { GripVertical, AlertTriangle, Clock, MapPin, Globe, Instagram, MessageCircle, MapPinned, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/leads-api";
import { ORIGIN_LABELS, FOLLOWUP_META, POTENCIAL_META } from "@/lib/crm";
import type { FollowupStage, Potencial } from "@/lib/crm";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { LeadActions } from "@/components/lead-actions";
import { daysSince } from "@/lib/notifications";

const NEXT_FOLLOWUP: Record<FollowupStage, FollowupStage | null> = {
  followup_1: "followup_2",
  followup_2: "followup_3",
  followup_3: "followup_4",
  followup_4: null,
};

const PRIORITY_BORDER: Record<Potencial, string> = {
  alta: "border-l-emerald-400",
  media: "border-l-amber-400",
  baixa: "border-l-zinc-500",
};

function FollowupInsights({ lead }: { lead: Lead }) {
  const days = daysSince(lead.last_interaction_at);
  const current = (lead.followup_stage ?? "followup_1") as FollowupStage;
  const next = NEXT_FOLLOWUP[current];
  return (
    <div className="mt-2 space-y-1 rounded-md bg-secondary/50 p-2">
      {days >= 2 && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-400">
          <AlertTriangle className="h-3 w-3" /> Sem contato há {days} dia(s)
        </p>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {next ? `Próximo: ${FOLLOWUP_META[next].label} (${FOLLOWUP_META[next].hint})` : "Última tentativa"}
      </p>
    </div>
  );
}

function PresenceIcons({ lead }: { lead: Lead }) {
  const items: { on: boolean; el: React.ReactNode; title: string }[] = [
    { on: lead.tem_perfil_google, el: <MapPinned className="h-3.5 w-3.5" />, title: "Perfil Google" },
    { on: lead.tem_site || !!lead.site, el: <Globe className="h-3.5 w-3.5" />, title: "Site" },
    { on: !!lead.instagram, el: <Instagram className="h-3.5 w-3.5" />, title: "Instagram" },
    { on: !!(lead.whatsapp || lead.telefone), el: <MessageCircle className="h-3.5 w-3.5" />, title: "WhatsApp" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {items.map((it, i) => (
        <span
          key={i}
          title={it.title}
          className={it.on ? "text-accent" : "text-muted-foreground/30"}
        >
          {it.el}
        </span>
      ))}
    </div>
  );
}

export function KanbanCard({
  lead,
  onClick,
  showFollowupInsights = false,
}: {
  lead: Lead;
  onClick?: () => void;
  showFollowupInsights?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;
  const priority = (lead.potencial as Potencial) in PRIORITY_BORDER ? (lead.potencial as Potencial) : "media";
  const pot = POTENCIAL_META[priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-l-4 border-border bg-card p-3 shadow-sm transition ${PRIORITY_BORDER[priority]} ${isDragging ? "opacity-60 ring-2 ring-ring" : "hover:border-ring/50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button onClick={onClick} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold">{lead.nome}</p>
          {lead.empresa && <p className="truncate text-xs text-muted-foreground">{lead.empresa}</p>}
        </button>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground opacity-40 group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {(lead.cidade || lead.segmento) && (
        <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          {[lead.cidade && `${lead.cidade}${lead.uf ? `/${lead.uf}` : ""}`, lead.segmento].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{ORIGIN_LABELS[lead.origem]}</Badge>
          <Badge variant="outline" className={`text-[10px] ${pot.badge}`}>{pot.label}</Badge>
        </div>
        <span className="text-xs font-medium text-accent">
          {formatCurrency(lead.valor_contrato || lead.faturamento_mensal)}
        </span>
      </div>

      <div className="mt-2">
        <PresenceIcons lead={lead} />
      </div>

      {lead.proxima_acao && (
        <p className="mt-2 flex items-center gap-1 rounded bg-secondary/50 px-2 py-1 text-[11px] text-foreground">
          <ArrowRight className="h-3 w-3 shrink-0 text-accent" /> {lead.proxima_acao}
        </p>
      )}
      {lead.reuniao_at && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-violet-300">
          <Calendar className="h-3 w-3 shrink-0" /> {formatDateTime(lead.reuniao_at)}
        </p>
      )}

      {showFollowupInsights && <FollowupInsights lead={lead} />}

      {(lead.telefone || lead.whatsapp) && (
        <div className="mt-2 flex items-center gap-1">
          <LeadActions lead={lead} size="icon" variant="ghost" />
        </div>
      )}
    </div>
  );
}
