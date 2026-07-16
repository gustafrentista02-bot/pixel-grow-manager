import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Download, ExternalLink, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listAudits, scoreBadgeClass, scoreLabel, tipoAuditoriaBadgeClass, tipoAuditoriaLabel } from "@/lib/audits-api";
import { downloadAuditPdf } from "@/lib/pdf-audit";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/auditorias/")({
  head: () => ({ meta: [{ title: "Auditorias · Pixel CRM" }] }),
  component: AuditoriasPage,
});

function AuditoriasPage() {
  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: listAudits,
  });

  const [q, setQ] = useState("");
  const [leadFilter, setLeadFilter] = useState<string>("todos");
  const [periodo, setPeriodo] = useState<string>("todos");

  const leads = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of audits) {
      if (a.lead) map.set(a.lead.id, a.lead.empresa || a.lead.nome);
    }
    return Array.from(map, ([id, nome]) => ({ id, nome }));
  }, [audits]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const dayMs = 86_400_000;
    return audits.filter((a) => {
      if (leadFilter !== "todos" && a.lead_id !== leadFilter) return false;
      if (periodo !== "todos") {
        const days = periodo === "7" ? 7 : periodo === "30" ? 30 : 90;
        if (now - new Date(a.created_at).getTime() > days * dayMs) return false;
      }
      if (q.trim()) {
        const target = q.trim().toLowerCase();
        const name = (a.lead?.empresa || a.lead?.nome || "").toLowerCase();
        if (!name.includes(target)) return false;
      }
      return true;
    });
  }, [audits, leadFilter, periodo, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <ClipboardList className="h-6 w-6 text-primary" /> Auditorias
          </h1>
          <p className="text-sm text-muted-foreground">
            Todas as auditorias de perfis Google coletadas via extensão.
          </p>
        </div>
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa/lead…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={leadFilter} onValueChange={setLeadFilter}>
            <SelectTrigger><SelectValue placeholder="Lead" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os leads</SelectItem>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead / Empresa</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma auditoria encontrada.</TableCell></TableRow>
              )}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.lead?.empresa || a.lead?.nome || "—"}</span>
                      <Badge variant="outline" className={tipoAuditoriaBadgeClass(a.tipo_auditoria)}>
                        {tipoAuditoriaLabel(a.tipo_auditoria)}
                      </Badge>
                    </div>
                    {a.lead?.criado_por_extensao && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">criado pela extensão</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(a.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={scoreBadgeClass(a.score_geral)}>
                      {Math.round(a.score_geral)}% · {scoreLabel(a.score_geral)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a.owner?.nome || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/auditorias/$auditId" params={{ auditId: a.id }}>
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          try { downloadAuditPdf(a, "full"); } catch { toast.error("Falha ao gerar PDF"); }
                        }}
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
