import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Download, FileDown, Lock, Save, ClipboardList,
  Check as CheckIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getAudit, listAuditsByLead, scoreBadgeClass, scoreColor, scoreLabel,
  updateAuditMetricsVisibility, type AuditMetrica,
} from "@/lib/audits-api";
import { downloadAuditPdf } from "@/lib/pdf-audit";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/auditorias/$auditId")({
  head: () => ({ meta: [{ title: "Auditoria · Pixel CRM" }] }),
  component: AuditDetailPage,
});

const NIVEL_META: Record<string, { label: string; bg: string; ring: string }> = {
  bom: { label: "Bom", bg: "bg-emerald-500/15 text-emerald-400", ring: "border-emerald-500/40" },
  razoavel: { label: "Razoável", bg: "bg-amber-500/15 text-amber-400", ring: "border-amber-500/40" },
  fraco: { label: "Fraco", bg: "bg-red-500/15 text-red-400", ring: "border-red-500/40" },
  manual: { label: "Verificar", bg: "bg-muted text-muted-foreground", ring: "border-border" },
};

function AuditDetailPage() {
  const { auditId } = useParams({ from: "/_authenticated/auditorias/$auditId" });
  const qc = useQueryClient();

  const { data: audit, isLoading } = useQuery({
    queryKey: ["audit", auditId],
    queryFn: () => getAudit(auditId),
  });

  const { data: leadHistory = [] } = useQuery({
    queryKey: ["audit-history", audit?.lead_id],
    queryFn: () => listAuditsByLead(audit!.lead_id),
    enabled: !!audit?.lead_id,
  });

  const [selectMode, setSelectMode] = useState(false);
  const [metricas, setMetricas] = useState<AuditMetrica[]>([]);

  useEffect(() => {
    if (audit) {
      setMetricas(audit.metricas.map((m) => ({ visivel_cliente: true, ...m })));
    }
  }, [audit]);

  const dirty = useMemo(() => {
    if (!audit) return false;
    return JSON.stringify(audit.metricas.map((m) => m.visivel_cliente !== false))
      !== JSON.stringify(metricas.map((m) => m.visivel_cliente !== false));
  }, [audit, metricas]);

  const saveMut = useMutation({
    mutationFn: () => updateAuditMetricsVisibility(auditId, metricas),
    onSuccess: () => {
      toast.success("Seleção salva");
      qc.invalidateQueries({ queryKey: ["audit", auditId] });
      qc.invalidateQueries({ queryKey: ["audits"] });
      qc.invalidateQueries({ queryKey: ["lead-audit"] });
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao salvar"),
  });

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Carregando auditoria…</div>;
  }
  if (!audit) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-muted-foreground">Auditoria não encontrada.</p>
        <Button asChild variant="outline">
          <Link to="/auditorias"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </Button>
      </div>
    );
  }

  const empresa = audit.lead?.empresa || audit.lead?.nome || "Negócio";
  const endereco = (audit.dados_brutos as any)?.endereco || "";
  const score = Math.round(audit.score_geral);

  function toggleVisible(chave: string, checked: boolean) {
    setMetricas((prev) => prev.map((m) => m.chave === chave ? { ...m, visivel_cliente: checked } : m));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auditorias"><ArrowLeft className="h-4 w-4" /> Auditorias</Link>
          </Button>
          {audit.lead && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/leads/$leadId" params={{ leadId: audit.lead.id }}>Ficha do lead</Link>
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5">
            <Switch id="select-mode" checked={selectMode} onCheckedChange={setSelectMode} />
            <Label htmlFor="select-mode" className="cursor-pointer text-xs">Modo de seleção para o cliente</Label>
          </div>
          {selectMode && (
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
              <Save className="h-3.5 w-3.5" /> Salvar seleção
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => downloadAuditPdf({ ...audit, metricas }, "full")}>
            <Download className="h-3.5 w-3.5" /> PDF completo
          </Button>
          <Button size="sm" onClick={() => downloadAuditPdf({ ...audit, metricas }, "client")}>
            <FileDown className="h-3.5 w-3.5" /> PDF para cliente
          </Button>
        </div>
      </div>

      {/* Cabeçalho + score */}
      <Card className="overflow-hidden border-border/60 bg-card/60">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h1 className="truncate font-display text-2xl font-bold">{empresa}</h1>
            </div>
            {endereco && <p className="text-sm text-muted-foreground">{endereco}</p>}
            <p className="text-xs text-muted-foreground/70">
              Coletado em {formatDateTime(audit.created_at)} · Por {audit.owner?.nome || "—"}
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/40 px-6 py-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Score geral</p>
              <p className={`font-display text-5xl font-bold ${scoreColor(score)}`}>{score}%</p>
            </div>
            <div>
              <Badge variant="outline" className={scoreBadgeClass(score)}>{scoreLabel(score)}</Badge>
              <div className="mt-2 h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${score >= 75 ? "bg-emerald-400" : score >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid gap-3 md:grid-cols-2">
        {metricas.map((m) => {
          const meta = NIVEL_META[m.nivel] ?? NIVEL_META.manual;
          const visivel = m.visivel_cliente !== false;
          const blurred = selectMode && !visivel;
          return (
            <Card key={m.chave} className={`relative overflow-hidden border-border/60 bg-card/60 ${blurred ? "" : ""}`}>
              {selectMode && (
                <label className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs shadow-sm backdrop-blur">
                  <Checkbox
                    checked={visivel}
                    onCheckedChange={(c) => toggleVisible(m.chave, c === true)}
                  />
                  Incluir no relatório
                </label>
              )}

              <div className={blurred ? "pointer-events-none select-none [filter:blur(4px)]" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">{m.label}</CardTitle>
                    <Badge variant="outline" className={`${meta.bg} ${meta.ring}`}>{meta.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {m.detalhe && <p className="text-xs text-muted-foreground">{m.detalhe}</p>}
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${m.nivel === "bom" ? "bg-emerald-400" : m.nivel === "razoavel" ? "bg-amber-400" : m.nivel === "fraco" ? "bg-red-400" : "bg-muted-foreground/50"}`}
                      style={{ width: `${Math.max(0, Math.min(100, m.percentual))}%` }}
                    />
                  </div>
                  <p className="text-right text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    {Math.round(m.percentual)}%
                  </p>
                </CardContent>
              </div>

              {blurred && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-background/40 text-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">Disponível na versão completa</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Histórico */}
      {leadHistory.length > 1 && (
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Outras auditorias deste lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leadHistory.map((a) => {
              const active = a.id === auditId;
              return (
                <Link
                  key={a.id}
                  to="/auditorias/$auditId"
                  params={{ auditId: a.id }}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${active ? "border-primary/50 bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}
                >
                  <span className="flex items-center gap-2">
                    {active && <CheckIcon className="h-3.5 w-3.5 text-primary" />}
                    {formatDateTime(a.created_at)}
                  </span>
                  <Badge variant="outline" className={scoreBadgeClass(a.score_geral)}>
                    {Math.round(a.score_geral)}%
                  </Badge>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
