import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  ArrowRightLeft,
  CalendarClock,
  FileText,
  Paperclip,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { listRecentEvents } from "@/lib/leads-api";

const TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
  criado: { icon: Plus, color: "text-emerald-400 bg-emerald-500/10" },
  movimentacao: { icon: ArrowRightLeft, color: "text-sky-400 bg-sky-500/10" },
  reuniao: { icon: CalendarClock, color: "text-violet-400 bg-violet-500/10" },
  proposta: { icon: FileText, color: "text-orange-400 bg-orange-500/10" },
  arquivo: { icon: Paperclip, color: "text-cyan-400 bg-cyan-500/10" },
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ActivityBlock() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["recent-events"],
    queryFn: () => listRecentEvents(12),
  });

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : events.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <Activity className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Nenhuma atividade ainda.
        </div>
      ) : (
        <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
          {events.map((e) => {
            const meta = TYPE_META[e.tipo] ?? { icon: Activity, color: "text-muted-foreground bg-muted" };
            const Icon = meta.icon;
            return (
              <li key={e.id} className="relative flex gap-3">
                <span
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.color}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: e.lead_id }}
                      className="truncate text-sm text-foreground transition-colors hover:text-primary"
                    >
                      {e.descricao}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtTime(e.created_at)}</span>
                  </div>
                  {e.autor_nome && <p className="text-xs text-muted-foreground">{e.autor_nome}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
