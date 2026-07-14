import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsHelp, useGlobalShortcuts } from "@/components/shortcuts";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  useGlobalShortcuts();

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
