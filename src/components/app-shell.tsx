import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsHelp, useGlobalShortcuts } from "@/components/shortcuts";
import { Button } from "@/components/ui/button";
import { Search, Clock, LogOut, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentOrg, isSubscriptionBlocking } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { pixelLogo } from "@/lib/assets";
import { getCaktoCheckoutUrl } from "@/lib/billing.functions";

const ONBOARDING_PATHS = new Set(["/onboarding", "/bem-vindo"]);

export function AppShell({ children }: { children: ReactNode }) {
  useGlobalShortcuts();
  const { data: auth, isLoading } = useAuth();
  const { data: org } = useCurrentOrg();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const fetchUrl = useServerFn(getCaktoCheckoutUrl);
  const { data: checkoutUrl } = useQuery({
    queryKey: ["cakto-checkout-url"],
    queryFn: async () => (await fetchUrl()).url,
    staleTime: Infinity,
  });

  // Redirecionamento automático para o wizard/boas-vindas
  const needsOrgOnboarding =
    !isLoading &&
    auth?.user &&
    auth.status === "aprovado" &&
    auth.role === "gerente" &&
    org &&
    org.onboarding_concluido === false;

  const needsWelcome =
    !isLoading &&
    auth?.user &&
    auth.status === "aprovado" &&
    auth.role === "vendedor" &&
    !auth.primeiroLoginConcluido;

  useEffect(() => {
    if (needsOrgOnboarding && pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    } else if (!needsOrgOnboarding && needsWelcome && pathname !== "/bem-vindo") {
      navigate({ to: "/bem-vindo", replace: true });
    }
  }, [needsOrgOnboarding, needsWelcome, pathname, navigate]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function openCheckout() {
    if (!checkoutUrl) {
      toast.error("Link de checkout não configurado.");
      return;
    }
    toast.info("Use o e-mail correto", {
      description: `Finalize o pagamento com ${auth?.email ?? ""}.`,
    });
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  }

  // Renderiza layout minimalista para as rotas de onboarding (sem sidebar)
  if (ONBOARDING_PATHS.has(pathname)) {
    return <div className="min-h-screen bg-background">{children}</div>;
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

  if (!isLoading && auth?.user && isSubscriptionBlocking(org)) {
    const isCanceled = org?.subscription_status === "cancelada";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
          <img src={pixelLogo} alt="Pixel" className="mx-auto mb-4 h-12 w-12 object-contain" />
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-bold">
            {isCanceled ? "Assinatura cancelada" : "Sua assinatura expirou"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Para continuar usando o sistema, ative sua assinatura mensal.
          </p>
          <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            Use o e-mail <span className="font-mono text-foreground">{auth.email}</span> ao finalizar o pagamento
            para ativar sua assinatura automaticamente.
          </div>
          <Button className="mt-6 w-full gap-2" onClick={openCheckout}>
            <ExternalLink className="h-4 w-4" /> Assinar agora
          </Button>
          <Button className="mt-2 gap-2" variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  const showInadimplente = org?.subscription_status === "inadimplente";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          {showInadimplente && (
            <div className="flex items-center justify-between gap-3 border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-500">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Pagamento recusado. Regularize com o e-mail{" "}
                  <span className="font-mono">{auth?.email}</span> para não perder acesso.
                </span>
              </div>
              <Button size="sm" variant="outline" className="gap-2" onClick={openCheckout}>
                <ExternalLink className="h-3.5 w-3.5" /> Regularizar
              </Button>
            </div>
          )}
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
