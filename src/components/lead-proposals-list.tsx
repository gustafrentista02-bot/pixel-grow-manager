import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listProposalSends, updateProposalSend, deleteProposalSend,
  PROPOSAL_SEND_STATUS,
} from "@/lib/templates-api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LeadProposalsList({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["proposal-sends", leadId],
    queryFn: () => listProposalSends(leadId),
  });

  const updateM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateProposalSend(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proposal-sends", leadId] }); toast.success("Status atualizado"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => deleteProposalSend(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proposal-sends", leadId] }); toast.success("Envio removido"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Propostas enviadas</CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !q.data || q.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma proposta enviada ainda. Use o botão "Enviar proposta" no menu do lead.
          </p>
        ) : (
          <div className="divide-y divide-border/60 rounded-lg border border-border/60">
            {q.data.map((s) => {
              const meta = PROPOSAL_SEND_STATUS.find((x) => x.value === s.status) ?? PROPOSAL_SEND_STATUS[0];
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.nome || "Proposta"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(s.enviada_em)}
                      {s.valor > 0 && <> · <span className="text-foreground/80">{formatCurrency(s.valor)}</span></>}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0", meta.color)}>{meta.label}</Badge>
                  <Select value={s.status} onValueChange={(v) => updateM.mutate({ id: s.id, status: v })}>
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPOSAL_SEND_STATUS.map((st) => (
                        <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeM.mutate(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
