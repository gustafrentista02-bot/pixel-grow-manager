import { useMemo } from "react";

import type { Lead } from "@/lib/leads-api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** ordered pipeline for the funnel visual */
const FUNNEL = [
  { key: "lead_novo", label: "Lead", tone: "bg-yellow-400", text: "text-yellow-300" },
  { key: "conversando", label: "Conversando", tone: "bg-sky-400", text: "text-sky-300" },
  { key: "reuniao", label: "Reunião", tone: "bg-violet-400", text: "text-violet-300" },
  { key: "proposta", label: "Proposta", tone: "bg-orange-400", text: "text-orange-300" },
  { key: "ganho", label: "Ganho", tone: "bg-emerald-400", text: "text-emerald-300" },
] as const;

const ORDER: Record<string, number> = {
  lead_novo: 0,
  conversando: 1,
  reuniao: 2,
  proposta: 3,
  ganho: 4,
};

export function FunnelBlock({ leads }: { leads: Lead[] }) {
  const steps = useMemo(() => {
    // only pipeline leads (ignore perdido / sem_interesse / follow_up)
    const pipe = leads.filter((l) => l.stage in ORDER);
    return FUNNEL.map((s, i) => {
      const reached = pipe.filter((l) => ORDER[l.stage] >= i);
      const value = reached.reduce((sum, l) => sum + (l.valor_contrato || 0), 0);
      return { ...s, count: reached.length, value };
    });
  }, [leads]);

  const max = Math.max(1, steps[0]?.count ?? 1);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((s, i) => {
        const prev = i === 0 ? s.count : steps[i - 1].count;
        const conv = i === 0 ? 100 : prev > 0 ? Math.round((s.count / prev) * 100) : 0;
        const width = Math.max(8, Math.round((s.count / max) * 100));
        return (
          <div key={s.key} className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{s.label}</span>
              {i > 0 && (
                <span className={cn("text-xs font-semibold tabular-nums", s.text)}>{conv}%</span>
              )}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{s.count}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-500", s.tone)}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{formatCurrency(s.value)}</p>
          </div>
        );
      })}
    </div>
  );
}

