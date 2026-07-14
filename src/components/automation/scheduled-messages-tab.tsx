import { useState } from "react";
import { Trash2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLeads } from "@/hooks/use-leads";
import { useScheduledMessages, useAutomationMutations } from "@/hooks/use-automation";
import { fillTemplate } from "@/lib/template-vars";
import { formatDateTime } from "@/lib/format";

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const VARIAVEIS = ["{nome}", "{empresa}", "{cidade}"];

export function ScheduledMessagesTab() {
  const { data: leads = [] } = useLeads();
  const { data: scheduled = [] } = useScheduledMessages();
  const { scheduleMessage, cancelScheduled } = useAutomationMutations();

  const [leadId, setLeadId] = useState<string>("");
  const [mensagem, setMensagem] = useState<string>("");
  const [enviarEm, setEnviarEm] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return toLocalInput(d);
  });

  const selectedLead = leads.find((l) => l.id === leadId) ?? null;
  const preview = selectedLead ? fillTemplate(mensagem, selectedLead) : mensagem;

  const pending = scheduled.filter((s) => s.status === "pendente");
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  async function submit() {
    if (!leadId || !mensagem.trim() || !enviarEm) return;
    await scheduleMessage.mutateAsync({
      lead_id: leadId,
      mensagem: mensagem.trim(),
      enviar_em: new Date(enviarEm).toISOString(),
    });
    setMensagem("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Agendar mensagem única</h2>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Lead</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue placeholder="Escolha um lead" /></SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.empresa || l.nome} {l.empresa && l.nome ? `— ${l.nome}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data e hora</Label>
            <Input type="datetime-local" value={enviarEm} onChange={(e) => setEnviarEm(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs">Mensagem</Label>
              <div className="flex gap-1">
                {VARIAVEIS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMensagem((m) => m + " " + v)}
                    className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] hover:bg-secondary"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <Textarea rows={6} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
              placeholder="Olá {nome}, tudo bem? ..." className="font-mono text-xs" />
          </div>
          {selectedLead && mensagem && (
            <div className="rounded-md border border-border bg-secondary/30 p-2">
              <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Prévia:</p>
              <pre className="whitespace-pre-wrap font-sans text-xs">{preview}</pre>
            </div>
          )}
          <Button onClick={submit} disabled={!leadId || !mensagem.trim() || scheduleMessage.isPending} className="w-full">
            <Send className="mr-1.5 h-4 w-4" /> Agendar envio
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">Pendentes ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma mensagem agendada.</p>
          ) : (
            pending.map((s) => {
              const l = leadMap.get(s.lead_id);
              return (
                <div key={s.id} className="rounded-md border border-border bg-secondary/30 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {l ? (l.empresa || l.nome) : "Lead removido"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(s.enviar_em)}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => cancelScheduled.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{s.mensagem}</p>
                </div>
              );
            })
          )}
          <div className="mt-3 border-t border-border/50 pt-2">
            <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Histórico recente</p>
            <div className="space-y-1">
              {scheduled.filter((s) => s.status !== "pendente").slice(0, 5).map((s) => {
                const l = leadMap.get(s.lead_id);
                return (
                  <div key={s.id} className="flex items-center justify-between text-[11px]">
                    <span className="truncate">{l ? (l.empresa || l.nome) : "—"}</span>
                    <Badge variant={s.status === "enviada" ? "outline" : "destructive"} className="text-[9px]">
                      {s.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
