import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

type Metrica = {
  chave: string;
  label: string;
  nivel: "fraco" | "razoavel" | "bom" | "manual";
  detalhe?: string;
  percentual: number;
};

type Audit = {
  id: string;
  score_geral: number;
  metricas: Metrica[];
  created_at: string;
};

async function loadLatestAudit(leadId: string): Promise<Audit | null> {
  const { data } = await supabase
    .from("gbp_audits")
    .select("id, score_geral, metricas, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any) ?? null;
}

const NIVEL_BADGE: Record<Metrica["nivel"], { label: string; className: string }> = {
  bom:      { label: "Bom",      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  razoavel: { label: "Razoável", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  fraco:    { label: "Fraco",    className: "bg-red-500/15 text-red-400 border-red-500/30" },
  manual:   { label: "Verificar", className: "bg-muted text-muted-foreground border-border" },
};

export function LeadAuditCard({ leadId }: { leadId: string }) {
  const { data: audit, isLoading } = useQuery({
    queryKey: ["lead-audit", leadId],
    queryFn: () => loadLatestAudit(leadId),
  });

  if (isLoading) return null;

  if (!audit) {
    return (
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Auditoria de Perfil Google</CardTitle>
          <CardDescription>Nenhuma auditoria ainda. Use a extensão do Chrome no perfil do Google Maps deste negócio.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Auditoria de Perfil Google</CardTitle>
          <CardDescription>Coletado em {formatDateTime(audit.created_at)}</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Score</p>
          <p className="font-display text-2xl font-bold">{Math.round(audit.score_geral)}%</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {audit.metricas.map((m) => {
          const meta = NIVEL_BADGE[m.nivel];
          return (
            <div key={m.chave} className="flex items-start justify-between gap-2 rounded-lg border border-border/50 bg-background/40 p-2">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{m.label}</p>
                {m.detalhe && <p className="truncate text-xs text-muted-foreground">{m.detalhe}</p>}
              </div>
              <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
