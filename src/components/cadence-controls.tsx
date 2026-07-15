import { useState } from "react";
import { Zap, X, PauseCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCadences, useEnrollments, useAutomationMutations } from "@/hooks/use-automation";
import { formatDateTime } from "@/lib/format";

/** Botão + diálogo pra inscrever o lead em uma cadência ativa. */
export function EnrollCadenceButton({ leadId, size = "sm" }: { leadId: string; size?: "sm" | "icon" }) {
  const [open, setOpen] = useState(false);
  const [cadenceId, setCadenceId] = useState<string>("");
  const { data: cadences = [] } = useCadences();
  const { enroll } = useAutomationMutations();
  const active = cadences.filter((c) => c.ativa);

  async function confirm() {
    if (!cadenceId) return;
    await enroll.mutateAsync({ cadence_id: cadenceId, lead_id: leadId });
    setOpen(false);
    setCadenceId("");
  }

  return (
    <>
      {size === "icon" ? (
        <Button variant="outline" size="icon" className="h-8 w-8 text-primary" title="Iniciar cadência"
          onClick={() => setOpen(true)}>
          <Zap className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="text-primary" onClick={() => setOpen(true)}>
          <Zap className="mr-1.5 h-4 w-4" /> Iniciar cadência
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscrever lead em uma cadência</DialogTitle>
          </DialogHeader>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cadência ativa. Crie uma em Follow-up → Cadências.</p>
          ) : (
            <Select value={cadenceId} onValueChange={setCadenceId}>
              <SelectTrigger><SelectValue placeholder="Escolha uma cadência" /></SelectTrigger>
              <SelectContent>
                {active.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirm} disabled={!cadenceId || enroll.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Indicador visual mostrando cadência ativa/pausada do lead. */
export function LeadCadenceBadge({ leadId, compact = false }: { leadId: string; compact?: boolean }) {
  const { data: enrollments = [] } = useEnrollments();
  const { data: cadences = [] } = useCadences();
  const { cancelEnrollment, resumeEnrollment } = useAutomationMutations();
  const enr = enrollments.find(
    (e) => e.lead_id === leadId && (e.status === "ativa" || e.status === "pausada_resposta"),
  );
  if (!enr) return null;
  const cadence = cadences.find((c) => c.id === enr.cadence_id);
  const name = cadence?.nome ?? "Cadência";
  const paused = enr.status === "pausada_resposta";

  if (compact) {
    return (
      <div className={`mt-2 flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] ${
        paused
          ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
          : "border-primary/30 bg-primary/10 text-primary"
      }`}>
        {paused ? <PauseCircle className="h-3 w-3 shrink-0" /> : <Zap className="h-3 w-3 shrink-0" />}
        <span className="truncate">
          {paused ? `${name} · pausada (resposta)` : `${name} · etapa ${enr.current_step + 1}`}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
      paused
        ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
        : "border-primary/30 bg-primary/10 text-primary"
    }`}>
      {paused ? <PauseCircle className="h-3.5 w-3.5 shrink-0" /> : <Zap className="h-3.5 w-3.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-[10px] opacity-80">
          {paused ? (
            <>Cadência pausada — cliente respondeu</>
          ) : (
            <>
              Etapa {enr.current_step + 1}
              {enr.next_send_at && <> · próximo: {formatDateTime(enr.next_send_at)}</>}
            </>
          )}
        </p>
      </div>
      {paused && (
        <Button size="icon" variant="ghost" className="h-6 w-6" title="Retomar mesmo assim"
          onClick={() => resumeEnrollment.mutate(enr.id)}>
          <Play className="h-3 w-3" />
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" title="Cancelar inscrição"
        onClick={() => cancelEnrollment.mutate(enr.id)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
