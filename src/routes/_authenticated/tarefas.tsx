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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  CheckCircle2,
  Circle,
  Link2,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  type Task,
  type TaskInput,
  type TaskCategoria,
  type TaskPrioridade,
} from "@/lib/tasks-api";
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
  categoria: "outro",
  prioridade: "media",
};

const CAT_META = Object.fromEntries(TASK_CATEGORIES.map((c) => [c.value, c])) as Record<
  TaskCategoria,
  (typeof TASK_CATEGORIES)[number]
>;
const PRIO_META = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p])) as Record<
  TaskPrioridade,
  (typeof TASK_PRIORITIES)[number]
>;

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
        categoria: (task.categoria as TaskCategoria) ?? "outro",
        prioridade: (task.prioridade as TaskPrioridade) ?? "media",
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
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v as TaskCategoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v as TaskPrioridade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

type GroupBy = "prazo" | "categoria" | "prioridade";

const PRAZO_ORDER = ["Vencidas", "Hoje", "Amanhã", "Esta semana", "Depois", "Sem prazo"] as const;
type PrazoBucket = (typeof PRAZO_ORDER)[number];

function bucketByPrazo(t: Task): PrazoBucket {
  const d = daysUntilDate(t.due_date);
  if (d === null) return "Sem prazo";
  if (d < 0) return "Vencidas";
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d <= 7) return "Esta semana";
  return "Depois";
}

function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: leads = [] } = useLeads();
  const { create, update, toggle, remove } = useTaskMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("prazo");
  const [filterCat, setFilterCat] = useState<TaskCategoria | "all">("all");
  const [filterPrio, setFilterPrio] = useState<TaskPrioridade | "all">("all");
  const [showDone, setShowDone] = useState(false);

  const leadName = useMemo(() => {
    const m = new Map(leads.map((l) => [l.id, l.nome]));
    return (id: string | null) => (id ? m.get(id) ?? "Lead removido" : null);
  }, [leads]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!showDone && t.done) return false;
      if (filterCat !== "all" && (t.categoria as TaskCategoria) !== filterCat) return false;
      if (filterPrio !== "all" && (t.prioridade as TaskPrioridade) !== filterPrio) return false;
      return true;
    });
  }, [tasks, showDone, filterCat, filterPrio]);

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filtered) {
      let key: string;
      if (groupBy === "prazo") key = bucketByPrazo(t);
      else if (groupBy === "categoria") key = CAT_META[(t.categoria as TaskCategoria) ?? "outro"]?.label ?? "Outro";
      else key = PRIO_META[(t.prioridade as TaskPrioridade) ?? "media"]?.label ?? "Média";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    // Order buckets
    const order =
      groupBy === "prazo"
        ? PRAZO_ORDER as readonly string[]
        : groupBy === "prioridade"
          ? ["Alta", "Média", "Baixa"]
          : TASK_CATEGORIES.map((c) => c.label);
    return order.filter((k) => map.has(k)).map((k) => ({ key: k, items: map.get(k)! }));
  }, [filtered, groupBy]);

  const pendingCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const overdueCount = tasks.filter((t) => !t.done && (daysUntilDate(t.due_date) ?? 1) < 0).length;

  function renderTask(t: Task) {
    const cat = CAT_META[(t.categoria as TaskCategoria) ?? "outro"];
    const prio = PRIO_META[(t.prioridade as TaskPrioridade) ?? "media"];
    return (
      <Card key={t.id} className={t.done ? "opacity-60" : ""}>
        <CardContent className="flex items-start gap-3 p-3">
          <button onClick={() => toggle.mutate({ id: t.id, done: !t.done })} className="mt-0.5 shrink-0" aria-label="Concluir">
            {t.done ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-medium ${t.done ? "line-through" : ""}`}>{t.titulo}</p>
              {prio && (
                <Badge variant="outline" className={`shrink-0 text-[10px] ${prio.color}`}>
                  {prio.value === "alta" && <Flame className="mr-0.5 h-3 w-3" />}
                  {prio.label}
                </Badge>
              )}
            </div>
            {t.descricao && <p className="mt-0.5 text-xs text-muted-foreground">{t.descricao}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {cat && (
                <Badge variant="secondary" className="text-[10px]">
                  <span className="mr-1">{cat.emoji}</span> {cat.label}
                </Badge>
              )}
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
          <p className="text-sm text-muted-foreground">
            {pendingCount} pendente(s) · {overdueCount > 0 && <span className="text-destructive">{overdueCount} vencida(s) · </span>}{doneCount} concluída(s)
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/20 p-2">
        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <TabsList className="h-8">
            <TabsTrigger value="prazo" className="text-xs">Por prazo</TabsTrigger>
            <TabsTrigger value="categoria" className="text-xs">Por categoria</TabsTrigger>
            <TabsTrigger value="prioridade" className="text-xs">Por prioridade</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={filterCat} onValueChange={(v) => setFilterCat(v as TaskCategoria | "all")}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {TASK_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPrio} onValueChange={(v) => setFilterPrio(v as TaskPrioridade | "all")}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={showDone ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setShowDone((s) => !s)}>
            {showDone ? "Ocultar concluídas" : "Mostrar concluídas"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-12 text-center text-muted-foreground">
          Nenhuma tarefa {tasks.length === 0 ? "ainda. Crie a primeira! 🔔" : "com esses filtros."}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{g.key} <span className="text-xs">({g.items.length})</span></h2>
              {g.items.map(renderTask)}
            </div>
          ))}
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
