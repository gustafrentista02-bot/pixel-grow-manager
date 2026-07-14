import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, KanbanSquare, Repeat, CheckSquare, Calendar,
  FileText, MessageSquare, Settings, User, Building2, Phone, MessageCircle,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useLeads } from "@/hooks/use-leads";

const NAV = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { title: "Leads", url: "/leads", icon: Users, shortcut: "L" },
  { title: "Funil", url: "/funil", icon: KanbanSquare, shortcut: "F" },
  { title: "Follow-up", url: "/follow-up", icon: Repeat },
  { title: "Tarefas", url: "/tarefas", icon: CheckSquare, shortcut: "T" },
  { title: "Agenda", url: "/agenda", icon: Calendar, shortcut: "A" },
  { title: "Modelos de Proposta", url: "/modelos-proposta", icon: FileText },
  { title: "Modelos de Mensagem", url: "/modelos-mensagem", icon: MessageSquare },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: leads = [] } = useLeads();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => { setOpen(false); fn(); };

  const leadItems = useMemo(() => leads.slice(0, 50), [leads]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar leads, ir para... (⌘K)" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        <CommandGroup heading="Ir para">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem
                key={n.url}
                value={`nav ${n.title}`}
                onSelect={() => run(() => navigate({ to: n.url }))}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {n.title}
                {"shortcut" in n && n.shortcut && (
                  <span className="ml-auto text-[10px] text-muted-foreground">G+{n.shortcut}</span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {leadItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Leads">
              {leadItems.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`lead ${l.nome} ${l.empresa ?? ""} ${l.telefone ?? ""} ${l.whatsapp ?? ""} ${l.cidade ?? ""}`}
                  onSelect={() => run(() => navigate({ to: "/leads/$leadId", params: { leadId: l.id } }))}
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{l.empresa || l.nome}</span>
                  {l.empresa && l.nome && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">· {l.nome}</span>
                  )}
                  <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                    {l.cidade && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{l.cidade}</span>}
                    {l.whatsapp && <MessageCircle className="h-3 w-3 text-emerald-400" />}
                    {l.telefone && <Phone className="h-3 w-3" />}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
