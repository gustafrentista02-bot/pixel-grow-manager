import { useState } from "react";
import { MessageCircle, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProposalSendDialog } from "@/components/proposal-send-dialog";
import { buildWhatsappLink, buildTelLink } from "@/lib/whatsapp";
import type { Lead } from "@/lib/leads-api";

/** Quick action buttons: WhatsApp, Call, Send Proposal. */
export function LeadActions({
  lead,
  size = "sm",
  variant = "outline",
}: {
  lead: Lead;
  size?: "sm" | "icon";
  variant?: "outline" | "ghost";
}) {
  const [proposalOpen, setProposalOpen] = useState(false);
  const phone = lead.whatsapp || lead.telefone;
  const wa = buildWhatsappLink(phone);
  const tel = buildTelLink(phone);

  if (size === "icon") {
    return (
      <>
        {wa && (
          <Button asChild variant={variant} size="icon" className="h-8 w-8 text-emerald-400">
            <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </a>
          </Button>
        )}
        {tel && (
          <Button asChild variant={variant} size="icon" className="h-8 w-8 text-sky-400">
            <a href={tel} title="Ligar">
              <Phone className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button
          variant={variant}
          size="icon"
          className="h-8 w-8 text-amber-400"
          title="Enviar proposta"
          onClick={() => setProposalOpen(true)}
        >
          <FileText className="h-4 w-4" />
        </Button>
        <ProposalSendDialog open={proposalOpen} onOpenChange={setProposalOpen} lead={lead} />
      </>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <Button asChild variant={variant} size="sm" className="text-emerald-400">
          <a href={wa} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
          </a>
        </Button>
      )}
      {tel && (
        <Button asChild variant={variant} size="sm" className="text-sky-400">
          <a href={tel}>
            <Phone className="mr-1.5 h-4 w-4" /> Ligar
          </a>
        </Button>
      )}
      <Button variant={variant} size="sm" className="text-amber-400" onClick={() => setProposalOpen(true)}>
        <FileText className="mr-1.5 h-4 w-4" /> Enviar Proposta
      </Button>
      <ProposalSendDialog open={proposalOpen} onOpenChange={setProposalOpen} lead={lead} />
    </div>
  );
}
