import { useState, useRef } from "react";
import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Trash2, Upload, FileText, Download, ExternalLink,
  Check, X, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { LeadSidebar } from "@/components/lead-sidebar";
import { LeadQuickNotes } from "@/components/lead-quick-notes";
import { LeadProposalsList } from "@/components/lead-proposals-list";
import { LeadAuditCard } from "@/components/lead-audit-card";
import { InlineField } from "@/components/inline-field";
import {
  getLead, listEvents, listFiles, uploadLeadFile, getFileUrl, deleteLeadFile,
  addNote, updateLead, deleteLead, logLeadEvent, type LeadFile,
} from "@/lib/leads-api";
import { ORIGIN_LABELS, POTENCIAL_META } from "@/lib/crm";
import type { Potencial } from "@/lib/crm";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({ meta: [{ title: "Ficha do Lead · Pixel CRM" }] }),
  component: LeadDetailPage,
});

const FILE_CATEGORIES = ["Proposta", "Contrato", "PDF", "Imagem", "Outro"];

function Field({ label, value, href }: { label: string; value?: React.ReactNode; href?: string }) {
  const empty = value === "" || value === null || value === undefined;
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</p>
      {empty ? (
        <p className="text-sm text-muted-foreground/50">—</p>
      ) : href ? (
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          {value} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="text-sm">{value}</p>
      )}
    </div>
  );
}

function YesNo({ v }: { v: boolean }) {
  return v ? (
    <span className="inline-flex items-center gap-1 text-emerald-400"><Check className="h-3.5 w-3.5" /> Sim</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground"><X className="h-3.5 w-3.5" /> Não</span>
  );
}

const EVENT_META: Record<string, { label: string; color: string; dot: string }> = {
  criado:        { label: "Criado",       color: "text-sky-400",     dot: "bg-sky-400" },
  atualizado:    { label: "Atualizado",   color: "text-muted-foreground", dot: "bg-muted-foreground" },
  nota:          { label: "Nota",         color: "text-accent",      dot: "bg-accent" },
  movimentacao:  { label: "Movimentação", color: "text-violet-400",  dot: "bg-violet-400" },
  arquivo:       { label: "Arquivo",      color: "text-amber-400",   dot: "bg-amber-400" },
  proposta:      { label: "Proposta",     color: "text-emerald-400", dot: "bg-emerald-400" },
};

const FILTER_ORDER = ["todos", "nota", "movimentacao", "atualizado", "arquivo", "proposta"];

function TimelineFilters({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {FILTER_ORDER.map((f) => {
        const meta = f === "todos" ? { label: "Todos", color: "text-foreground" } : EVENT_META[f] ?? { label: f, color: "text-foreground" };
        const active = value === f;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
              active
                ? "border-accent/50 bg-accent/10 text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function TimelineList({ events, filter }: { events: Array<{ id: string; tipo: string; descricao: string; created_at: string; autor_nome: string | null }>; filter: string }) {
  const filtered = filter === "todos" ? events : events.filter((e) => e.tipo === filter);
  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento {filter !== "todos" ? "desse tipo " : ""}ainda.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-border/60 pl-4">
      {filtered.map((ev) => {
        const meta = EVENT_META[ev.tipo] ?? { label: ev.tipo, color: "text-muted-foreground", dot: "bg-muted-foreground" };
        return (
          <li key={ev.id} className="relative">
            <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${meta.dot}`} />
            <p className="text-[11px] text-muted-foreground">
              <span className={`font-medium ${meta.color}`}>{meta.label}</span>
              {" · "}{formatDateTime(ev.created_at)}
              {ev.autor_nome ? ` · ${ev.autor_nome}` : ""}
            </p>
            <p className="text-sm">{ev.descricao}</p>
          </li>
        );
      })}
    </ol>
  );
}

function LeadDetailPage() {
  const { leadId } = useParams({ from: "/_authenticated/leads/$leadId" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: auth } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [note, setNote] = useState("");
  const [fileCat, setFileCat] = useState("Proposta");
  const [timelineFilter, setTimelineFilter] = useState<string>("todos");
  const fileRef = useRef<HTMLInputElement>(null);

  const leadQ = useQuery({ queryKey: ["lead", leadId], queryFn: () => getLead(leadId) });
  const eventsQ = useQuery({ queryKey: ["lead-events", leadId], queryFn: () => listEvents(leadId) });
  const filesQ = useQuery({ queryKey: ["lead-files", leadId], queryFn: () => listFiles(leadId) });

  const lead = leadQ.data;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
    qc.invalidateQueries({ queryKey: ["lead-events", leadId] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const saveEdit = useMutation({
    mutationFn: (input: Parameters<typeof updateLead>[1]) => updateLead(leadId, input),
    onSuccess: () => { invalidateAll(); setEditOpen(false); toast.success("Lead atualizado!"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const addNoteM = useMutation({
    mutationFn: async (conteudo: string) => {
      await addNote(leadId, conteudo, auth?.nome ?? "");
      await logLeadEvent(leadId, "nota", conteudo);
    },
    onSuccess: () => { setNote(""); qc.invalidateQueries({ queryKey: ["lead-events", leadId] }); toast.success("Anotação adicionada"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const uploadM = useMutation({
    mutationFn: (file: File) => uploadLeadFile(leadId, file, fileCat),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead-files", leadId] }); qc.invalidateQueries({ queryKey: ["lead-events", leadId] }); toast.success("Arquivo enviado"); },
    onError: (e: Error) => toast.error("Erro no upload", { description: e.message }),
  });

  const delFileM = useMutation({
    mutationFn: (f: LeadFile) => deleteLeadFile(f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead-files", leadId] }); toast.success("Arquivo removido"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const removeLead = useMutation({
    mutationFn: () => deleteLead(leadId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast.success("Lead excluído"); navigate({ to: "/leads" }); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  async function openFile(f: LeadFile) {
    try {
      const url = await getFileUrl(f.path);
      window.open(url, "_blank");
    } catch {
      toast.error("Não foi possível abrir o arquivo");
    }
  }

  if (leadQ.isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!lead) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Lead não encontrado.</p>
        <Button asChild variant="outline"><Link to="/leads"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar</Link></Button>
      </div>
    );
  }

  const priority = (lead.potencial as Potencial) in POTENCIAL_META ? (lead.potencial as Potencial) : "media";
  const pot = POTENCIAL_META[priority];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/leads"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para leads</Link>
        </Button>
        <div className="flex items-center gap-2">
          {lead.meet_link && (
            <Button asChild variant="outline" size="sm" className="text-violet-300">
              <a href={lead.meet_link} target="_blank" rel="noreferrer"><Video className="mr-1.5 h-4 w-4" /> Meet</a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => removeLead.mutate()}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>


      {(lead as any).criado_por_extensao && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-300">Lead criado automaticamente pela extensão de auditoria</p>
          <p className="mt-0.5 text-xs text-amber-200/80">
            Complete os dados manualmente clicando em <strong>Editar</strong> acima para enriquecer o perfil.
          </p>
        </div>
      )}


      {/* Two-column layout: fixed sidebar + main content */}
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Fixed sidebar */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <LeadSidebar lead={lead} />
          <LeadQuickNotes lead={lead} onSaved={() => qc.invalidateQueries({ queryKey: ["lead", leadId] })} />
        </div>

        {/* Main tabs */}
        <div>
          <Tabs defaultValue="geral">
            <TabsList className="flex-wrap bg-transparent p-0">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="propostas">Propostas</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="mt-4">
              <Card className="border-border/60 bg-card/60">
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Telefone" value={lead.telefone} />
                  <Field label="WhatsApp" value={lead.whatsapp} />
                  <Field label="Empresa" value={lead.empresa} />
                  <Field label="Instagram" value={lead.instagram} />
                  <Field label="Site" value={lead.site} href={lead.site || undefined} />
                  <Field label="Cidade / UF" value={[lead.cidade, lead.uf].filter(Boolean).join(" / ")} />
                  <Field label="Área de atendimento" value={lead.area_atendimento} />
                  <Field label="Segmento" value={lead.segmento} />
                  <Field label="Origem" value={ORIGIN_LABELS[lead.origem]} />
                  <Field label="Próxima ação" value={lead.proxima_acao} />
                  <Field label="Próxima reunião" value={lead.reuniao_at ? formatDateTime(lead.reuniao_at) : ""} />
                  <Field label="Criado em" value={formatDateTime(lead.created_at)} />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Field label="Observações" value={lead.observacoes} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comercial" className="mt-4">
              <Card className="border-border/60 bg-card/60">
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                  <InlineField
                    label="Plano"
                    value={lead.plano}
                    placeholder="Ex.: SEO Local Premium"
                    onSave={(v) => saveEdit.mutateAsync({ plano: v })}
                  />
                  <InlineField
                    label="Valor do contrato"
                    value={lead.valor_contrato}
                    type="number"
                    placeholder="R$ 0,00"
                    displayFormat={(v) => formatCurrency(Number(v))}
                    onSave={(v) => saveEdit.mutateAsync({ valor_contrato: Number(v) || 0 })}
                  />
                  <InlineField
                    label="Faturamento mensal"
                    value={lead.faturamento_mensal}
                    type="number"
                    placeholder="R$ 0,00"
                    displayFormat={(v) => formatCurrency(Number(v))}
                    onSave={(v) => saveEdit.mutateAsync({ faturamento_mensal: Number(v) || 0 })}
                  />
                  <InlineField
                    label="Status"
                    value={lead.status_comercial}
                    placeholder="—"
                    onSave={(v) => saveEdit.mutateAsync({ status_comercial: v })}
                  />
                  <Field label="Potencial" value={pot.label} />
                  <Field label="Origem" value={ORIGIN_LABELS[lead.origem]} />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Field label="Observações" value={lead.observacoes} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="marketing" className="mt-4">
              <Card className="border-border/60 bg-card/60">
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-0.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Perfil no Google</p>
                    <YesNo v={lead.tem_perfil_google} />
                  </div>
                  <Field label="Link do Perfil" value={lead.link_perfil_google} href={lead.link_perfil_google || undefined} />
                  <div className="space-y-0.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Possui Site</p>
                    <YesNo v={lead.tem_site} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Faz Google Ads</p>
                    <YesNo v={lead.faz_google_ads} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Faz Meta Ads</p>
                    <YesNo v={lead.faz_meta_ads} />
                  </div>
                  <Field label="Instagram" value={lead.instagram} />
                  <Field label="Área de atendimento" value={lead.area_atendimento} />
                  <div className="space-y-0.5 sm:col-span-2 lg:col-span-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Como chegam clientes hoje</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.canais_aquisicao.length ? lead.canais_aquisicao.map((c) => (
                        <Badge key={c} variant="secondary">{c}</Badge>
                      )) : <span className="text-sm text-muted-foreground/50">—</span>}
                    </div>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3"><Field label="Principal objetivo" value={lead.objetivo} /></div>
                  <div className="sm:col-span-2 lg:col-span-3"><Field label="Principal dificuldade" value={lead.dificuldade} /></div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="propostas" className="mt-4">
              <LeadProposalsList leadId={leadId} />
            </TabsContent>

            <TabsContent value="historico" className="mt-4 space-y-4">
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Registrar interação</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ex.: falei no WhatsApp, ficou de retornar amanhã…" />
                  <Button size="sm" disabled={!note.trim() || addNoteM.isPending} onClick={() => addNoteM.mutate(note.trim())}>
                    Adicionar ao histórico
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
                  <TimelineFilters value={timelineFilter} onChange={setTimelineFilter} />
                </CardHeader>
                <CardContent>
                  <TimelineList events={eventsQ.data ?? []} filter={timelineFilter} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="arquivos" className="mt-4">
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Anexos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Categoria</Label>
                      <Select value={fileCat} onValueChange={setFileCat}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,image/*,.doc,.docx"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadM.mutate(f); e.target.value = ""; }}
                    />
                    <Button size="sm" variant="outline" disabled={uploadM.isPending} onClick={() => fileRef.current?.click()}>
                      <Upload className="mr-1.5 h-4 w-4" /> {uploadM.isPending ? "Enviando..." : "Enviar arquivo"}
                    </Button>
                  </div>

                  <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {filesQ.data && filesQ.data.length > 0 ? filesQ.data.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 p-3">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{f.nome}</p>
                          <p className="text-xs text-muted-foreground">{f.categoria} · {(f.tamanho / 1024).toFixed(0)} KB</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFile(f)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => delFileM.mutate(f)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )) : (
                      <p className="p-4 text-center text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <LeadFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        saving={saveEdit.isPending}
        onSubmit={(input) => saveEdit.mutate(input)}
      />
    </div>
  );
}
