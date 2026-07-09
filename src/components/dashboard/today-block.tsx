import { useMemo } from "react";
import { Sparkles, CalendarClock, Repeat, CheckSquare, Wallet } from "lucide-react";
import type { Lead } from "@/lib/leads-api";
import type { Task } from "@/lib/tasks-api";
import { formatCurrency } from "@/lib/format";
import { StatTile, isToday, todayISODate } from "./shared";

export function TodayBlock({ leads, tasks }: { leads: Lead[]; tasks: Task[] }) {
  const m = useMemo(() => {
    const hoje = todayISODate();
    const leadsHoje = leads.filter((l) => isToday(l.created_at)).length;
    const reunioesHoje = leads.filter((l) => isToday(l.reuniao_at));
    const followups = leads.filter((l) => l.stage === "follow_up").length;
    const tarefas = tasks.filter((t) => !t.done && (!t.due_date || t.due_date <= hoje)).length;
    const receitaDia = reunioesHoje.reduce((s, l) => s + (l.valor_contrato || 0), 0);
    return { leadsHoje, reunioes: reunioesHoje.length, followups, tarefas, receitaDia };
  }, [leads, tasks]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <StatTile icon={Sparkles} tone="green" value={String(m.leadsHoje)} label="Leads novos hoje" />
      <StatTile icon={CalendarClock} tone="violet" value={String(m.reunioes)} label="Reuniões de hoje" />
      <StatTile icon={Repeat} tone="cyan" value={String(m.followups)} label="Follow-ups pendentes" />
      <StatTile icon={CheckSquare} tone="sky" value={String(m.tarefas)} label="Tarefas pendentes" />
      <StatTile icon={Wallet} tone="amber" value={formatCurrency(m.receitaDia)} label="Receita prevista do dia" />
    </div>
  );
}
