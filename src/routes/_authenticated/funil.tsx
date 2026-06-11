import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "@/components/kanban-card";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { useLeads, useLeadMutations } from "@/hooks/use-leads";
import { KANBAN_STAGES, STAGE_META } from "@/lib/crm";
import type { LeadStage } from "@/lib/crm";
import type { Lead } from "@/lib/leads-api";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/funil")({
  head: () => ({ meta: [{ title: "Funil de Vendas · Pixel CRM" }] }),
  component: FunilPage,
});

function Column({ stage, leads, onCardClick }: { stage: LeadStage; leads: Lead[]; onCardClick: (l: Lead) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];
  const total = leads.reduce((s, l) => s + l.faturamento_mensal, 0);

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          <span className="text-sm font-semibold">{meta.label}</span>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{formatCurrency(total)}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition ${isOver ? "border-ring bg-accent/5" : "border-border bg-secondary/30"}`}
      >
        {leads.map((l) => (
          <KanbanCard key={l.id} lead={l} onClick={() => onCardClick(l)} />
        ))}
        {leads.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Vazio</p>}
      </div>
    </div>
  );
}

function FunilPage() {
  const { data: leads = [] } = useLeads();
  const { move, create, update } = useLeadMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const lead = leads.find((l) => l.id === active.id);
    const to = over.id as LeadStage;
    if (lead && lead.stage !== to) move.mutate({ lead, to });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">Arraste os cards entre os estágios</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo lead
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              leads={leads.filter((l) => l.stage === stage)}
              onCardClick={(l) => { setEditing(l); setFormOpen(true); }}
            />
          ))}
        </div>
      </DndContext>

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={editing}
        saving={create.isPending || update.isPending}
        onSubmit={(input) => {
          if (editing) update.mutate({ id: editing.id, input }, { onSuccess: () => setFormOpen(false) });
          else create.mutate(input, { onSuccess: () => setFormOpen(false) });
        }}
      />
    </div>
  );
}
