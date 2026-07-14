import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Maximize2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LeadSidebar } from "@/components/lead-sidebar";
import { LeadQuickNotes } from "@/components/lead-quick-notes";
import { getLead, listEvents } from "@/lib/leads-api";
import type { Lead } from "@/lib/leads-api";
import { formatDateTime } from "@/lib/format";

/**
 * Slide-over showing lead summary + quick notes + a short timeline.
 * Opened by a single click on a Kanban card. Double-click opens the full page.
 */
export function LeadDrawer({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const q = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getLead(leadId as string),
    enabled: !!leadId && open,
  });
  const evQ = useQuery({
    queryKey: ["lead-events", leadId],
    queryFn: () => listEvents(leadId as string),
    enabled: !!leadId && open,
  });

  const lead = q.data as Lead | null | undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 sm:max-w-lg">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-5">
            {lead ? (
              <>
                <div className="flex items-center justify-end">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/leads/$leadId" params={{ leadId: lead.id }}>
                      <Maximize2 className="mr-1.5 h-4 w-4" /> Abrir ficha completa
                    </Link>
                  </Button>
                </div>

                <LeadSidebar lead={lead} />

                <LeadQuickNotes lead={lead} />

                <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                  <h3 className="mb-3 text-sm font-semibold">Últimos eventos</h3>
                  {evQ.data && evQ.data.length > 0 ? (
                    <ol className="relative space-y-3 border-l border-border/60 pl-4">
                      {evQ.data.slice(0, 8).map((ev) => (
                        <li key={ev.id} className="relative">
                          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(ev.created_at)}
                            {ev.autor_nome ? ` · ${ev.autor_nome}` : ""}
                          </p>
                          <p className="text-sm">{ev.descricao}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
