import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProposals, useProposalMutations } from "@/hooks/use-templates";
import { PROPOSAL_TYPE_LABELS, type ProposalInput, type ProposalTemplate, type ProposalType } from "@/lib/templates-api";

export const Route = createFileRoute("/_authenticated/modelos-proposta")({
  head: () => ({ meta: [{ title: "Modelos de Proposta · Pixel CRM" }] }),
  component: ProposalsPage,
});

const MAX_PROPOSALS = 3;
const empty: ProposalInput = { nome: "", tipo: "link", url: "", conteudo: "" };

function ProposalDialog({
  open,
  onOpenChange,
  proposal,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  proposal: ProposalTemplate | null;
  onSubmit: (input: ProposalInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProposalInput>(empty);

  useEffect(() => {
    if (proposal) {
      setForm({ nome: proposal.nome, tipo: proposal.tipo, url: proposal.url, conteudo: proposal.conteudo });
    } else {
      setForm(empty);
    }
  }, [proposal, open]);

  function set<K extends keyof ProposalInput>(key: K, value: ProposalInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{proposal ? "Editar proposta" : "Nova proposta"}</DialogTitle>
          <DialogDescription>Cadastre a proposta que será enviada aos leads.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required placeholder="Ex.: Proposta 1" />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PROPOSAL_TYPE_LABELS) as ProposalType[]).map((t) => (
                  <SelectItem key={t} value={t}>{PROPOSAL_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Link / URL do PDF ou documento</Label>
            <Input value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Mensagem (texto enviado no WhatsApp)</Label>
            <Textarea value={form.conteudo} onChange={(e) => set("conteudo", e.target.value)} rows={4} placeholder="Segue nossa proposta personalizada..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProposalsPage() {
  const { data: proposals = [], isLoading } = useProposals();
  const { create, update, remove } = useProposalMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalTemplate | null>(null);
  const [deleting, setDeleting] = useState<ProposalTemplate | null>(null);

  const atLimit = proposals.length >= MAX_PROPOSALS;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Modelos de Proposta</h1>
          <p className="text-sm text-muted-foreground">Até {MAX_PROPOSALS} propostas padrão · {proposals.length} cadastrada(s)</p>
        </div>
        <Button size="sm" disabled={atLimit} onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova proposta
        </Button>
      </div>

      {atLimit && (
        <p className="text-xs text-amber-400">Limite de {MAX_PROPOSALS} propostas atingido. Exclua uma para adicionar outra.</p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-12 text-center text-muted-foreground">
          Nenhuma proposta cadastrada. Crie a Proposta 1, 2 e 3. 📄
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <p className="font-semibold">{p.nome}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{PROPOSAL_TYPE_LABELS[p.tipo as ProposalType] ?? p.tipo}</Badge>
                </div>
                {p.conteudo && <p className="line-clamp-2 text-xs text-muted-foreground">{p.conteudo}</p>}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-sky-400 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Abrir proposta
                  </a>
                )}
                <div className="flex justify-end gap-1 pt-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProposalDialog
        open={open}
        onOpenChange={setOpen}
        proposal={editing}
        saving={create.isPending || update.isPending}
        onSubmit={(input) => {
          if (editing) {
            update.mutate({ id: editing.id, input }, { onSuccess: () => setOpen(false) });
          } else {
            create.mutate(input, { onSuccess: () => setOpen(false) });
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
