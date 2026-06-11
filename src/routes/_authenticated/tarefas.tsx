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
import { Plus, Pencil, Trash2, CalendarClock, CheckCircle2, Circle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { useTasks, useTaskMutations } from "@/hooks/use-tasks";
import { useLeads } from "@/hooks/use-leads";
import type { Task, TaskInput } from "@/lib/tasks-api";
import { formatDate } from "@/lib/format";
import { daysUntilDate } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas · Pixel CRM" }] }),
  component: TasksPage,
});

const QUICK_TITLES = ["Ligar amanhã", "Enviar proposta", "Fazer follow-up", "Marcar reunião"];

const empty: TaskInput = {
  titulo: "",
  descricao: "",
  due_date: null,
  due_time: null,
  lead_id: null,
};

function TaskDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: Task | null;
  onSubmit: (input: TaskInput) => void;
  saving: boolean;
}) {
  const { data: leads = [] } = useLeads();
  const [form, setForm] = useState<TaskInput>(empty);

  useEffect(() => {
    if (task) {
      setForm({
        titulo: task.titulo,
        descricao: task.descricao,
        due_date: task.due_date,
        due_time: task.due_time,
        lead_id: task.lead_id,
      });
    } else {
      setForm(empty);
    }
  }, [task, open]);

  function set<K extends keyof TaskInput>(key: K, value: TaskInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Defina o que precisa ser feito e quando.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required placeholder="Ex.: Ligar amanhã" />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_TITLES.map((t) => (
                <Button key={t} type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => set("titulo", t)}>
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={form.due_time ?? ""} onChange={(e) => set("due_time", e.target.value || null)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Vincular a um lead</Label>
            <Select
              value={form.lead_id ?? "none"}
              onValueChange={(v) => set("lead_id", v === "none" ? null : v)}
            >
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}{l.empresa ? ` — ${l.empresa}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} rows={3} />
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

function dueBadge(task: Task) {
  if (!task.due_date) return null;
  const d = daysUntilDate(task.due_date);
  const label = `${formatDate(task.due_date)}${task.due_time ? ` ${task.due_time}` : ""}`;
  let cls = "bg-secondary text-muted-foreground";
  if (!task.done && d !== null) {
    if (d < 0) cls = "bg-destructive/15 text-destructive border-destructive/30";
    else if (d === 0) cls = "bg-amber-400/15 text-amber-300 border-amber-400/30";
  }
  return (
    <Badge variant="outline" className={cls}>
      <CalendarClock className="mr-1 h-3 w-3" /> {label}{!task.done && d !== null && d < 0 ? " (vencida)" : ""}
    </Badge>
  );
}

function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: leads = [] } = useLeads();
  const { create, update, toggle, remove } = useTaskMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const leadName = useMemo(() => {
    const m = new Map(leads.map((l) => [l.id, l.nome]));
    return (id: string | null) => (id ? m.get(id) ?? "Lead removido" : null);
  }, [leads]);

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  function renderTask(t: Task) {
    return (
      <Card key={t.id} className={t.done ? "opacity-60" : ""}>
        <CardContent className="flex items-start gap-3 p-3">
          <button onClick={() => toggle.mutate({ id: t.id, done: !t.done })} className="mt-0.5 shrink-0" aria-label="Concluir">
            {t.done ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${t.done ? "line-through" : ""}`}>{t.titulo}</p>
            {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {dueBadge(t)}
              {leadName(t.lead_id) && (
                <Badge variant="secondary" className="text-[10px]">
                  <Link2 className="mr-1 h-3 w-3" /> {leadName(t.lead_id)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(t); setOpen(true); }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(t)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Tarefas</h1>
          <p className="text-sm text-muted-foreground">{pending.length} pendente(s) · {done.length} concluída(s)</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-12 text-center text-muted-foreground">
          Nenhuma tarefa ainda. Crie a primeira! 🔔
        </div>
      ) : (
        <div className="space-y-5">
          {pending.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Pendentes</h2>
              {pending.map(renderTask)}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Concluídas</h2>
              {done.map(renderTask)}
            </div>
          )}
        </div>
      )}

      <TaskDialog
        open={open}
        onOpenChange={setOpen}
        task={editing}
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
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
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
