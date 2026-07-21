import { useState, useRef, useMemo } from "react";
import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Trash2, Upload, FileText, Download, ExternalLink,
  Check, X, Video, MessageCircle, StickyNote, FilePlus2, ClipboardCheck,
  MoreHorizontal, Phone, MapPin, Building2, User, Thermometer, Target,
  DollarSign, Clock, CalendarClock, AlarmClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { LeadQuickNotes } from "@/components/lead-quick-notes";
import { LeadProposalsList } from "@/components/lead-proposals-list";
import { LeadAuditCard } from "@/components/lead-audit-card";
import { InlineField } from "@/components/inline-field";
import { LeadActivityCenter } from "@/components/lead-activity-center";
import {
  getLead, listEvents, listFiles, uploadLeadFile, getFileUrl, deleteLeadFile,
  addNote, updateLead, deleteLead, logLeadEvent, listMembers, type LeadFile,
} from "@/lib/leads-api";
import { ORIGIN_LABELS, POTENCIAL_META, STAGE_META, TEMPERATURA_META } from "@/lib/crm";
import type { Potencial, Temperatura } from "@/lib/crm";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { buildWhatsappLink, buildTelLink } from "@/lib/whatsapp";
import { daysSince } from "@/lib/notifications";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({ meta: [{ title: "Workspace do Lead · Pixel CRM" }] }),
  component: LeadDetailPage,
});

const FILE_CATEGORIES = ["Proposta", "Contrato", "PDF", "Imagem", "Outro"];

/* ---------------------------------------------------------------- */
/* Helpers                                                            */
/* ---------------------------------------------------------------- */

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

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-12 text-center">
      <div className="rounded-full border border-border/60 bg-background/60 p-2.5">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Timeline                                                           */
/* ---------------------------------------------------------------- */

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
        const meta = f === "todos" ? { label: "Todos" } : EVENT_META[f] ?? { label: f };
        const active = value === f;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] transition",
              active
                ? "border-accent/50 bg-accent/10 text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function TimelineList({
  events,
  filter,
}: {
  events: Array<{ id: string; tipo: string; descricao: string; created_at: string; autor_nome: string | null }>;
  filter: string;
}) {
  const filtered = filter === "todos" ? events : events.filter((e) => e.tipo === filter);
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title={filter === "todos" ? "Nenhum evento ainda" : "Nenhum evento desse tipo"}
        description="Notas, mudanças de etapa, propostas, auditorias e arquivos aparecerão aqui em ordem cronológica."
      />
    );
  }
  return (
    <ol className="relative space-y-5 border-l border-border/60 pl-5">
      {filtered.map((ev) => {
        const meta = EVENT_META[ev.tipo] ?? { label: ev.tipo, color: "text-muted-foreground", dot: "bg-muted-foreground" };
        return (
          <li key={ev.id} className="relative">
            <span className={cn("absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background", meta.dot)} />
            <p className="text-[11px] text-muted-foreground">
              <span className={cn("font-medium", meta.color)}>{meta.label}</span>
              {" · "}{formatDateTime(ev.created_at)}
              {ev.autor_nome ? ` · ${ev.autor_nome}` : ""}
            </p>
            <p className="text-sm text-foreground/90">{ev.descricao}</p>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------- */
/* Summary cards                                                      */
/* ---------------------------------------------------------------- */

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warn" | "success" | "danger" | "info";
  hint?: string;
}) {
  const toneCls = {
    default: "text-foreground",
    warn: "text-amber-300",
    success: "text-emerald-300",
    danger: "text-red-300",
    info: "text-sky-300",
  }[tone];
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/70">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn("mt-1.5 truncate text-lg font-semibold", toneCls)}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Right sidebar                                                      */
/* ---------------------------------------------------------------- */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-foreground">{children}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                               */
/* ---------------------------------------------------------------- */

function LeadDetailPage() {
  const { leadId } = useParams({ from: "/_authenticated/leads/$leadId" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: auth } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [note, setNote] = useState("");
  const [fileCat, setFileCat] = useState("Proposta");
  const [timelineFilter, setTimelineFilter] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState<string>("visao");
  const fileRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const leadQ = useQuery({ queryKey: ["lead", leadId], queryFn: () => getLead(leadId) });
  const eventsQ = useQuery({ queryKey: ["lead-events", leadId], queryFn: () => listEvents(leadId) });
  const filesQ = useQuery({ queryKey: ["lead-files", leadId], queryFn: () => listFiles(leadId) });
  const membersQ = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });

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

  const responsavelNome = useMemo(() => {
    if (!lead?.responsavel_id) return "";
    return membersQ.data?.find((m) => m.id === lead.responsavel_id)?.nome ?? "";
  }, [lead?.responsavel_id, membersQ.data]);

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
  const stage = STAGE_META[lead.stage];
  const temp = lead.temperatura ? TEMPERATURA_META[lead.temperatura as Temperatura] : null;
  const wa = buildWhatsappLink(lead.whatsapp || lead.telefone);
  const tel = buildTelLink(lead.telefone || lead.whatsapp);
  const dias = daysSince(lead.last_interaction_at);
  const nextFollowup = lead.proximo_followup_at
    ? new Date(lead.proximo_followup_at)
    : null;
  const followupOverdue = nextFollowup ? nextFollowup.getTime() < Date.now() : false;

  const focusNewNote = () => {
    setActiveTab("historico");
    setTimeout(() => noteRef.current?.focus(), 60);
  };

  return (
    <div className="space-y-5">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/leads"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para leads</Link>
        </Button>
      </div>

      {(lead as { criado_por_extensao?: boolean }).criado_por_extensao && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-300">Lead criado automaticamente pela extensão de auditoria</p>
          <p className="mt-0.5 text-xs text-amber-200/80">
            Complete os dados clicando em <strong>Editar</strong> para enriquecer o perfil.
          </p>
        </div>
      )}

      {/* ============ HEADER ============ */}
      <header className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Identity */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/60">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-bold leading-tight">
                  {lead.empresa || lead.nome || "Sem empresa"}
                </h1>
                {lead.empresa && lead.nome && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> {lead.nome}
                  </p>
                )}
              </div>
            </div>

            {/* Contact strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {lead.telefone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {lead.telefone}
                </span>
              )}
              {lead.whatsapp && (
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> {lead.whatsapp}
                </span>
              )}
              {(lead.cidade || lead.uf) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {[lead.cidade, lead.uf].filter(Boolean).join(" / ")}
                </span>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {stage && (
                <Badge variant="outline" className={stage.badge}>
                  {stage.emoji} {stage.label}
                </Badge>
              )}
              {temp && (
                <Badge variant="outline" className={temp.badge}>
                  <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", temp.dot)} /> {temp.label}
                </Badge>
              )}
              <Badge variant="outline" className={pot.badge}>{pot.label}</Badge>
              <Badge variant="outline" className="border-border/60 text-muted-foreground">
                {ORIGIN_LABELS[lead.origem]}
              </Badge>
              {responsavelNome && (
                <Badge variant="outline" className="border-border/60 text-muted-foreground">
                  <User className="mr-1 h-3 w-3" /> {responsavelNome}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" /> Editar
            </Button>
            {wa && (
              <Button asChild size="sm" className="bg-emerald-500/90 text-emerald-50 hover:bg-emerald-500">
                <a href={wa} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={focusNewNote}>
              <StickyNote className="mr-1.5 h-4 w-4" /> Nova nota
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("propostas")}>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Nova proposta
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("auditorias")}>
              <ClipboardCheck className="mr-1.5 h-4 w-4" /> Nova auditoria
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {tel && (
                  <DropdownMenuItem asChild>
                    <a href={tel}><Phone className="mr-2 h-4 w-4" /> Ligar</a>
                  </DropdownMenuItem>
                )}
                {lead.meet_link && (
                  <DropdownMenuItem asChild>
                    <a href={lead.meet_link} target="_blank" rel="noreferrer">
                      <Video className="mr-2 h-4 w-4" /> Abrir Meet
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setActiveTab("arquivos")}>
                  <Upload className="mr-2 h-4 w-4" /> Enviar arquivo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-400 focus:text-red-400">
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir lead
                    </DropdownMenuItem>
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ============ SUMMARY CARDS ============ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          icon={Thermometer}
          label="Temperatura"
          value={temp ? temp.label : "—"}
          tone={lead.temperatura === "quente" ? "danger" : lead.temperatura === "morno" ? "warn" : "info"}
        />
        <SummaryCard
          icon={Target}
          label="Probabilidade"
          value={lead.probabilidade_fechamento ? `${lead.probabilidade_fechamento}%` : "—"}
          tone="success"
        />
        <SummaryCard
          icon={DollarSign}
          label="Valor da proposta"
          value={formatCurrency(lead.valor_proposta || lead.valor_contrato)}
          tone="success"
        />
        <SummaryCard
          icon={Clock}
          label="Última interação"
          value={lead.last_interaction_at ? formatDateTime(lead.last_interaction_at) : "—"}
        />
        <SummaryCard
          icon={CalendarClock}
          label="Próximo follow-up"
          value={nextFollowup ? formatDateTime(nextFollowup.toISOString()) : "—"}
          tone={followupOverdue ? "danger" : "default"}
          hint={followupOverdue ? "Atrasado" : undefined}
        />
        <SummaryCard
          icon={AlarmClock}
          label="Dias sem contato"
          value={`${dias} dia${dias === 1 ? "" : "s"}`}
          tone={dias >= 3 ? "warn" : "default"}
        />
      </div>

      {/* ============ MAIN LAYOUT ============ */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Center: tabs */}
        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap bg-transparent p-0">
              <TabsTrigger value="visao">Visão geral</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
              <TabsTrigger value="propostas">Propostas</TabsTrigger>
              <TabsTrigger value="auditorias">Auditorias</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Visão geral */}
            <TabsContent value="visao" className="mt-4 space-y-4">
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Dados principais</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Telefone" value={lead.telefone} />
                  <Field label="WhatsApp" value={lead.whatsapp} />
                  <Field label="E-mail" value={lead.email} />
                  <Field label="Empresa" value={lead.empresa} />
                  <Field label="Instagram" value={lead.instagram} />
                  <Field label="Site" value={lead.site} href={lead.site || undefined} />
                  <Field label="Cidade / UF" value={[lead.cidade, lead.uf].filter(Boolean).join(" / ")} />
                  <Field label="Área de atendimento" value={lead.area_atendimento} />
                  <Field label="Segmento" value={lead.segmento} />
                  <Field label="Origem" value={ORIGIN_LABELS[lead.origem]} />
                  <Field label="Próxima ação" value={lead.proxima_acao} />
                  <Field label="Próxima reunião" value={lead.reuniao_at ? formatDateTime(lead.reuniao_at) : ""} />
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Comercial</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <Field label="Motivo da perda" value={lead.motivo_perda} />
                  {lead.observacoes && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Field label="Observações" value={lead.observacoes} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <LeadQuickNotes lead={lead} onSaved={() => qc.invalidateQueries({ queryKey: ["lead", leadId] })} />
            </TabsContent>

            {/* Timeline */}
            <TabsContent value="timeline" className="mt-4">
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold">Linha do tempo</CardTitle>
                  <TimelineFilters value={timelineFilter} onChange={setTimelineFilter} />
                </CardHeader>
                <CardContent>
                  <TimelineList events={eventsQ.data ?? []} filter={timelineFilter} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Arquivos */}
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

                  {filesQ.data && filesQ.data.length > 0 ? (
                    <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                      {filesQ.data.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 p-3">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{f.nome}</p>
                            <p className="text-xs text-muted-foreground">{f.categoria} · {(f.tamanho / 1024).toFixed(0)} KB</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFile(f)}><Download className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => delFileM.mutate(f)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Upload}
                      title="Nenhum arquivo anexado"
                      description="Envie propostas, contratos, PDFs e imagens relacionados a este lead."
                      action={
                        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                          <Upload className="mr-1.5 h-4 w-4" /> Enviar primeiro arquivo
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Propostas */}
            <TabsContent value="propostas" className="mt-4">
              <LeadProposalsList leadId={leadId} />
            </TabsContent>

            {/* Auditorias */}
            <TabsContent value="auditorias" className="mt-4">
              <LeadAuditCard leadId={leadId} />
            </TabsContent>

            {/* Marketing */}
            <TabsContent value="marketing" className="mt-4">
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Presença digital</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* Histórico (registrar nota + timeline compact) */}
            <TabsContent value="historico" className="mt-4 space-y-4">
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Registrar interação</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    ref={noteRef}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Ex.: falei no WhatsApp, ficou de retornar amanhã…"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!note.trim() || addNoteM.isPending} onClick={() => addNoteM.mutate(note.trim())}>
                      Adicionar ao histórico
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-card/60">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold">Últimos eventos</CardTitle>
                  <TimelineFilters value={timelineFilter} onChange={setTimelineFilter} />
                </CardHeader>
                <CardContent>
                  <TimelineList events={eventsQ.data ?? []} filter={timelineFilter} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Informações comerciais</p>
            <Separator className="my-3" />
            <div className="divide-y divide-border/60">
              <InfoRow label="Plano">{lead.plano || "—"}</InfoRow>
              <InfoRow label="Temperatura">{temp ? temp.label : "—"}</InfoRow>
              <InfoRow label="Origem">{ORIGIN_LABELS[lead.origem]}</InfoRow>
              <InfoRow label="Cidade">{[lead.cidade, lead.uf].filter(Boolean).join(" / ") || "—"}</InfoRow>
              <InfoRow label="Segmento">{lead.segmento || "—"}</InfoRow>
              <InfoRow label="Responsável">{responsavelNome || "—"}</InfoRow>
              <InfoRow label="Valor do contrato">
                <span className="font-medium text-emerald-300">{formatCurrency(lead.valor_contrato)}</span>
              </InfoRow>
              <InfoRow label="Valor proposta">
                {formatCurrency(lead.valor_proposta)}
              </InfoRow>
              <InfoRow label="Probabilidade">
                {lead.probabilidade_fechamento ? `${lead.probabilidade_fechamento}%` : "—"}
              </InfoRow>
              <InfoRow label="Próximo follow-up">
                <span className={followupOverdue ? "text-red-300" : ""}>
                  {nextFollowup ? formatDateTime(nextFollowup.toISOString()) : "—"}
                </span>
              </InfoRow>
              <InfoRow label="Última interação">
                {lead.last_interaction_at ? formatDateTime(lead.last_interaction_at) : "—"}
              </InfoRow>
              <InfoRow label="Dias sem contato">
                <span className={dias >= 3 ? "text-amber-300" : "text-muted-foreground"}>{dias} dia(s)</span>
              </InfoRow>
            </div>
          </div>

          {/* Quick action shortcuts (icons) */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Ações rápidas</p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {wa && (
                <Button asChild variant="outline" size="icon" title="WhatsApp" className="text-emerald-400">
                  <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>
                </Button>
              )}
              {tel && (
                <Button asChild variant="outline" size="icon" title="Ligar" className="text-sky-400">
                  <a href={tel}><Phone className="h-4 w-4" /></a>
                </Button>
              )}
              <Button variant="outline" size="icon" title="Nova nota" onClick={focusNewNote}>
                <StickyNote className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Enviar arquivo" onClick={() => setActiveTab("arquivos")}>
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>
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
