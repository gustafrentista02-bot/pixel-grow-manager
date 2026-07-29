import { useEffect, useState } from "react";
import { FileText, MessageCircle, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProposalSend } from "@/lib/templates-api";
import { logLeadEvent, type Lead } from "@/lib/leads-api";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/format";

/**
 * Registra uma proposta enviada para o lead (alimenta o Dashboard e o histórico
 * comercial). Substituiu o fluxo antigo baseado em biblioteca de modelos.
 */
export function RegisterProposalDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead: Lead | null;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("Proposta comercial");
  const [valor, setValor] = useState<number>(0);
  const [url, setUrl] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && lead) {
      setNome("Proposta comercial");
      setValor(lead.valor_proposta || lead.valor_contrato || 0);
      setUrl("");
      setObservacao("");
    }
  }, [open, lead]);

  async function save({ openWhats }: { openWhats: boolean }) {
    if (!lead) return;
    if (!nome.trim()) { toast.error("Informe o nome da proposta"); return; }
    setSaving(true);
    try {
      await createProposalSend({
        lead_id: lead.id,
        proposal_id: null,
        nome: nome.trim(),
        valor: valor || 0,
        status: "enviada",
        observacao: [observacao.trim(), url.trim() ? `Link: ${url.trim()}` : ""].filter(Boolean).join("\n"),
      });
      const valorFmt = formatCurrency(valor || 0);
      await logLeadEvent(lead.id, "proposta", `Proposta enviada: ${nome.trim()}${valor > 0 ? ` (${valorFmt})` : ""}`).catch(() => {});
      qc.invalidateQueries({ queryKey: ["proposal-sends", lead.id] });
      qc.invalidateQueries({ queryKey: ["lead-events", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Proposta registrada");
      if (openWhats) {
        const message = `Olá ${lead.nome.split(" ")[0] || ""}! Segue nossa proposta.${url ? `\n\n${url}` : ""}`;
        const link = buildWhatsappLink(lead.whatsapp || lead.telefone, message);
        if (link) window.open(link, "_blank", "noreferrer");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro ao registrar", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Registrar proposta enviada
          </DialogTitle>
          <DialogDescription>
            {lead ? `Lançar uma proposta enviada para ${lead.nome}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome da proposta</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Proposta SEO Local" />
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$) — opcional</Label>
            <Input type="number" min={0} value={valor || ""} onChange={(e) => setValor(Number(e.target.value) || 0)} placeholder="1500" />
          </div>
          <div className="space-y-1.5">
            <Label>Link / URL — opcional</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Observação — opcional</Label>
            <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Detalhes da proposta enviada" />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" disabled={saving || !lead?.whatsapp && !lead?.telefone} onClick={() => save({ openWhats: true })}>
            <MessageCircle className="mr-1.5 h-4 w-4" /> Registrar e abrir WhatsApp
          </Button>
          <Button disabled={saving} onClick={() => save({ openWhats: false })}>
            <Check className="mr-1.5 h-4 w-4" /> {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
