import { useDraggable } from "@dnd-kit/core";
import { GripVertical, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/leads-api";
import { ORIGIN_LABELS, FOLLOWUP_META } from "@/lib/crm";
import type { FollowupStage } from "@/lib/crm";
import { formatCurrency } from "@/lib/format";
import { LeadActions } from "@/components/lead-actions";
import { daysSince } from "@/lib/notifications";

const NEXT_FOLLOWUP: Record<FollowupStage, FollowupStage | null> = {
  followup_1: "followup_2",
  followup_2: "followup_3",
  followup_3: "followup_4",
  followup_4: null,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-border bg-card p-3 shadow-sm transition ${isDragging ? "opacity-60 ring-2 ring-ring" : "hover:border-ring/50"}`}
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
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge variant="secondary" className="text-[10px]">{ORIGIN_LABELS[lead.origem]}</Badge>
        <span className="text-xs font-medium text-accent">
          {formatCurrency(lead.valor_contrato || lead.faturamento_mensal)}
        </span>
      </div>

      {showFollowupInsights && <FollowupInsights lead={lead} />}

      {lead.telefone && (
        <div className="mt-2 flex items-center gap-1">
          <LeadActions lead={lead} size="icon" variant="ghost" />
        </div>
      )}
    </div>
  );
}
