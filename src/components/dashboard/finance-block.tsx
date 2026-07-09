import { useMemo } from "react";
import { TrendingUp, CheckCircle2, Receipt, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Lead } from "@/lib/leads-api";
import { formatCurrency } from "@/lib/format";

export function FinanceBlock({ leads }: { leads: Lead[] }) {
  const f = useMemo(() => {
    const ganhos = leads.filter((l) => l.stage === "ganho");
    const mrr = ganhos.reduce((s, l) => s + (l.valor_contrato || 0), 0);

    const now = new Date();
    const receitaFechada = ganhos
      .filter((l) => {
        const d = new Date(l.updated_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, l) => s + (l.valor_contrato || 0), 0);

    const receitaPrevista = leads
      .filter((l) => l.stage === "reuniao" || l.stage === "proposta")
      .reduce((s, l) => s + (l.valor_contrato || 0), 0);

    const ticket = ganhos.length > 0 ? Math.round(mrr / ganhos.length) : 0;
    return { mrr, receitaFechada, receitaPrevista, ticket };
  }, [leads]);

  const items: { icon: LucideIcon; label: string; value: string; accent: string }[] = [
    { icon: TrendingUp, label: "Receita prevista", value: formatCurrency(f.receitaPrevista), accent: "text-amber-400" },
    { icon: CheckCircle2, label: "Receita fechada (mês)", value: formatCurrency(f.receitaFechada), accent: "text-emerald-400" },
    { icon: Receipt, label: "Ticket médio", value: formatCurrency(f.ticket), accent: "text-sky-400" },
    { icon: Repeat, label: "MRR", value: formatCurrency(f.mrr), accent: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/40 sm:grid-cols-4 sm:divide-y-0">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="p-5">
            <Icon className={`mb-3 h-5 w-5 ${it.accent}`} />
            <p className="text-xl font-bold tracking-tight">{it.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{it.label}</p>
          </div>
        );
      })}
    </div>
  );
}
