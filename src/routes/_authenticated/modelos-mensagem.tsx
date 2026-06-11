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
import { Plus, Pencil, Trash2, Copy, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMessages, useMessageMutations } from "@/hooks/use-templates";
import { MESSAGE_CATEGORY_LABELS, type MessageCategory, type MessageInput, type MessageTemplate } from "@/lib/templates-api";

export const Route = createFileRoute("/_authenticated/modelos-mensagem")({
  head: () => ({ meta: [{ title: "Modelos de Mensagens · Pixel CRM" }] }),
  component: MessagesPage,
});

const empty: MessageInput = { nome: "", categoria: "outro", conteudo: "" };

const DEFAULT_MESSAGES: MessageInput[] = [
  { nome: "Primeiro Contato", categoria: "primeiro_contato", conteudo: "Olá! Tudo bem? Sou da Pixel Marketing. Vi seu interesse e gostaria de entender melhor como podemos ajudar o seu negócio a crescer. Podemos conversar?" },
  { nome: "Follow-up 1", categoria: "followup_1", conteudo: "Oi! Passando para saber se você teve a chance de ver minha mensagem anterior. Fico à disposição para tirar qualquer dúvida. 😊" },
  { nome: "Follow-up 2", categoria: "followup_2", conteudo: "Olá novamente! Não quero ser insistente, mas acredito muito que podemos gerar ótimos resultados juntos. Quando seria um bom momento para conversarmos?" },
  { nome: "Follow-up 3", categoria: "followup_3", conteudo: "Oi! Ainda tem interesse em alavancar seus resultados com marketing? Tenho algumas ideias que podem fazer sentido para o seu momento." },
  { nome: "Follow-up 4", categoria: "followup_4", conteudo: "Olá! Esta é minha última tentativa por aqui. Caso queira retomar a conversa no futuro, é só me chamar. Sucesso! 🚀" },
  { nome: "Pós-Reunião", categoria: "pos_reuniao", conteudo: "Foi ótimo conversar com você! Conforme combinamos, seguem os próximos passos. Qualquer dúvida, estou à disposição." },
  { nome: "Envio de Proposta", categoria: "envio_proposta", conteudo: "Olá! Conforme nossa conversa, segue a proposta personalizada para o seu negócio. Dê uma olhada e me conte o que achou!" },
];

function MessageDialog({
  open,
  onOpenChange,
  message,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  message: MessageTemplate | null;
  onSubmit: (input: MessageInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<MessageInput>(empty);

  useEffect(() => {
    if (message) {
      setForm({ nome: message.nome, categoria: message.categoria, conteudo: message.conteudo });
    } else {
      setForm(empty);
    }
  }, [message, open]);

  function set<K extends keyof MessageInput>(key: K, value: MessageInput[K]) {
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
          <DialogTitle>{message ? "Editar mensagem" : "Nova mensagem"}</DialogTitle>
          <DialogDescription>Modelos prontos para agilizar o atendimento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(MESSAGE_CATEGORY_LABELS) as MessageCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>{MESSAGE_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea value={form.conteudo} onChange={(e) => set("conteudo", e.target.value)} rows={5} />
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

function MessagesPage() {
  const { data: messages = [], isLoading } = useMessages();
  const { create, update, remove } = useMessageMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [deleting, setDeleting] = useState<MessageTemplate | null>(null);

  async function seedDefaults() {
    for (const m of DEFAULT_MESSAGES) {
      await create.mutateAsync(m);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Modelos de Mensagens</h1>
          <p className="text-sm text-muted-foreground">{messages.length} modelo(s) cadastrado(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {messages.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedDefaults} disabled={create.isPending}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Carregar modelos padrão
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo modelo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-12 text-center text-muted-foreground">
          Nenhum modelo ainda. Clique em "Carregar modelos padrão" para começar. 💬
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {messages.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <p className="font-semibold">{m.nome}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {MESSAGE_CATEGORY_LABELS[m.categoria as MessageCategory] ?? m.categoria}
                  </Badge>
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">{m.conteudo}</p>
                <div className="flex justify-end gap-1 pt-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Copiar" onClick={() => copyToClipboard(m.conteudo)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Duplicar"
                    onClick={() => create.mutate({ nome: `${m.nome} (cópia)`, categoria: m.categoria, conteudo: m.conteudo })}
                  >
                    <Copy className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(m); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(m)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MessageDialog
        open={open}
        onOpenChange={setOpen}
        message={editing}
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
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
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
