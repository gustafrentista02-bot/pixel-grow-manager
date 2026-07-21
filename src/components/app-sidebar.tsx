import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Repeat,
  Settings,
  LogOut,
  CheckSquare,
  FileText,
  MessageSquare,
  Calendar,
  ClipboardList,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/crm";
import { pixelLogo as logo } from "@/lib/assets";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  id: string;
  label: string;
  items: readonly NavItem[];
};

// Grupos preparados para expansão futura (Propostas, Clientes, Relatórios, Google Business hub, etc.)
// Nesta fase apenas reorganizamos os itens existentes — nenhum módulo novo.
const groups: readonly NavGroup[] = [
  {
    id: "comercial",
    label: "Comercial",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Leads", url: "/leads", icon: Users },
      { title: "Funil", url: "/funil", icon: KanbanSquare },
      { title: "Clientes", url: "/clientes", icon: Building2 },
      { title: "Follow-up", url: "/follow-up", icon: Repeat },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    items: [
      { title: "Tarefas", url: "/tarefas", icon: CheckSquare },
      { title: "Agenda", url: "/agenda", icon: Calendar },
      { title: "Modelos de Proposta", url: "/modelos-proposta", icon: FileText },
      { title: "Modelos de Mensagens", url: "/modelos-mensagem", icon: MessageSquare },
    ],
  },
  {
    id: "google-business",
    label: "Google Business",
    items: [
      { title: "Google Business Hub", url: "/google-business", icon: Building2 },
      { title: "Auditorias", url: "/auditorias", icon: ClipboardList },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    items: [{ title: "Configurações", url: "/configuracoes", icon: Settings }],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: auth } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isGerente = auth?.role === "gerente";

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-count"],
    enabled: isGerente,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente");
      return count ?? 0;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <img src={logo} alt="Pixel" className="h-8 w-8 shrink-0 object-contain" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-display text-sm font-bold leading-tight">Pixel CRM</p>
            <p className="truncate text-xs text-muted-foreground">Controle de Leads</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => {
          const hasActive = group.items.some((item) => pathname === item.url);
          return (
            <Collapsible key={group.id} defaultOpen={hasActive || true} className="group/collapsible">
              <SidebarGroup>
                {/* Label vira botão para colapsar o grupo. No modo icon-collapsed some junto com os textos. */}
                <SidebarGroupLabel asChild className="group-data-[collapsible=icon]:hidden">
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60 hover:text-sidebar-foreground">
                    <span>{group.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const showBadge = item.url === "/configuracoes" && pendingCount > 0;
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === item.url}
                              tooltip={item.title}
                            >
                              <Link to={item.url} className="flex items-center gap-2">
                                <item.icon className="h-4 w-4" />
                                <span className="flex-1">{item.title}</span>
                                {showBadge && (
                                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground group-data-[collapsible=icon]:hidden">
                                    {pendingCount}
                                  </span>
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">{auth?.nome || "Usuário"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {auth?.role ? ROLE_LABELS[auth.role] : ""}
          </p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
