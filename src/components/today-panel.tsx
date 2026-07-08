import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Sparkles, CheckSquare, Repeat, FileText, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/use-leads";
import { useTasks } from "@/hooks/use-tasks";
import { formatCurrency } from "@/lib/format";

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function MiniStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

export function TodayPanel() {
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();

  const metrics = useMemo(() => {
    const hoje = todayISODate();
    const leadsHoje = leads.filter((l) => isToday(l.created_at)).length;
    const reunioesHoje = leads.filter((l) => isToday(l.reuniao_at)).length;
    const propostasAbertas = leads.filter((l) => l.stage === "proposta").length;
    const followupsPendentes = leads.filter((l) => l.stage === "follow_up").length;
    const tarefasPendentes = tasks.filter(
      (t) => !t.done && (!t.due_date || t.due_date <= hoje),
    ).length;
    const receitaPrevista = leads
      .filter((l) => ["reuniao", "proposta", "ganho"].includes(l.stage))
      .reduce((s, l) => s + (l.valor_contrato || 0), 0);

    return { leadsHoje, reunioesHoje, propostasAbertas, followupsPendentes, tarefasPendentes, receitaPrevista };
  }, [leads, tasks]);

  const proximasReunioes = useMemo(() => {
    const now = Date.now();
    return leads
      .filter((l) => l.reuniao_at && new Date(l.reuniao_at).getTime() >= now - 3600_000)
      .sort((a, b) => new Date(a.reuniao_at!).getTime() - new Date(b.reuniao_at!).getTime())
      .slice(0, 5);
  }, [leads]);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MiniStat icon={Sparkles} label="Leads novos hoje" value={String(metrics.leadsHoje)} accent="bg-yellow-400/15 text-yellow-300" />
          <MiniStat icon={CalendarClock} label="Reuniões de hoje" value={String(metrics.reunioesHoje)} accent="bg-violet-400/15 text-violet-300" />
          <MiniStat icon={CheckSquare} label="Tarefas pendentes" value={String(metrics.tarefasPendentes)} accent="bg-sky-400/15 text-sky-300" />
          <MiniStat icon={Repeat} label="Follow-ups pendentes" value={String(metrics.followupsPendentes)} accent="bg-cyan-400/15 text-cyan-300" />
          <MiniStat icon={FileText} label="Propostas abertas" value={String(metrics.propostasAbertas)} accent="bg-orange-400/15 text-orange-300" />
          <MiniStat icon={CalendarClock} label="Receita prevista" value={formatCurrency(metrics.receitaPrevista)} accent="bg-emerald-400/15 text-emerald-300" />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximas reuniões</p>
          {proximasReunioes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
          ) : (
            <div className="space-y-2">
              {proximasReunioes.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-2.5">
                  <div className="min-w-0 flex-1">
                    <Link to="/leads/$leadId" params={{ leadId: l.id }} className="truncate text-sm font-medium hover:text-primary hover:underline">
                      {l.nome} {l.empresa ? `· ${l.empresa}` : ""}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {l.reuniao_at ? new Date(l.reuniao_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  {l.meet_link && (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <a href={l.meet_link} target="_blank" rel="noreferrer">
                        <Video className="mr-1.5 h-4 w-4" /> Meet
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
