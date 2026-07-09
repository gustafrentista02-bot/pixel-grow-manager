import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, CalendarClock, FileClock, CheckSquare, ChevronRight, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Lead } from "@/lib/leads-api";
import type { Task } from "@/lib/tasks-api";
import { cn } from "@/lib/utils";
import { isToday, daysSince, todayISODate } from "./shared";

/** stages still "in play" — used to decide what needs attention */
const ACTIVE_STAGES = ["lead_novo", "conversando", "reuniao", "proposta", "follow_up"];

type AttentionCard = {
  icon: LucideIcon;
  title: string;
  leads: Lead[];
  count: number;
  render: (l: Lead) => string;
  href?: boolean;
};

export function AttentionBlock({ leads, tasks }: { leads: Lead[]; tasks: Task[] }) {
  const cards = useMemo<AttentionCard[]>(() => {
    const semResposta = leads.filter(
      (l) => ACTIVE_STAGES.includes(l.stage) && daysSince(l.last_interaction_at) >= 2,
    );
    const followupsAtrasados = leads.filter(
      (l) => l.stage === "follow_up" && daysSince(l.last_interaction_at) >= 2,
    );
    const reunioesHoje = leads.filter((l) => isToday(l.reuniao_at));
    const propostas = leads.filter((l) => l.stage === "proposta");
    const hoje = todayISODate();
    const tarefasVencidas = tasks.filter((t) => !t.done && t.due_date && t.due_date < hoje);

    return [
      {
        icon: Clock,
        title: "Sem resposta há +2 dias",
        leads: semResposta,
        count: semResposta.length,
        render: (l) => `${l.empresa || l.nome} · há ${daysSince(l.last_interaction_at)}d`,
        href: true,
      },
      {
        icon: Repeat,
        title: "Follow-ups atrasados",
        leads: followupsAtrasados,
        count: followupsAtrasados.length,
        render: (l) => `${l.empresa || l.nome} · há ${daysSince(l.last_interaction_at)}d`,
        href: true,
      },
      {
        icon: CalendarClock,
        title: "Reuniões de hoje",
        leads: reunioesHoje,
        count: reunioesHoje.length,
        render: (l) =>
          `${l.empresa || l.nome} · ${l.reuniao_at ? new Date(l.reuniao_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}`,
        href: true,
      },
      {
        icon: FileClock,
        title: "Propostas aguardando retorno",
        leads: propostas,
        count: propostas.length,
        render: (l) => `${l.empresa || l.nome}`,
        href: true,
      },
      {
        icon: CheckSquare,
        title: "Tarefas vencidas",
        leads: [],
        count: tarefasVencidas.length,
        render: () => "",
      },
    ];
  }, [leads, tasks]);

  return (
    <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.04] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <h2 className="font-display text-base font-bold">O que precisa da minha atenção</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <AttentionTile key={c.title} card={c} />
        ))}
      </div>
    </div>
  );
}

function AttentionTile({ card }: { card: AttentionCard }) {
  const Icon = card.icon;
  const empty = card.count === 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-colors",
        empty
          ? "border-border bg-card/40"
          : "border-destructive/30 bg-destructive/[0.06]",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", empty ? "text-muted-foreground" : "text-destructive")} />
          <span className="text-sm font-medium">{card.title}</span>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-sm font-bold tabular-nums",
            empty ? "text-muted-foreground" : "bg-destructive/15 text-destructive",
          )}
        >
          {card.count}
        </span>
      </div>
      {!empty && card.leads.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {card.leads.slice(0, 3).map((l) => (
            <li key={l.id}>
              {card.href ? (
                <Link
                  to="/leads/$leadId"
                  params={{ leadId: l.id }}
                  className="flex items-center gap-1 truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="truncate">{card.render(l)}</span>
                </Link>
              ) : (
                <span className="truncate text-xs text-muted-foreground">{card.render(l)}</span>
              )}
            </li>
          ))}
          {card.leads.length > 3 && (
            <li className="pl-4 text-xs text-muted-foreground/70">+{card.leads.length - 3} outros</li>
          )}
        </ul>
      )}
      {empty && <p className="mt-2 text-xs text-muted-foreground/70">Tudo em dia ✓</p>}
    </div>
  );
}

