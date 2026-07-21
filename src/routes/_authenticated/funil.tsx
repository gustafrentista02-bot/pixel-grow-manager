import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  DndContext, PointerSensor, useSensor, useSensors, useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "@/components/kanban-card";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { LeadDrawer } from "@/components/lead-drawer";
import { MeetingScheduleDialog } from "@/components/meeting-schedule-dialog";
import { useLeads, useLeadMutations } from "@/hooks/use-leads";
import { useProfiles } from "@/hooks/use-profiles";
import { STAGE_META } from "@/lib/crm";
import type { LeadStage } from "@/lib/crm";
import type { Lead } from "@/lib/leads-api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/funil")({
  head: () => ({
    meta: [
      { title: "Funil de Vendas · Pixel CRM" },
      { name: "description", content: "Painel visual do funil comercial com Kanban, valor por etapa e taxa de conversão." },
    ],
  }),
  component: FunilPage,
});

/** Colunas efetivamente exibidas no funil comercial. */
const FUNIL_STAGES: LeadStage[] = [
  "lead_novo", "conversando", "reuniao", "proposta", "ganho", "perdido",
];

/** Rótulo curto usado no cabeçalho da coluna do Kanban. */
const COLUMN_LABEL: Partial<Record<LeadStage, string>> = {
  lead_novo: "Lead",
};

function Column({
  stage,
  leads,
  totalLeadsAtivos,
  profilesMap,
  onOpenWorkspace,
  onEdit,
  onQuickView,
}: {
  stage: LeadStage;
  leads: Lead[];
  totalLeadsAtivos: number;
  profilesMap: Map<string, string> | undefined;
  onOpenWorkspace: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onQuickView: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];
  const label = COLUMN_LABEL[stage] ?? meta.label;
  const total = leads.reduce(
    (s, l) => s + (l.valor_proposta || l.valor_contrato || l.faturamento_mensal || 0),
    0,
  );
  const isTerminal = stage === "ganho" || stage === "perdido";
  const conversao = totalLeadsAtivos > 0 ? (leads.length / totalLeadsAtivos) * 100 : null;

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      {/* Header compacto */}
      <div className="mb-2.5 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
            <span className="truncate text-sm font-semibold">{label}</span>
            <span className="shrink-0 rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {leads.length}
            </span>
          </div>
          {conversao !== null && !isTerminal && (
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> {conversao.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="mt-1 text-[11px] font-medium text-emerald-300/90">
          {total > 0 ? formatCurrency(total) : <span className="text-muted-foreground/60">—</span>}
        </div>
      </div>

      {/* Coluna droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition",
          isOver ? "border-ring bg-accent/10" : "border-border/40 bg-secondary/10",
        )}
      >
        {leads.map((l) => (
          <KanbanCard
            key={l.id}
            lead={l}
            responsavelNome={l.responsavel_id ? profilesMap?.get(l.responsavel_id) : undefined}
            onOpenWorkspace={() => onQuickView(l)}
            onEdit={() => onEdit(l)}
            onMore={() => onQuickView(l)}
          />
        ))}
        {leads.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 py-6 text-center">
            <p className="text-[11px] text-muted-foreground/70">Sem leads nesta etapa</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FunilPage() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading, isError, refetch } = useLeads();
  const { data: profilesMap } = useProfiles();
  const { move, create, update } = useLeadMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [meetingLead, setMeetingLead] = useState<Lead | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const funilLeads = useMemo(
    () => leads.filter((l) => FUNIL_STAGES.includes(l.stage)),
    [leads],
  );
  const totalValor = useMemo(
    () => funilLeads.reduce((s, l) => s + (l.valor_proposta || l.valor_contrato || l.faturamento_mensal || 0), 0),
    [funilLeads],
  );

  function openQuickView(l: Lead) {
    setDrawerId(l.id);
    setDrawerOpen(true);
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
    // TODO(sprint futura): registrar movimentação na Central de Atividades.
    move.mutate({ lead, to });
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            {funilLeads.length} leads no pipeline · {formatCurrency(totalValor)} em oportunidades
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo lead
        </Button>
      </div>

      {/* Board */}
      {isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">Erro ao carregar o funil.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {FUNIL_STAGES.map((s) => (
            <div key={s} className="w-[300px] shrink-0 space-y-2">
              <div className="h-14 animate-pulse rounded-xl bg-secondary/40" />
              <div className="h-24 animate-pulse rounded-xl bg-secondary/30" />
              <div className="h-24 animate-pulse rounded-xl bg-secondary/20" />
            </div>
          ))}
        </div>
      ) : funilLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-secondary/10 p-16 text-center">
          <p className="text-sm font-medium">Seu funil está vazio</p>
          <p className="mt-1 text-xs text-muted-foreground">Cadastre o primeiro lead para começar a operar o pipeline.</p>
          <Button size="sm" className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo lead
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
            {FUNIL_STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                leads={funilLeads.filter((l) => l.stage === stage)}
                totalLeadsAtivos={funilLeads.length}
                profilesMap={profilesMap}
                onOpenWorkspace={(l) => navigate({ to: "/leads/$leadId", params: { leadId: l.id } })}
                onEdit={(l) => setEditing(l)}
                onQuickView={openQuickView}
              />
            ))}
          </div>
        </DndContext>
      )}

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={null}
        saving={create.isPending}
        onSubmit={(input) => create.mutate(input, { onSuccess: () => setFormOpen(false) })}
      />

      <LeadFormDialog
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        lead={editing}
        saving={update.isPending}
        onSubmit={(input) => {
          if (!editing) return;
          update.mutate({ id: editing.id, patch: input }, { onSuccess: () => setEditing(null) });
        }}
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

      <LeadDrawer leadId={drawerId} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
