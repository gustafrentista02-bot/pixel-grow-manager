import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Edit, Power, PowerOff, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useCadences, useCadenceSteps, useAutomationMutations, useEnrollments } from "@/hooks/use-automation";
import type { Cadence } from "@/lib/automation-api";

type EditableStep = { delay_dias: number; horario: string; mensagem: string };
const VARIAVEIS = ["{nome}", "{empresa}", "{cidade}"];

function CadenceEditor({ cadence, open, onOpenChange }: {
  cadence: Cadence;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: existingSteps = [] } = useCadenceSteps(open ? cadence.id : null);
  const { saveSteps, updateCadence } = useAutomationMutations();
  const [nome, setNome] = useState(cadence.nome);
  const [steps, setSteps] = useState<EditableStep[]>([]);

  useEffect(() => {
    if (open) {
      setNome(cadence.nome);
      setSteps(existingSteps.map((s) => ({ delay_dias: s.delay_dias, horario: s.horario, mensagem: s.mensagem })));
    }
  }, [open, cadence.nome, existingSteps]);

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
    if (nome !== cadence.nome) {
      await updateCadence.mutateAsync({ id: cadence.id, input: { nome } });
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
  const { createCadence, updateCadence, deleteCadence } = useAutomationMutations();
  const [editing, setEditing] = useState<Cadence | null>(null);
  const [newName, setNewName] = useState("");

  const enrollCount = (id: string) => enrollments.filter((e) => e.cadence_id === id && e.status === "ativa").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <Input placeholder="Nome da nova cadência..." value={newName}
            onChange={(e) => setNewName(e.target.value)} className="max-w-xs" />
          <Button onClick={async () => {
            if (!newName.trim()) return;
            await createCadence.mutateAsync(newName.trim());
            setNewName("");
          }}>
            <Plus className="mr-1 h-4 w-4" /> Nova cadência
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {cadences.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{c.nome}</h3>
                    {c.ativa ? (
                      <Badge variant="outline" className="border-emerald-400/40 bg-emerald-400/10 text-[10px] text-emerald-300">Ativa</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Pausada</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {enrollCount(c.id)} lead(s) inscritos
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                  <Edit className="mr-1 h-3 w-3" /> Editar etapas
                </Button>
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
              </div>
            </CardContent>
          </Card>
        ))}
        {cadences.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            Nenhuma cadência criada. Crie a primeira acima.
          </p>
        )}
      </div>

      {editing && (
        <CadenceEditor cadence={editing} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />
      )}
    </div>
  );
}
