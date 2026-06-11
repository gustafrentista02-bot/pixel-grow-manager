import { useDraggable } from "@dnd-kit/core";
import { MessageCircle, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/leads-api";
import { ORIGIN_LABELS } from "@/lib/crm";
import { formatCurrency } from "@/lib/format";
import { buildWhatsappLink } from "@/lib/whatsapp";

export function KanbanCard({ lead, onClick }: { lead: Lead; onClick?: () => void }) {
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
        <span className="text-xs font-medium text-accent">{formatCurrency(lead.faturamento_mensal)}</span>
      </div>
      {lead.telefone && (
        <a
          href={buildWhatsappLink(lead.telefone)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </a>
      )}
    </div>
  );
}
