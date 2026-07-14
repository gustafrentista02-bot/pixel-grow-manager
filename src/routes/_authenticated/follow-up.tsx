import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DndContext, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Copy, MessageCircle, Sparkles, AlertTriangle, ExternalLink, Trophy, XCircle, ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "@/components/kanban-card";
import { useLeads, useLeadMutations } from "@/hooks/use-leads";
import { FOLLOWUP_STAGES, FOLLOWUP_META } from "@/lib/crm";
import type { FollowupStage } from "@/lib/crm";
import type { Lead } from "@/lib/leads-api";
import { daysSince } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/follow-up")({
  head: () => ({ meta: [{ title: "Follow-up · Pixel CRM" }] }),
  component: FollowUpPage,
});

const DEFAULT_MESSAGE = `Olá {nome}! Aqui é o Gustavo da Pixel Marketing 👋

Passando pra saber se você teve chance de olhar a nossa proposta de SEO Local pra {empresa}. Fico à disposição pra tirar qualquer dúvida ou marcar uma nova conversa rápida.

Posso te ligar hoje ou amanhã?`;

function renderMessage(tpl: string, lead: Lead | null) {
  const nome = lead?.nome?.split(" ")[0] || "tudo bem";
  const empresa = lead?.empresa || "sua empresa";
  return tpl
    .replaceAll("{nome}", nome)
    .replaceAll("{empresa}", empresa)
    .replaceAll("{cidade}", lead?.cidade || "");
}

function onlyDigits(s: string | null | undefined) {
  return (s || "").replace(/\D/g, "");
}

function whatsappLink(lead: Lead, message: string) {
  const phone = onlyDigits(lead.whatsapp || lead.telefone);
  if (!phone) return null;
  const withCountry = phone.length <= 11 ? `55${phone}` : phone;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

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
  const { moveFollowup, moveStage } = useLeadMutations();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [template, setTemplate] = useState(DEFAULT_MESSAGE);

  const followUpLeads = useMemo(() => leads.filter((l) => l.stage === "follow_up"), [leads]);

  const priorityQueue = useMemo(() => {
    return [...followUpLeads]
      .map((l) => ({ lead: l, dias: daysSince(l.last_interaction_at) }))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 6);
  }, [followUpLeads]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    (selectedId && followUpLeads.find((l) => l.id === selectedId)) ||
    priorityQueue[0]?.lead ||
    null;

  const preview = renderMessage(template, selected);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const lead = followUpLeads.find((l) => l.id === active.id);
    const to = over.id as FollowupStage;
    if (lead && lead.followup_stage !== to) moveFollowup.mutate({ lead, to });
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(preview);
      toast.success("Mensagem copiada!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  const stale = followUpLeads.filter((l) => daysSince(l.last_interaction_at) >= 2).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Follow-up</h1>
        <p className="text-sm text-muted-foreground">
          {followUpLeads.length} lead(s) em follow-up
          {stale > 0 && <> · <span className="text-amber-400">{stale} sem contato há 2+ dias</span></>}
        </p>
      </div>

      {followUpLeads.length > 0 && (
        <Card>
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Mensagem pronta</h2>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Variáveis: {"{nome}"}, {"{empresa}"}, {"{cidade}"}
                </Badge>
              </div>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={7}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Prefere gerenciar vários modelos? <Link to="/modelos-mensagem" className="underline">Abrir biblioteca</Link>
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Fila de prioridade</h2>
                <span className="text-xs text-muted-foreground">mais atrasados primeiro</span>
              </div>
              {priorityQueue.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum lead precisando de follow-up urgente. 🎉</p>
              ) : (
                <div className="space-y-1.5">
                  {priorityQueue.map(({ lead, dias }) => {
                    const isSelected = selected?.id === lead.id;
                    return (
                      <button
                        key={lead.id}
                        onClick={() => setSelectedId(lead.id)}
                        className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition ${isSelected ? "border-ring bg-accent/10" : "border-border bg-secondary/40 hover:bg-secondary/60"}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{lead.nome}{lead.empresa ? ` — ${lead.empresa}` : ""}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {FOLLOWUP_META[(lead.followup_stage ?? "followup_1") as FollowupStage].label}
                          </p>
                        </div>
                        <Badge variant="outline" className={dias >= 3 ? "border-destructive/40 bg-destructive/10 text-destructive text-[10px]" : "text-[10px]"}>
                          {dias >= 2 && <AlertTriangle className="mr-0.5 h-3 w-3" />}
                          {dias}d
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}

              {selected && (
                <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Prévia para {selected.nome}
                  </p>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-sans text-xs leading-relaxed">
                    {preview}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyMessage}>
                      <Copy className="mr-1 h-3 w-3" /> Copiar
                    </Button>
                    {whatsappLink(selected, preview) && (
                      <Button asChild size="sm" className="h-8 text-xs">
                        <a href={whatsappLink(selected, preview)!} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="mr-1 h-3 w-3" /> Enviar WhatsApp
                        </a>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                      <Link to="/leads/$leadId" params={{ leadId: selected.id }}>
                        <ExternalLink className="mr-1 h-3 w-3" /> Abrir lead
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
