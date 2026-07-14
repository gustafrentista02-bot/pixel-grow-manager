import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "@/components/kanban-card";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { LeadDrawer } from "@/components/lead-drawer";
import { MeetingScheduleDialog } from "@/components/meeting-schedule-dialog";
import { useLeads, useLeadMutations } from "@/hooks/use-leads";
import { KANBAN_STAGES, STAGE_META } from "@/lib/crm";
import type { LeadStage } from "@/lib/crm";
import type { Lead } from "@/lib/leads-api";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/funil")({
  head: () => ({ meta: [{ title: "Funil de Vendas · Pixel CRM" }] }),
  component: FunilPage,
});

function Column({
  stage,
  leads,
  onCardClick,
  onCardDoubleClick,
}: {
  stage: LeadStage;
  leads: Lead[];
  onCardClick: (l: Lead) => void;
  onCardDoubleClick: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];
  const total = leads.reduce((s, l) => s + (l.valor_contrato || l.faturamento_mensal), 0);

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
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition ${isOver ? "border-ring bg-accent/5" : "border-border/50 bg-secondary/20"}`}
      >
        {leads.map((l) => (
          <KanbanCard
            key={l.id}
            lead={l}
            onClick={() => onCardClick(l)}
            onDoubleClick={() => onCardDoubleClick(l)}
          />
        ))}
        {leads.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Vazio</p>}
      </div>
    </div>
  );
}

function FunilPage() {
  const navigate = useNavigate();
  const { data: leads = [] } = useLeads();
  const { move, create } = useLeadMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [meetingLead, setMeetingLead] = useState<Lead | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Single-vs-double click detection: wait ~220ms before opening the drawer.
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSingleClick(l: Lead) {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setDrawerId(l.id);
      setDrawerOpen(true);
    }, 220);
  }
  function handleDoubleClick(l: Lead) {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    navigate({ to: "/leads/$leadId", params: { leadId: l.id } });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const lead = leads.find((l) => l.id === active.id);
    const to = over.id as LeadStage;
    if (!lead || lead.stage === to) return;
    if (to === "reuniao") {
      setMeetingLead(lead);
      return;
    }
    move.mutate({ lead, to });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Clique para abrir · duplo clique para ficha completa · arraste para mover
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
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
              onCardClick={handleSingleClick}
              onCardDoubleClick={handleDoubleClick}
            />
          ))}
        </div>
      </DndContext>

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={null}
        saving={create.isPending}
        onSubmit={(input) => create.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />

      <MeetingScheduleDialog
        open={!!meetingLead}
        onOpenChange={(o) => { if (!o) setMeetingLead(null); }}
        lead={meetingLead}
        onConfirm={(reuniao_at, meet_link) => {
          if (meetingLead) {
            move.mutate({ lead: meetingLead, to: "reuniao", extra: { reuniao_at, meet_link } });
          }
          setMeetingLead(null);
        }}
      />

      <LeadDrawer
        leadId={drawerId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
