import { createFileRoute } from "@tanstack/react-router";
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { KanbanCard } from "@/components/kanban-card";
import { useLeads, useLeadMutations } from "@/hooks/use-leads";
import { FOLLOWUP_STAGES, FOLLOWUP_META } from "@/lib/crm";
import type { FollowupStage } from "@/lib/crm";
import type { Lead } from "@/lib/leads-api";

export const Route = createFileRoute("/_authenticated/follow-up")({
  head: () => ({ meta: [{ title: "Follow-up · Pixel CRM" }] }),
  component: FollowUpPage,
});

function Column({ stage, leads }: { stage: FollowupStage; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = FOLLOWUP_META[stage];
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 px-1">
        <div className="flex items-center gap-2">
          <span>{meta.emoji}</span>
          <span className="text-sm font-semibold">{meta.label}</span>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{meta.hint}</p>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition ${isOver ? "border-ring bg-accent/5" : "border-border bg-secondary/30"}`}
      >
        {leads.map((l) => (
          <KanbanCard key={l.id} lead={l} showFollowupInsights />
        ))}
        {leads.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Vazio</p>}
      </div>
    </div>
  );
}

function FollowUpPage() {
  const { data: leads = [] } = useLeads();
  const { moveFollowup } = useLeadMutations();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const followUpLeads = leads.filter((l) => l.stage === "follow_up");

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const lead = followUpLeads.find((l) => l.id === active.id);
    const to = over.id as FollowupStage;
    if (lead && lead.followup_stage !== to) moveFollowup.mutate({ lead, to });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Follow-up</h1>
        <p className="text-sm text-muted-foreground">
          {followUpLeads.length} lead(s) em follow-up. Mova um lead para "Follow-up" no funil para ele aparecer aqui.
        </p>
      </div>

      {followUpLeads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-12 text-center text-muted-foreground">
          Nenhum lead em follow-up no momento.
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {FOLLOWUP_STAGES.map((s) => (
              <Column
                key={s.value}
                stage={s.value}
                leads={followUpLeads.filter((l) => (l.followup_stage ?? "followup_1") === s.value)}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
