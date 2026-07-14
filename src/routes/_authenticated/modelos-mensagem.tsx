import { useEffect, useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, Copy, Sparkles, MessageSquare, Star, Search, CopyPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useMessages, useMessageMutations } from "@/hooks/use-templates";
import { useAuth } from "@/hooks/use-auth";
import { useProfiles } from "@/hooks/use-profiles";
import { MESSAGE_CATEGORY_LABELS, type MessageCategory, type MessageInput, type MessageTemplate } from "@/lib/templates-api";
import { TEMPLATE_VARS } from "@/lib/template-vars";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/modelos-mensagem")({
  head: () => ({ meta: [{ title: "Modelos de Mensagens · Pixel CRM" }] }),
  component: MessagesPage,
});

const empty: MessageInput = { nome: "", categoria: "outro", conteudo: "", favorito: false, compartilhada: false };

const DEFAULT_MESSAGES: MessageInput[] = [
  { nome: "Primeiro Contato", categoria: "primeiro_contato", conteudo: "Olá {primeiro_nome}! Tudo bem? Sou da Pixel Marketing. Vi seu interesse e gostaria de entender melhor como podemos ajudar a {empresa} a crescer. Podemos conversar?" },
  { nome: "Follow-up 1", categoria: "followup_1", conteudo: "Oi {primeiro_nome}! Passando para saber se você teve a chance de ver minha mensagem anterior. Fico à disposição. 😊" },
  { nome: "Follow-up 2", categoria: "followup_2", conteudo: "Olá novamente {primeiro_nome}! Não quero ser insistente, mas acredito muito que podemos gerar ótimos resultados juntos. Quando seria um bom momento?" },
  { nome: "Follow-up 3", categoria: "followup_3", conteudo: "Oi {primeiro_nome}! Ainda tem interesse em alavancar seus resultados em {cidade}? Tenho algumas ideias que podem fazer sentido." },
  { nome: "Follow-up 4", categoria: "followup_4", conteudo: "Olá {primeiro_nome}! Esta é minha última tentativa por aqui. Caso queira retomar a conversa, é só me chamar. Sucesso! 🚀" },
  { nome: "Pós-Reunião", categoria: "pos_reuniao", conteudo: "Foi ótimo conversar com você! Conforme combinamos, seguem os próximos passos. Qualquer dúvida, estou à disposição." },
  { nome: "Envio de Proposta", categoria: "envio_proposta", conteudo: "Olá {primeiro_nome}! Conforme nossa conversa, segue a proposta personalizada para a {empresa}. Dê uma olhada e me conte o que achou!" },
];

function MessageDialog({
  open,
  onOpenChange,
  message,
  onSubmit,
  saving,
  isManager,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  message: MessageTemplate | null;
  onSubmit: (input: MessageInput) => void;
  saving: boolean;
  isManager: boolean;
}) {
  const [form, setForm] = useState<MessageInput>(empty);

  useEffect(() => {
    if (message) {
      setForm({ nome: message.nome, categoria: message.categoria, conteudo: message.conteudo, favorito: message.favorito, compartilhada: message.compartilhada });
    } else {
      setForm(empty);
    }
  }, [message, open]);

  function set<K extends keyof MessageInput>(key: K, value: MessageInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function insertVar(v: string) {
    set("conteudo", `${form.conteudo}{${v}}`);
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
          <DialogDescription>Use variáveis para personalizar automaticamente por lead.</DialogDescription>
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
            <Textarea value={form.conteudo} onChange={(e) => set("conteudo", e.target.value)} rows={6} />
            <div className="flex flex-wrap gap-1 pt-1">
              {TEMPLATE_VARS.map((v) => (
                <Button key={v.key} type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => insertVar(v.key)}>
                  {`{${v.key}}`}
                </Button>
              ))}
            </div>
          </div>
          {isManager && (
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 p-3">
              <div>
                <Label className="text-sm">Compartilhar com a equipe</Label>
                <p className="text-[11px] text-muted-foreground">Todo o time verá este modelo (somente leitura).</p>
              </div>
              <Switch checked={!!form.compartilhada} onCheckedChange={(v) => set("compartilhada", v)} />
            </div>
          )}
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
  const { data: auth } = useAuth();
  const { data: profileMap } = useProfiles();
  const uid = auth?.user?.id ?? "";
  const isManager = auth?.role === "gerente";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [deleting, setDeleting] = useState<MessageTemplate | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<MessageCategory | "todas" | "favoritos">("todas");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return messages.filter((m) => {
      const matchQ = !q || m.nome.toLowerCase().includes(q) || m.conteudo.toLowerCase().includes(q);
      const matchCat =
        catFilter === "todas" ||
        (catFilter === "favoritos" ? m.favorito : m.categoria === catFilter);
      return matchQ && matchCat;
    });
  }, [messages, search, catFilter]);

  async function seedDefaults() {
    for (const m of DEFAULT_MESSAGES) {
      await create.mutateAsync(m);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text);
    toast.success("Copiado!");
  }

  const cats: { value: MessageCategory | "todas" | "favoritos"; label: string }[] = [
    { value: "todas", label: "Todas" },
    { value: "favoritos", label: "★ Favoritos" },
    ...(Object.keys(MESSAGE_CATEGORY_LABELS) as MessageCategory[]).map((c) => ({ value: c, label: MESSAGE_CATEGORY_LABELS[c] })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Modelos de Mensagens</h1>
          <p className="text-sm text-muted-foreground">{messages.length} modelo(s) · use {"{nome}"}, {"{empresa}"}, {"{cidade}"}…</p>
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

      {messages.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por nome ou conteúdo" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <Button
                key={c.value}
                variant={catFilter === c.value ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setCatFilter(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-12 text-center text-muted-foreground">
          {messages.length === 0
            ? 'Nenhum modelo ainda. Clique em "Carregar modelos padrão" para começar. 💬'
            : "Nenhum modelo corresponde ao filtro."}
        </div>
      ) : (
        (() => {
          const own = filtered.filter((m) => m.owner_id === uid);
          const shared = filtered.filter((m) => m.owner_id !== uid && m.compartilhada);
          const renderCard = (m: MessageTemplate) => {
            const canEdit = m.owner_id === uid;
            const authorName = profileMap?.get(m.owner_id) ?? "";
            return (
              <Card key={m.id} className={cn(m.favorito && "ring-1 ring-amber-400/30")}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <MessageSquare className="h-5 w-5 shrink-0 text-primary" />
                      <p className="truncate font-semibold">{m.nome}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {MESSAGE_CATEGORY_LABELS[m.categoria as MessageCategory] ?? m.categoria}
                    </Badge>
                  </div>
                  {m.compartilhada && (
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] text-primary">
                      <Users className="mr-1 h-3 w-3" />
                      {canEdit ? "Compartilhada com a equipe" : `Compartilhada por ${authorName || "equipe"}`}
                    </Badge>
                  )}
                  <p className="line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">{m.conteudo}</p>
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="ghost" size="icon"
                      className={cn("h-8 w-8", m.favorito ? "text-amber-400" : "text-muted-foreground")}
                      title={m.favorito ? "Remover dos favoritos" : "Favoritar"}
                      disabled={!canEdit}
                      onClick={() => update.mutate({ id: m.id, input: { favorito: !m.favorito } })}
                    >
                      <Star className={cn("h-4 w-4", m.favorito && "fill-current")} />
                    </Button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Copiar" onClick={() => copyToClipboard(m.conteudo)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicar (cópia privada)"
                        onClick={() => create.mutate({ nome: `${m.nome} (cópia)`, categoria: m.categoria, conteudo: m.conteudo, favorito: false, compartilhada: false })}>
                        <CopyPlus className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(m); setOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(m)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          };
          return (
            <div className="space-y-6">
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Minhas ({own.length})</h2>
                {own.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Você ainda não criou nenhum modelo.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{own.map(renderCard)}</div>
                )}
              </section>
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  <Users className="mr-1 inline h-3.5 w-3.5" /> Compartilhadas pela equipe ({shared.length})
                </h2>
                {shared.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum modelo compartilhado pela equipe.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shared.map(renderCard)}</div>
                )}
              </section>
            </div>
          );
        })()
      )}

      <MessageDialog
        open={open}
        onOpenChange={setOpen}
        message={editing}
        isManager={isManager}
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
