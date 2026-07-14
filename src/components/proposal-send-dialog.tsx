import { useState } from "react";
import { FileText, ExternalLink, Send, FileDown, MessageCircle, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useProposals } from "@/hooks/use-templates";
import {
  PROPOSAL_TYPE_LABELS,
  createProposalSend,
  type ProposalType,
  type ProposalTemplate,
} from "@/lib/templates-api";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { downloadProposalPdf } from "@/lib/pdf-proposal";
import { useCompanySettings } from "@/hooks/use-company";
import { useQueryClient } from "@tanstack/react-query";
import type { Lead } from "@/lib/leads-api";
import { cn } from "@/lib/utils";

function buildMessage(p: ProposalTemplate, lead: Lead): string {
  const greeting = `Olá ${lead.nome.split(" ")[0]}! `;
  const body = p.conteudo?.trim() ? p.conteudo.trim() : "Segue nossa proposta:";
  const link = p.url?.trim() ? `\n\n${p.url.trim()}` : "";
  return `${greeting}${body}${link}`;
}

export function ProposalSendDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead: Lead | null;
}) {
  const { data: proposals = [], isLoading } = useProposals();
  const { data: company } = useCompanySettings();
  const qc = useQueryClient();
  const [valor, setValor] = useState<number>(0);
  const [sending, setSending] = useState<string | null>(null);

  async function record(p: ProposalTemplate) {
    if (!lead) return;
    try {
      await createProposalSend({
        lead_id: lead.id,
        proposal_id: p.id,
        nome: p.nome,
        valor: valor || lead.valor_contrato || 0,
        status: "enviada",
        observacao: "",
      });
      qc.invalidateQueries({ queryKey: ["proposal-sends", lead.id] });
    } catch (e) {
      toast.error("Não foi possível registrar o envio", { description: e instanceof Error ? e.message : "" });
    }
  }

  async function sendWhatsApp(p: ProposalTemplate) {
    if (!lead) return;
    setSending(p.id);
    const link = buildWhatsappLink(lead.telefone, buildMessage(p, lead));
    if (!link) { toast.error("Lead sem telefone"); setSending(null); return; }
    await record(p);
    window.open(link, "_blank", "noreferrer");
    setSending(null);
    onOpenChange(false);
  }

  async function sendPdf(p: ProposalTemplate) {
    if (!lead) return;
    setSending(p.id);
    try {
      downloadProposalPdf(p, lead, { empresa: company?.nome_empresa, valor: valor || lead.valor_contrato });
      await record(p);
      toast.success("PDF gerado e envio registrado");
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro ao gerar PDF", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar proposta</DialogTitle>
          <DialogDescription>
            {lead ? `Escolha a proposta para enviar a ${lead.nome}.` : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : proposals.length === 0 ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não cadastrou modelos de proposta.
            </p>
            <Button asChild variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <Link to="/modelos-proposta">Cadastrar propostas</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor do investimento (opcional)</Label>
              <Input
                type="number"
                min={0}
                value={valor || ""}
                placeholder={lead?.valor_contrato ? String(lead.valor_contrato) : "1500"}
                onChange={(e) => setValor(Number(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              {proposals.map((p) => (
                <div key={p.id} className={cn("space-y-2 rounded-lg border border-border p-3", p.favorito && "ring-1 ring-amber-400/30")}>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{p.nome}</p>
                        {p.favorito && <Star className="h-3 w-3 fill-current text-amber-400" />}
                      </div>
                      <Badge variant="secondary" className="mt-0.5 text-[10px]">
                        {PROPOSAL_TYPE_LABELS[p.tipo as ProposalType] ?? p.tipo}
                      </Badge>
                    </div>
                    {p.url && (
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                        <a href={p.url} target="_blank" rel="noreferrer" title="Abrir link">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => sendPdf(p)} disabled={sending === p.id}>
                      <FileDown className="mr-1.5 h-3.5 w-3.5" /> Gerar PDF
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => sendWhatsApp(p)} disabled={sending === p.id || !lead?.telefone}>
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
