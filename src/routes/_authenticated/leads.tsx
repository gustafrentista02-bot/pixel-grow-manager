import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Upload, Download, Search, Pencil, Trash2, MessageCircle } from "lucide-react";
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
import { STAGE_META, KANBAN_STAGES, ORIGIN_LABELS } from "@/lib/crm";
import type { LeadStage } from "@/lib/crm";
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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => {
      const matchSearch =
        !q ||
        l.nome.toLowerCase().includes(q) ||
        l.empresa.toLowerCase().includes(q) ||
        l.telefone.includes(q) ||
        l.whatsapp.includes(q) ||
        l.instagram.toLowerCase().includes(q) ||
        l.cidade.toLowerCase().includes(q) ||
        l.segmento.toLowerCase().includes(q);
      const matchStage = stageFilter === "todos" || l.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [leads, search, stageFilter]);

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

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nome, empresa ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} />
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
