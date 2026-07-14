import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsHelp, useGlobalShortcuts } from "@/components/shortcuts";
import { Button } from "@/components/ui/button";
import { Search, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pixelLogo } from "@/lib/assets";

export function AppShell({ children }: { children: ReactNode }) {
  useGlobalShortcuts();
  const { data: auth, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!isLoading && auth?.user && auth.status === "pendente") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
          <img src={pixelLogo} alt="Pixel" className="mx-auto mb-4 h-12 w-12 object-contain" />
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-bold">Aguardando aprovação</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu cadastro está aguardando aprovação do gerente. Você receberá acesso assim que for liberado.
          </p>
          <Button className="mt-6 gap-2" variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <Button
              variant="outline"
              size="sm"
              className="ml-2 h-8 gap-2 border-border/60 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Buscar ou pular para…</span>
              <span className="ml-1 hidden rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono sm:inline">⌘K</span>
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <ShortcutsHelp />
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
        </div>
        <CommandPalette />
      </div>
    </SidebarProvider>
  );
}
