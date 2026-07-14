import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, KanbanSquare, Repeat, Settings, LogOut, CheckSquare, FileText, MessageSquare, Calendar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/crm";
import { pixelLogo as logo } from "@/lib/assets";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Funil", url: "/funil", icon: KanbanSquare },
  { title: "Follow-up", url: "/follow-up", icon: Repeat },
  { title: "Tarefas", url: "/tarefas", icon: CheckSquare },
  { title: "Agenda", url: "/agenda", icon: Calendar },

  { title: "Modelos de Proposta", url: "/modelos-proposta", icon: FileText },
  { title: "Modelos de Mensagens", url: "/modelos-mensagem", icon: MessageSquare },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

export function AppSidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: auth } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
