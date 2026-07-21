import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Upload,
  Download,
  Search,
  Pencil,
  Trash2,
  MessageCircle,
  SlidersHorizontal,
  X,
  MoreHorizontal,
  ExternalLink,
  Flame,
  UserPlus,
  Clock,
  AlertTriangle,
  Users,
  Inbox,
  AlertCircle,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { useLeads, useLeadMutations } from "@/hooks/use-leads";
import { useProfiles } from "@/hooks/use-profiles";
import {
  STAGE_META,
  KANBAN_STAGES,
  ORIGINS,
  POTENCIAL_OPTIONS,
  PLANO_OPTIONS,
  TEMPERATURA_META,
} from "@/lib/crm";
import type { LeadStage, LeadOrigin, Potencial, Temperatura } from "@/lib/crm";
import type { Lead } from "@/lib/leads-api";
import { formatDate } from "@/lib/format";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { parseLeadsCsv, exportLeadsCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads · Pixel CRM" },
      { name: "description", content: "Gestão completa de leads Pixel CRM: filtros, cadência e follow-up." },
    ],
  }),
  component: LeadsPage,
});

const SEM_INTERACAO_DIAS = 7;

function relativeDays(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}

function initials(name: string): string {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

/** Compact metric card for the top strip. */
function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    default: "text-muted-foreground",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
    info: "text-sky-400",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors",
        "hover:border-primary/40 hover:bg-card/80",
        active && "border-primary/60 bg-primary/5",
        !onClick && "cursor-default",
      )}
    >
      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary/50", tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </button>
  );
}

function LeadsPage() {
  const { data: leads = [], isLoading, isError, refetch } = useLeads();
  const { create, update, remove } = useLeadMutations();
  const { data: profilesMap } = useProfiles();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "todos">("todos");
  const [tempFilter, setTempFilter] = useState<Temperatura | "todos" | "sem">("todos");
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
  const [quickFilter, setQuickFilter] = useState<
    "todos" | "novos" | "quentes" | "followup" | "sem_interacao"
  >("todos");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);

  const activeFilters =
    (stageFilter !== "todos" ? 1 : 0) +
    (tempFilter !== "todos" ? 1 : 0) +
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
    setStageFilter("todos");
    setTempFilter("todos");
    setOrigemFilter("todos");
    setPotFilter("todos");
    setPlanoFilter("todos");
    setCidadeFilter("");
    setUfFilter("");
    setSegmentoFilter("");
    setValorMin("");
    setDiasMin("");
    setGoogleFilter("todos");
    setSiteFilter("todos");
    setGadsFilter("todos");
    setMadsFilter("todos");
    setQuickFilter("todos");
  }

  // Top KPIs (based on all leads)
  const stats = useMemo(() => {
    const now = Date.now();
    let novos = 0, quentes = 0, followup = 0, semInteracao = 0;
    for (const l of leads) {
      if (l.stage === "lead_novo") novos++;
      if (l.temperatura === "quente") quentes++;
      if (l.stage === "follow_up") followup++;
      const last = l.last_interaction_at
        ? new Date(l.last_interaction_at).getTime()
        : new Date(l.created_at).getTime();
      const dias = Math.floor((now - last) / 86400000);
      if (dias >= SEM_INTERACAO_DIAS && l.stage !== "ganho" && l.stage !== "perdido") {
        semInteracao++;
      }
    }
    return { total: leads.length, novos, quentes, followup, semInteracao };
  }, [leads]);

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

      // quick filter chips
      if (quickFilter === "novos" && l.stage !== "lead_novo") return false;
      if (quickFilter === "quentes" && l.temperatura !== "quente") return false;
      if (quickFilter === "followup" && l.stage !== "follow_up") return false;
      if (quickFilter === "sem_interacao") {
        const last = l.last_interaction_at
          ? new Date(l.last_interaction_at).getTime()
          : new Date(l.created_at).getTime();
        const dias = Math.floor((now - last) / 86400000);
        if (dias < SEM_INTERACAO_DIAS || l.stage === "ganho" || l.stage === "perdido") return false;
      }

      if (stageFilter !== "todos" && l.stage !== stageFilter) return false;
      if (tempFilter !== "todos") {
        if (tempFilter === "sem") {
          if (l.temperatura) return false;
        } else if (l.temperatura !== tempFilter) return false;
      }
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
        const last = l.last_interaction_at
          ? new Date(l.last_interaction_at).getTime()
          : new Date(l.created_at).getTime();
        const dias = Math.floor((now - last) / 86400000);
        if (dias < dMin) return false;
      }
      return true;
    });
  }, [
    leads, search, quickFilter, stageFilter, tempFilter, origemFilter, potFilter, planoFilter,
    cidadeFilter, ufFilter, segmentoFilter, valorMin, diasMin,
    googleFilter, siteFilter, gadsFilter, madsFilter,
  ]);

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

  const totalColumns = 9;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        {/* ==== TOP BAR ==== */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight">Leads</h1>
              <Badge variant="secondary" className="rounded-full font-mono text-[11px]">
                {leads.length}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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

          {/* Search + filters button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Buscar por nome, empresa, telefone, cidade, plano, observações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters || activeFilters > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Filtros
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
                  {activeFilters}
                </Badge>
              )}
            </Button>
            {(activeFilters > 0 || quickFilter !== "todos") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* ==== TOP CARDS ==== */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
            icon={Users}
            active={quickFilter === "todos"}
            onClick={() => setQuickFilter("todos")}
          />
          <StatCard
            label="Novos"
            value={stats.novos}
            icon={UserPlus}
            tone="info"
            active={quickFilter === "novos"}
            onClick={() => setQuickFilter(quickFilter === "novos" ? "todos" : "novos")}
          />
          <StatCard
            label="Quentes"
            value={stats.quentes}
            icon={Flame}
            tone="danger"
            active={quickFilter === "quentes"}
            onClick={() => setQuickFilter(quickFilter === "quentes" ? "todos" : "quentes")}
          />
          <StatCard
            label="Follow-ups"
            value={stats.followup}
            icon={Clock}
            tone="warning"
            active={quickFilter === "followup"}
            onClick={() => setQuickFilter(quickFilter === "followup" ? "todos" : "followup")}
          />
          <StatCard
            label="Sem interação"
            value={stats.semInteracao}
            icon={AlertTriangle}
            tone="warning"
            active={quickFilter === "sem_interacao"}
            onClick={() => setQuickFilter(quickFilter === "sem_interacao" ? "todos" : "sem_interacao")}
          />
        </div>

        {/* ==== TABLE ==== */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[22%] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Empresa</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Contato</TableHead>
                  <TableHead className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground xl:table-cell">Cidade</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Etapa</TableHead>
                  <TableHead className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">Temp.</TableHead>
                  <TableHead className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">Próx. follow-up</TableHead>
                  <TableHead className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:table-cell">Última interação</TableHead>
                  <TableHead className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground xl:table-cell">Responsável</TableHead>
                  <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <LoadingRows columns={totalColumns} />
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={totalColumns} className="py-16">
                      <EmptyState
                        icon={AlertCircle}
                        title="Erro ao carregar leads"
                        description="Tente novamente em alguns instantes."
                        action={<Button size="sm" variant="outline" onClick={() => refetch()}>Recarregar</Button>}
                        tone="danger"
                      />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalColumns} className="py-16">
                      {leads.length === 0 ? (
                        <EmptyState
                          icon={Inbox}
                          title="Nenhum lead ainda"
                          description="Cadastre o primeiro lead ou importe uma planilha para começar."
                          action={
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                                <Plus className="mr-1.5 h-4 w-4" /> Novo lead
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                                <Upload className="mr-1.5 h-4 w-4" /> Importar CSV
                              </Button>
                            </div>
                          }
                        />
                      ) : (
                        <EmptyState
                          icon={Search}
                          title="Nenhum resultado"
                          description="Ajuste a busca ou limpe os filtros para ver mais leads."
                          action={
                            <Button size="sm" variant="outline" onClick={() => { clearFilters(); setSearch(""); }}>
                              Limpar filtros
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <LeadRow
                      key={l.id}
                      lead={l}
                      responsavelNome={l.responsavel_id ? profilesMap?.get(l.responsavel_id) ?? "" : ""}
                      onOpen={() => navigate({ to: "/leads/$leadId", params: { leadId: l.id } })}
                      onEdit={() => { setEditing(l); setFormOpen(true); }}
                      onDelete={() => setDeleting(l)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span>{filtered.length} de {leads.length} leads</span>
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="hover:text-foreground"
                >
                  Limpar {activeFilters} filtro{activeFilters > 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ==== FILTERS PANEL ==== */}
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                {activeFilters === 0
                  ? "Nenhum filtro ativo."
                  : `${activeFilters} filtro${activeFilters > 1 ? "s" : ""} ativo${activeFilters > 1 ? "s" : ""}.`}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-5">
              <FilterGroup title="Comercial">
                <FilterField label="Estágio">
                  <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as LeadStage | "todos")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {KANBAN_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Temperatura">
                  <Select value={tempFilter} onValueChange={(v) => setTempFilter(v as Temperatura | "todos" | "sem")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="quente">Quente</SelectItem>
                      <SelectItem value="morno">Morno</SelectItem>
                      <SelectItem value="frio">Frio</SelectItem>
                      <SelectItem value="sem">Sem temperatura</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Potencial">
                  <Select value={potFilter} onValueChange={(v) => setPotFilter(v as Potencial | "todos")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {POTENCIAL_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Origem">
                  <Select value={origemFilter} onValueChange={(v) => setOrigemFilter(v as LeadOrigin | "todos")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {ORIGINS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Plano">
                  <Select value={planoFilter} onValueChange={setPlanoFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {PLANO_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Valor contrato ≥">
                  <Input className="h-9" type="number" min={0} value={valorMin} onChange={(e) => setValorMin(e.target.value)} placeholder="1000" />
                </FilterField>

                <FilterField label="Sem contato há ≥ dias">
                  <Input className="h-9" type="number" min={0} value={diasMin} onChange={(e) => setDiasMin(e.target.value)} placeholder="3" />
                </FilterField>
              </FilterGroup>

              <FilterGroup title="Localização">
                <FilterField label="Cidade contém">
                  <Input className="h-9" value={cidadeFilter} onChange={(e) => setCidadeFilter(e.target.value)} placeholder="Ex.: Curitiba" />
                </FilterField>
                <FilterField label="Estado (UF)">
                  <Input className="h-9" maxLength={2} value={ufFilter} onChange={(e) => setUfFilter(e.target.value.toUpperCase())} placeholder="PR" />
                </FilterField>
                <FilterField label="Segmento contém">
                  <Input className="h-9" value={segmentoFilter} onChange={(e) => setSegmentoFilter(e.target.value)} placeholder="Ex.: advocacia" />
                </FilterField>
              </FilterGroup>

              <FilterGroup title="Presença digital">
                <FilterField label="Perfil Google">
                  <Select value={googleFilter} onValueChange={(v) => setGoogleFilter(v as "todos" | "sim" | "nao")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="sim">Com Perfil Google</SelectItem>
                      <SelectItem value="nao">Sem Perfil Google</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Site">
                  <Select value={siteFilter} onValueChange={(v) => setSiteFilter(v as "todos" | "sim" | "nao")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="sim">Com site</SelectItem>
                      <SelectItem value="nao">Sem site</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Google Ads">
                  <Select value={gadsFilter} onValueChange={(v) => setGadsFilter(v as "todos" | "sim" | "nao")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="sim">Faz Google Ads</SelectItem>
                      <SelectItem value="nao">Não faz</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Meta Ads">
                  <Select value={madsFilter} onValueChange={(v) => setMadsFilter(v as "todos" | "sim" | "nao")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="sim">Faz Meta Ads</SelectItem>
                      <SelectItem value="nao">Não faz</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              </FilterGroup>
            </div>

            <SheetFooter className="mt-6 flex-row justify-between gap-2 sm:justify-between">
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilters === 0}>
                <X className="mr-1.5 h-4 w-4" /> Limpar tudo
              </Button>
              <Button size="sm" onClick={() => setShowFilters(false)}>
                Aplicar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

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
    </TooltipProvider>
  );
}

/* ---------------------- Sub-components ---------------------- */

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col-span-2 space-y-1.5 sm:col-span-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function LeadRow({
  lead,
  responsavelNome,
  onOpen,
  onEdit,
  onDelete,
}: {
  lead: Lead;
  responsavelNome: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stage = STAGE_META[lead.stage];
  const temp = lead.temperatura ? TEMPERATURA_META[lead.temperatura] : null;
  const phone = lead.whatsapp || lead.telefone;
  const wa = buildWhatsappLink(phone);
  const lastRef = lead.last_interaction_at ?? lead.created_at;
  const followupOverdue =
    lead.stage === "follow_up" &&
    lead.proximo_followup_at &&
    new Date(lead.proximo_followup_at).getTime() < Date.now();
  const semInteracaoDias = Math.floor((Date.now() - new Date(lastRef).getTime()) / 86400000);
  const semInteracao =
    semInteracaoDias >= SEM_INTERACAO_DIAS &&
    lead.stage !== "ganho" &&
    lead.stage !== "perdido";

  return (
    <TableRow className="group cursor-pointer" onClick={onOpen}>
      {/* Empresa */}
      <TableCell className="py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
            {initials(lead.empresa || lead.nome)}
          </div>
          <div className="min-w-0">
            <Link
              to="/leads/$leadId"
              params={{ leadId: lead.id }}
              onClick={(e) => e.stopPropagation()}
              className="block truncate font-medium hover:text-primary hover:underline"
            >
              {lead.empresa || lead.nome}
            </Link>
            {lead.empresa && lead.nome && lead.empresa !== lead.nome && (
              <div className="truncate text-xs text-muted-foreground">{lead.nome}</div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Contato */}
      <TableCell className="py-3">
        <div className="min-w-0 text-sm">
          <div className="truncate">{lead.telefone || lead.whatsapp || "—"}</div>
          {lead.email && (
            <div className="truncate text-xs text-muted-foreground">{lead.email}</div>
          )}
        </div>
      </TableCell>

      {/* Cidade */}
      <TableCell className="hidden py-3 text-sm text-muted-foreground xl:table-cell">
        {lead.cidade ? `${lead.cidade}${lead.uf ? `/${lead.uf}` : ""}` : "—"}
      </TableCell>

      {/* Etapa */}
      <TableCell className="py-3">
        <Badge variant="outline" className={cn("gap-1.5", stage.badge)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", stage.dot)} />
          {stage.label}
        </Badge>
      </TableCell>

      {/* Temperatura */}
      <TableCell className="hidden py-3 lg:table-cell">
        {temp ? (
          <Badge variant="outline" className={cn("gap-1.5", temp.badge)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", temp.dot)} />
            {temp.label}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Próximo follow-up */}
      <TableCell className="hidden py-3 text-sm lg:table-cell">
        {lead.proximo_followup_at ? (
          <span className={cn(followupOverdue && "text-red-400 font-medium")}>
            {formatDate(lead.proximo_followup_at)}
            {followupOverdue && (
              <Badge variant="outline" className="ml-1.5 h-5 gap-1 border-red-400/30 bg-red-400/10 px-1.5 text-[10px] text-red-300">
                atrasado
              </Badge>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Última interação */}
      <TableCell className="hidden py-3 text-sm md:table-cell">
        <span className={cn(semInteracao ? "text-amber-400" : "text-muted-foreground")}>
          {relativeDays(lastRef)}
        </span>
      </TableCell>

      {/* Responsável */}
      <TableCell className="hidden py-3 text-sm xl:table-cell">
        {responsavelNome ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
                {initials(responsavelNome)}
              </div>
            </TooltipTrigger>
            <TooltipContent>{responsavelNome}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Ações */}
      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
          {wa && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:bg-emerald-400/10">
                  <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link to="/leads/$leadId" params={{ leadId: lead.id }} aria-label="Abrir lead">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir lead</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir ficha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

function LoadingRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, j) => (
            <TableCell key={j} className="py-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-secondary/60" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <div className={cn(
        "grid h-12 w-12 place-items-center rounded-full",
        tone === "danger" ? "bg-red-400/10 text-red-400" : "bg-secondary/60 text-muted-foreground",
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
