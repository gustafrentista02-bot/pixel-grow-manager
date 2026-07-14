import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, CalendarClock, CheckCircle2, Circle, Video, Users, MapPin, XCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTasks, useTaskMutations } from "@/hooks/use-tasks";
import { useLeads, useLeadMutations } from "@/hooks/use-leads";
import type { Task, TaskCategoria, TaskPrioridade } from "@/lib/tasks-api";
import { TASK_CATEGORIES, TASK_PRIORITIES } from "@/lib/tasks-api";
import { updateLead } from "@/lib/leads-api";
import type { Lead } from "@/lib/leads-api";
import { formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda · Pixel CRM" }] }),
  component: AgendaPage,
});

const CAT_META = Object.fromEntries(TASK_CATEGORIES.map((c) => [c.value, c])) as Record<
  TaskCategoria,
  (typeof TASK_CATEGORIES)[number]
>;
const PRIO_META = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p])) as Record<
  TaskPrioridade,
  (typeof TASK_PRIORITIES)[number]
>;

type AgendaItem =
  | { kind: "task"; when: Date; task: Task; leadName: string | null }
  | { kind: "meeting"; when: Date; lead: Lead };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseTaskDate(t: Task): Date | null {
  if (!t.due_date) return null;
  const time = t.due_time || "23:59";
  const d = new Date(`${t.due_date}T${time}`);
  return isNaN(d.getTime()) ? null : d;
}

type Bucket = "atrasado" | "hoje" | "amanha" | "semana" | "depois";

function bucketOf(when: Date, today: Date, tomorrow: Date, endOfWeek: Date): Bucket {
  if (when.getTime() < today.getTime()) return "atrasado";
  if (when.getTime() < tomorrow.getTime()) return "hoje";
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  if (when.getTime() < dayAfter.getTime()) return "amanha";
  if (when.getTime() < endOfWeek.getTime()) return "semana";
  return "depois";
}

const BUCKET_META: Record<Bucket, { label: string; hint: string; tone: string }> = {
  atrasado: { label: "Atrasados", hint: "Precisam de ação agora", tone: "text-destructive" },
  hoje: { label: "Hoje", hint: "Foco do dia", tone: "text-emerald-300" },
  amanha: { label: "Amanhã", hint: "Prepare-se", tone: "text-amber-300" },
  semana: { label: "Esta semana", hint: "Próximos dias", tone: "text-sky-300" },
  depois: { label: "Depois", hint: "Mais para frente", tone: "text-muted-foreground" },
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function AgendaPage() {
  const { data: tasks = [] } = useTasks();
  const { data: leads = [] } = useLeads();
  const { toggle } = useTaskMutations();
  const { move } = useLeadMutations();
  const qc = useQueryClient();

  async function cancelMeeting(l: Lead) {
    if (!confirm(`Cancelar a reunião com ${l.nome}?`)) return;
    try {
      await updateLead(l.id, { proxima_acao: "" });
      // Zera reuniao_at diretamente pois não faz parte do LeadInput
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("leads").update({ reuniao_at: null, meet_link: "" }).eq("id", l.id);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", l.id] });
      toast.success("Reunião cancelada");
    } catch (e) {
      toast.error("Erro ao cancelar", { description: e instanceof Error ? e.message : "" });
    }
  }

  function concludeMeeting(l: Lead) {
    move.mutate({ lead: l, to: "ganho" });
    toast.success("Marcado como ganho 🎉");
  }

  const items = useMemo(() => {
    const out: AgendaItem[] = [];
    const leadById = new Map(leads.map((l) => [l.id, l]));
    for (const t of tasks) {
      if (t.done) continue;
      const when = parseTaskDate(t);
      if (!when) continue;
      const leadName = t.lead_id ? leadById.get(t.lead_id)?.nome ?? null : null;
      out.push({ kind: "task", when, task: t, leadName });
    }
    for (const l of leads) {
      if (!l.reuniao_at) continue;
      const when = new Date(l.reuniao_at);
      if (isNaN(when.getTime())) continue;
      out.push({ kind: "meeting", when, lead: l });
    }
    out.sort((a, b) => a.when.getTime() - b.when.getTime());
    return out;
  }, [tasks, leads]);

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const grouped: Record<Bucket, AgendaItem[]> = {
    atrasado: [], hoje: [], amanha: [], semana: [], depois: [],
  };
  for (const it of items) grouped[bucketOf(it.when, today, tomorrow, endOfWeek)].push(it);

  const totalHoje = grouped.hoje.length;
  const totalSemana = grouped.hoje.length + grouped.amanha.length + grouped.semana.length;

  function renderItem(it: AgendaItem) {
    if (it.kind === "meeting") {
      const l = it.lead;
      return (
        <Card key={`m-${l.id}-${l.reuniao_at}`} className="border-l-4 border-l-emerald-400/60">
          <CardContent className="flex items-start gap-3 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
              <Video className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-semibold">{fmtTime(it.when)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(it.when.toISOString())}</span>
              </div>
              <p className="mt-0.5 text-sm font-medium">Reunião — {l.nome}</p>
              {l.empresa && (
                <p className="text-xs text-muted-foreground">
                  <Users className="mr-1 inline h-3 w-3" />{l.empresa}
                  {l.cidade && <> · <MapPin className="mx-1 inline h-3 w-3" />{l.cidade}{l.uf ? `/${l.uf}` : ""}</>}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {l.meet_link && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <a href={l.meet_link} target="_blank" rel="noopener noreferrer">
                    <Video className="mr-1 h-3 w-3" /> Meet
                  </a>
                </Button>
              )}
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                <Link to="/leads/$leadId" params={{ leadId: l.id }}>
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Link>
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-emerald-300" onClick={() => concludeMeeting(l)}>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Concluir
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => cancelMeeting(l)}>
                <XCircle className="mr-1 h-3 w-3" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    const t = it.task;
    const cat = CAT_META[(t.categoria as TaskCategoria) ?? "outro"];
    const prio = PRIO_META[(t.prioridade as TaskPrioridade) ?? "media"];
    return (
      <Card key={`t-${t.id}`}>
        <CardContent className="flex items-start gap-3 p-3">
          <button onClick={() => toggle.mutate({ id: t.id, done: !t.done })} className="mt-0.5 shrink-0" aria-label="Concluir">
            {t.done ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-semibold">{t.due_time ? fmtTime(it.when) : "—"}</span>
              <span className="text-xs text-muted-foreground">{formatDate(it.when.toISOString())}</span>
            </div>
            <p className="mt-0.5 text-sm font-medium">{t.titulo}</p>
            {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {cat && <Badge variant="secondary" className="text-[10px]">{cat.emoji} {cat.label}</Badge>}
              {prio && <Badge variant="outline" className={`text-[10px] ${prio.color}`}>{prio.label}</Badge>}
              {it.leadName && (
                <Badge variant="secondary" className="text-[10px]">
                  <Users className="mr-1 h-3 w-3" /> {it.leadName}
                </Badge>
              )}
            </div>
          </div>
          {t.lead_id && (
            <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
              <Link to="/leads/$leadId" params={{ leadId: t.lead_id }}>Abrir</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const buckets: Bucket[] = ["atrasado", "hoje", "amanha", "semana", "depois"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          {totalHoje} compromisso(s) hoje · {totalSemana} nos próximos 7 dias
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-12 text-center text-muted-foreground">
          <Calendar className="mx-auto mb-2 h-8 w-8" />
          Nenhuma tarefa com data nem reunião agendada.
        </div>
      ) : (
        <div className="space-y-6">
          {buckets.map((b) => {
            const list = grouped[b];
            if (list.length === 0) return null;
            const meta = BUCKET_META[b];
            return (
              <section key={b} className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <CalendarClock className={`h-4 w-4 ${meta.tone}`} />
                  <h2 className={`text-sm font-semibold ${meta.tone}`}>{meta.label}</h2>
                  <span className="text-xs text-muted-foreground">{meta.hint} · {list.length}</span>
                </div>
                <div className="space-y-2">{list.map(renderItem)}</div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
