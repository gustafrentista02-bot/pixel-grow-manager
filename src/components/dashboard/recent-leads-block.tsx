import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/leads-api";
import { STAGE_META, ORIGIN_LABELS } from "@/lib/crm";

export function RecentLeadsBlock({ leads }: { leads: Lead[] }) {
  const recent = useMemo(
    () =>
      [...leads]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [leads],
  );

  if (recent.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        Nenhum lead cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/40">
      {recent.map((l) => (
        <div key={l.id} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{l.empresa || l.nome}</p>
            <p className="truncate text-xs text-muted-foreground">
              {l.nome}
              {l.cidade ? ` · ${l.cidade}` : ""} · {ORIGIN_LABELS[l.origem]}
            </p>
          </div>
          <Badge variant="outline" className={`shrink-0 ${STAGE_META[l.stage].badge}`}>
            {STAGE_META[l.stage].emoji}
            <span className="ml-1 hidden sm:inline">{STAGE_META[l.stage].label}</span>
          </Badge>
          <Button asChild size="sm" variant="ghost" className="h-8 shrink-0">
            <Link to="/leads/$leadId" params={{ leadId: l.id }}>
              Abrir <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
