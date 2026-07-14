import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Upload, Download, Search, Pencil, Trash2, MessageCircle, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { useLeads, useLeadMutations } from "@/hooks/use-leads";
import { STAGE_META, KANBAN_STAGES, ORIGIN_LABELS, ORIGINS, POTENCIAL_OPTIONS, PLANO_OPTIONS } from "@/lib/crm";
import type { LeadStage, LeadOrigin, Potencial } from "@/lib/crm";
import type { Lead } from "@/lib/leads-api";
import { formatCurrency } from "@/lib/format";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { parseLeadsCsv, exportLeadsCsv } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads · Pixel CRM" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const { create, update, remove } = useLeadMutations();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "todos">("todos");
  const [origemFilter, setOrigemFilter] = useState<LeadOrigin | "todos">("todos");
  const [potFilter, setPotFilter] = useState<Potencial | "todos">("todos");
  const [planoFilter, setPlanoFilter] = useState<string>("todos");
  const [cidadeFilter, setCidadeFilter] = useState("");
  const [ufFilter, setUfFilter] = useState("");
  const [segmentoFilter, setSegmentoFilter] = useState("");
  const [valorMin, setValorMin] = useState<string>("");
  const [diasMin, setDiasMin] = useState<string>("");
  const [googleFilter, setGoogleFilter] = useState<"todos" | "sim" | "nao">("todos");
  const [siteFilter, setSiteFilter] = useState<"todos" | "sim" | "nao">("todos");
  const [gadsFilter, setGadsFilter] = useState<"todos" | "sim" | "nao">("todos");
  const [madsFilter, setMadsFilter] = useState<"todos" | "sim" | "nao">("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);

  const activeFilters =
    (stageFilter !== "todos" ? 1 : 0) +
    (origemFilter !== "todos" ? 1 : 0) +
    (potFilter !== "todos" ? 1 : 0) +
    (planoFilter !== "todos" ? 1 : 0) +
    (cidadeFilter ? 1 : 0) +
    (ufFilter ? 1 : 0) +
    (segmentoFilter ? 1 : 0) +
    (valorMin ? 1 : 0) +
    (diasMin ? 1 : 0) +
    (googleFilter !== "todos" ? 1 : 0) +
    (siteFilter !== "todos" ? 1 : 0) +
    (gadsFilter !== "todos" ? 1 : 0) +
    (madsFilter !== "todos" ? 1 : 0);

  function clearFilters() {
    setStageFilter("todos"); setOrigemFilter("todos"); setPotFilter("todos");
    setPlanoFilter("todos"); setCidadeFilter(""); setUfFilter(""); setSegmentoFilter("");
    setValorMin(""); setDiasMin("");
    setGoogleFilter("todos"); setSiteFilter("todos"); setGadsFilter("todos"); setMadsFilter("todos");
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const vMin = valorMin ? Number(valorMin) : 0;
    const dMin = diasMin ? Number(diasMin) : 0;
    const cQ = cidadeFilter.toLowerCase();
    const ufQ = ufFilter.toLowerCase();
    const segQ = segmentoFilter.toLowerCase();
    const now = Date.now();
    function boolMatch(f: "todos" | "sim" | "nao", v: boolean) {
      if (f === "todos") return true;
      return f === "sim" ? v : !v;
    }
    return leads.filter((l) => {
      const matchSearch =
        !q ||
        l.nome.toLowerCase().includes(q) ||
        l.empresa.toLowerCase().includes(q) ||
        (l.telefone ?? "").includes(q) ||
        (l.whatsapp ?? "").includes(q) ||
        (l.instagram ?? "").toLowerCase().includes(q) ||
        (l.cidade ?? "").toLowerCase().includes(q) ||
        (l.segmento ?? "").toLowerCase().includes(q) ||
        (l.plano ?? "").toLowerCase().includes(q) ||
        (l.site ?? "").toLowerCase().includes(q) ||
        (l.observacoes ?? "").toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (stageFilter !== "todos" && l.stage !== stageFilter) return false;
      if (origemFilter !== "todos" && l.origem !== origemFilter) return false;
      if (potFilter !== "todos" && l.potencial !== potFilter) return false;
      if (planoFilter !== "todos" && l.plano !== planoFilter) return false;
      if (cQ && !(l.cidade ?? "").toLowerCase().includes(cQ)) return false;
      if (ufQ && !(l.uf ?? "").toLowerCase().includes(ufQ)) return false;
      if (segQ && !(l.segmento ?? "").toLowerCase().includes(segQ)) return false;
      if (!boolMatch(googleFilter, l.tem_perfil_google)) return false;
      if (!boolMatch(siteFilter, l.tem_site)) return false;
      if (!boolMatch(gadsFilter, l.faz_google_ads)) return false;
      if (!boolMatch(madsFilter, l.faz_meta_ads)) return false;
      if (vMin && (l.valor_contrato ?? 0) < vMin) return false;
      if (dMin) {
        const last = l.last_interaction_at ? new Date(l.last_interaction_at).getTime() : new Date(l.created_at).getTime();
        const dias = Math.floor((now - last) / 86400000);
        if (dias < dMin) return false;
      }
      return true;
    });
  }, [leads, search, stageFilter, origemFilter, potFilter, planoFilter, cidadeFilter, ufFilter, segmentoFilter, valorMin, diasMin, googleFilter, siteFilter, gadsFilter, madsFilter]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { valid, errors } = await parseLeadsCsv(file);

    let importados = 0;
    const falhas: { row: number; message: string }[] = [...errors];

    for (let i = 0; i < valid.length; i++) {
      try {
        await create.mutateAsync(valid[i]);
        importados++;
      } catch (err) {
        falhas.push({
          row: i + 2,
          message: err instanceof Error ? err.message : "Erro ao salvar no banco.",
        });
      }
    }

    const ignorados = falhas.length;
    if (importados > 0) {
      toast.success(`${importados} lead(s) importado(s), ${ignorados} ignorado(s).`);
    } else {
      toast.error(`Nenhum lead importado. ${ignorados} linha(s) ignorada(s).`);
    }

    if (ignorados > 0) {
      const detalhe = falhas
        .slice(0, 8)
        .map((f) => `Linha ${f.row}: ${f.message}`)
        .join("\n");
      const extra = ignorados > 8 ? `\n… e mais ${ignorados - 8}.` : "";
      toast.warning("Motivos das linhas ignoradas", {
        description: detalhe + extra,
        duration: 10000,
      });
    }

    if (fileRef.current) fileRef.current.value = "";
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads cadastrados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" /> Importar
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportLeadsCsv(filtered)}>
            <Download className="mr-1.5 h-4 w-4" /> Exportar
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo lead
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar em nome, empresa, telefone, cidade, plano, obs..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as LeadStage | "todos")}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estágios</SelectItem>
              {KANBAN_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Filtros
            {activeFilters > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{activeFilters}</Badge>}
          </Button>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Origem</label>
              <Select value={origemFilter} onValueChange={(v) => setOrigemFilter(v as LeadOrigin | "todos")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {ORIGINS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Potencial</label>
              <Select value={potFilter} onValueChange={(v) => setPotFilter(v as Potencial | "todos")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {POTENCIAL_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Plano</label>
              <Select value={planoFilter} onValueChange={setPlanoFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {PLANO_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Cidade contém</label>
              <Input className="h-9" value={cidadeFilter} onChange={(e) => setCidadeFilter(e.target.value)} placeholder="Ex.: Curitiba" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor contrato ≥</label>
              <Input className="h-9" type="number" min={0} value={valorMin} onChange={(e) => setValorMin(e.target.value)} placeholder="1000" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Sem contato há ≥ dias</label>
              <Input className="h-9" type="number" min={0} value={diasMin} onChange={(e) => setDiasMin(e.target.value)} placeholder="3" />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead className="hidden lg:table-cell">Origem</TableHead>
              <TableHead className="hidden sm:table-cell">Faturamento</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link to="/leads/$leadId" params={{ leadId: l.id }} className="font-medium hover:text-accent hover:underline">
                      {l.nome}
                    </Link>
                    <div className="text-xs text-muted-foreground">{l.telefone || "—"}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{l.empresa || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{ORIGIN_LABELS[l.origem]}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatCurrency(l.faturamento_mensal)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STAGE_META[l.stage].badge}>
                      {STAGE_META[l.stage].emoji} {STAGE_META[l.stage].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {l.telefone && (
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-emerald-400">
                          <a href={buildWhatsappLink(l.telefone)} target="_blank" rel="noreferrer" title="WhatsApp">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(l); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(l)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        lead={editing}
        saving={create.isPending || update.isPending}
        onSubmit={(input) => {
          if (editing) {
            update.mutate({ id: editing.id, input }, { onSuccess: () => setFormOpen(false) });
          } else {
            create.mutate(input, { onSuccess: () => setFormOpen(false) });
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead "{deleting?.nome}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleting) remove.mutate(deleting.id); setDeleting(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
