import { useState } from "react";
import { FileText, ExternalLink, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { useProposals } from "@/hooks/use-templates";
import { PROPOSAL_TYPE_LABELS, type ProposalType, type ProposalTemplate } from "@/lib/templates-api";
import { buildWhatsappLink } from "@/lib/whatsapp";
import type { Lead } from "@/lib/leads-api";

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

  function send(p: ProposalTemplate) {
    if (!lead) return;
    const link = buildWhatsappLink(lead.telefone, buildMessage(p, lead));
    if (!link) return;
    window.open(link, "_blank", "noreferrer");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar proposta</DialogTitle>
          <DialogDescription>
            {lead ? `Escolha a proposta para enviar a ${lead.nome} via WhatsApp.` : ""}
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
          <div className="space-y-2">
            {proposals.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.nome}</p>
                  <Badge variant="secondary" className="mt-0.5 text-[10px]">
                    {PROPOSAL_TYPE_LABELS[p.tipo as ProposalType] ?? p.tipo}
                  </Badge>
                </div>
                {p.url && (
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <a href={p.url} target="_blank" rel="noreferrer" title="Abrir proposta">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button size="sm" onClick={() => send(p)} disabled={!lead?.telefone}>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Enviar
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
