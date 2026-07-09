import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Video, Pencil, Check, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingScheduleDialog } from "@/components/meeting-schedule-dialog";
import { useLeadMutations } from "@/hooks/use-leads";
import type { Lead } from "@/lib/leads-api";

export function MeetingsBlock({ leads }: { leads: Lead[] }) {
  const { move } = useLeadMutations();
  const [editing, setEditing] = useState<Lead | null>(null);

  const meetings = useMemo(() => {
    const from = Date.now() - 3600_000;
    return leads
      .filter((l) => l.reuniao_at && new Date(l.reuniao_at).getTime() >= from)
      .sort((a, b) => new Date(a.reuniao_at!).getTime() - new Date(b.reuniao_at!).getTime())
      .slice(0, 6);
  }, [leads]);

  if (meetings.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        <CalendarClock className="mx-auto mb-2 h-6 w-6 opacity-50" />
        Nenhuma reunião agendada.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {meetings.map((l) => {
          const dt = new Date(l.reuniao_at!);
          return (
            <div
              key={l.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-3 transition-colors hover:border-primary/30"
            >
              <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                <span className="text-base font-bold leading-none">
                  {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                  {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to="/leads/$leadId"
                  params={{ leadId: l.id }}
                  className="block truncate text-sm font-semibold hover:text-primary"
                >
                  {l.empresa || l.nome}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{l.nome}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {l.meet_link && (
                  <Button asChild size="sm" variant="outline" className="h-8">
                    <a href={l.meet_link} target="_blank" rel="noreferrer">
                      <Video className="mr-1 h-3.5 w-3.5" /> Meet
                    </a>
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => setEditing(l)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-400"
                  title="Concluir reunião"
                  onClick={() => move.mutate({ lead: l, to: "proposta" })}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <MeetingScheduleDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        lead={editing}
        onConfirm={(reuniao_at, meet_link) => {
          if (editing) move.mutate({ lead: editing, to: "reuniao", extra: { reuniao_at, meet_link } });
          setEditing(null);
        }}
      />
    </>
  );
}
