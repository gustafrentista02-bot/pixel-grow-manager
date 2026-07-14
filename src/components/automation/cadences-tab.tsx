import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Edit, Power, PowerOff, GripVertical, ChevronUp, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useCadences, useCadenceSteps, useAutomationMutations, useEnrollments } from "@/hooks/use-automation";
import { useAuth } from "@/hooks/use-auth";
import { useProfiles } from "@/hooks/use-profiles";
import type { Cadence } from "@/lib/automation-api";

type EditableStep = { delay_dias: number; horario: string; mensagem: string };
const VARIAVEIS = ["{nome}", "{empresa}", "{cidade}"];

function CadenceEditor({ cadence, open, onOpenChange, isManager }: {
  cadence: Cadence;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isManager: boolean;
}) {
  const { data: existingSteps = [] } = useCadenceSteps(open ? cadence.id : null);
  const { saveSteps, updateCadence } = useAutomationMutations();
  const [nome, setNome] = useState(cadence.nome);
  const [compartilhada, setCompartilhada] = useState(cadence.compartilhada);
  const [steps, setSteps] = useState<EditableStep[]>([]);

  useEffect(() => {
    if (open) {
      setNome(cadence.nome);
      setCompartilhada(cadence.compartilhada);
      setSteps(existingSteps.map((s) => ({ delay_dias: s.delay_dias, horario: s.horario, mensagem: s.mensagem })));
    }
  }, [open, cadence.nome, cadence.compartilhada, existingSteps]);

  function addStep() {
    setSteps((s) => [...s, { delay_dias: s.length === 0 ? 0 : 2, horario: "09:00", mensagem: "" }]);
  }
  function updateStep(i: number, patch: Partial<EditableStep>) {
    setSteps((s) => s.map((st, idx) => idx === i ? { ...st, ...patch } : st));
  }
  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }
  function moveStep(i: number, dir: -1 | 1) {
    setSteps((s) => {
      const next = [...s];
      const j = i + dir;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    const patch: Partial<Pick<Cadence, "nome" | "compartilhada">> = {};
    if (nome !== cadence.nome) patch.nome = nome;
    if (isManager && compartilhada !== cadence.compartilhada) patch.compartilhada = compartilhada;
    if (Object.keys(patch).length > 0) {
      await updateCadence.mutateAsync({ id: cadence.id, input: patch });
    }
    await saveSteps.mutateAsync({ cadence_id: cadence.id, steps });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar cadência</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          {isManager && (
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 p-3">
              <div>
                <Label className="text-sm">Compartilhar com a equipe</Label>
                <p className="text-[11px] text-muted-foreground">Toda a equipe verá e poderá usar esta cadência.</p>
              </div>
              <Switch checked={compartilhada} onCheckedChange={setCompartilhada} />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Etapas ({steps.length})</Label>
              <Button size="sm" variant="outline" onClick={addStep}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar etapa
              </Button>
            </div>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {steps.map((s, i) => (
                <div key={i} className="rounded-md border border-border bg-secondary/30 p-2">
                  <div className="mb-2 flex items-center gap-2">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold">Etapa {i + 1}</span>
                    <div className="ml-auto flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(i, -1)} disabled={i === 0}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeStep(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Dias após {i === 0 ? "inscrição" : "etapa anterior"}</Label>
                      <Input type="number" min={0} value={s.delay_dias}
                        onChange={(e) => updateStep(i, { delay_dias: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Horário</Label>
                      <Input type="time" value={s.horario} onChange={(e) => updateStep(i, { horario: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 pb-1">
                    {VARIAVEIS.map((v) => (
                      <button key={v} type="button"
                        onClick={() => updateStep(i, { mensagem: s.mensagem + " " + v })}
                        className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] hover:bg-secondary">
                        {v}
                      </button>
                    ))}
                  </div>
                  <Textarea rows={3} value={s.mensagem} onChange={(e) => updateStep(i, { mensagem: e.target.value })}
                    placeholder="Mensagem..." className="font-mono text-xs" />
                </div>
              ))}
              {steps.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma etapa. Clique em "Adicionar etapa".</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saveSteps.isPending || steps.some((s) => !s.mensagem.trim())}>
            <Save className="mr-1 h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CadencesTab() {
  const { data: cadences = [] } = useCadences();
  const { data: enrollments = [] } = useEnrollments();
  const { data: auth } = useAuth();
  const { data: profileMap } = useProfiles();
  const uid = auth?.user?.id ?? "";
  const isManager = auth?.role === "gerente";
  const { createCadence, updateCadence, deleteCadence } = useAutomationMutations();
  const [editing, setEditing] = useState<Cadence | null>(null);
  const [newName, setNewName] = useState("");

  const enrollCount = (id: string) => enrollments.filter((e) => e.cadence_id === id && e.status === "ativa").length;

  const own = cadences.filter((c) => c.owner_id === uid);
  const shared = cadences.filter((c) => c.owner_id !== uid && c.compartilhada);

  const renderCard = (c: Cadence) => {
    const canEdit = c.owner_id === uid;
    const authorName = profileMap?.get(c.owner_id) ?? "";
    return (
      <Card key={c.id}>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{c.nome}</h3>
                {c.ativa ? (
                  <Badge variant="outline" className="border-emerald-400/40 bg-emerald-400/10 text-[10px] text-emerald-300">Ativa</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Pausada</Badge>
                )}
                {c.compartilhada && (
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] text-primary">
                    <Users className="mr-1 h-3 w-3" />
                    {canEdit ? "Compartilhada" : `Compartilhada por ${authorName || "equipe"}`}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {enrollCount(c.id)} lead(s) inscritos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setEditing(c)} disabled={!canEdit}>
              <Edit className="mr-1 h-3 w-3" /> Editar etapas
            </Button>
            {canEdit && (
              <>
                <Button size="sm" variant="ghost"
                  onClick={() => updateCadence.mutate({ id: c.id, input: { ativa: !c.ativa } })}>
                  {c.ativa ? <><PowerOff className="mr-1 h-3 w-3" /> Pausar</> : <><Power className="mr-1 h-3 w-3" /> Ativar</>}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive"
                  onClick={() => {
                    if (confirm(`Excluir cadência "${c.nome}"?`)) deleteCadence.mutate(c.id);
                  }}>
                  <Trash2 className="mr-1 h-3 w-3" /> Excluir
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <Input placeholder="Nome da nova cadência..." value={newName}
            onChange={(e) => setNewName(e.target.value)} className="max-w-xs" />
          <Button onClick={async () => {
            if (!newName.trim()) return;
            await createCadence.mutateAsync({ nome: newName.trim() });
            setNewName("");
          }}>
            <Plus className="mr-1 h-4 w-4" /> Nova cadência
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Minhas ({own.length})</h2>
        {own.length === 0 ? (
          <p className="text-xs text-muted-foreground">Você ainda não criou nenhuma cadência.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{own.map(renderCard)}</div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          <Users className="mr-1 inline h-3.5 w-3.5" /> Compartilhadas pela equipe ({shared.length})
        </h2>
        {shared.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma cadência compartilhada pela equipe.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{shared.map(renderCard)}</div>
        )}
      </section>

      {editing && (
        <CadenceEditor cadence={editing} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} isManager={isManager} />
      )}
    </div>
  );
}
