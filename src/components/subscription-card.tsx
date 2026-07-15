import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useAuth } from "@/hooks/use-auth";
import { getCaktoCheckoutUrl } from "@/lib/billing.functions";

function currentAnoMes(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function daysUntil(iso: string | null): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function SubscriptionCard() {
  const { data: auth } = useAuth();
  const { data: org } = useCurrentOrg();
  const email = auth?.email ?? "";

  const fetchUrl = useServerFn(getCaktoCheckoutUrl);
  const { data: checkoutUrl } = useQuery({
    queryKey: ["cakto-checkout-url"],
    queryFn: async () => (await fetchUrl()).url,
    staleTime: Infinity,
  });

  const { data: usageTotal = 0 } = useQuery({
    queryKey: ["message-usage", org?.id, currentAnoMes()],
    enabled: Boolean(org?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("message_usage")
        .select("total_enviadas")
        .eq("organization_id", org!.id)
        .eq("ano_mes", currentAnoMes())
        .maybeSingle();
      return (data?.total_enviadas as number) ?? 0;
    },
  });

  const { data: usersCount = 0 } = useQuery({
    queryKey: ["approved-users-count", org?.id],
    enabled: Boolean(org?.id),
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "aprovado");
      return count ?? 0;
    },
  });

  if (!org) return null;

  function openCheckout() {
    if (!checkoutUrl) {
      toast.error("Link de checkout não configurado. Contate o suporte.");
      return;
    }
    navigator.clipboard?.writeText(email).catch(() => {});
    toast.info("Use o e-mail correto ao pagar", {
      description: `Finalize com ${email} para ativar automaticamente.`,
    });
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  }

  const status = org.subscription_status;
  const trialDays = daysUntil(org.trial_ends_at);
  const msgLimit = org.limite_mensagens_mes || 0;
  const userLimit = org.limite_usuarios || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assinatura</CardTitle>
        <CardDescription>Plano e uso da sua organização.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {status === "ativa" && (
            <>
              <Badge className="bg-primary/20 text-primary hover:bg-primary/25">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Ativa
              </Badge>
              <span className="text-sm text-muted-foreground">
                renova até {formatDate(org.current_period_end)}
              </span>
            </>
          )}
          {status === "trial" && (
            <>
              <Badge variant="outline" className="border-amber-500/40 text-amber-500">Em teste</Badge>
              <span className="text-sm text-muted-foreground">
                {trialDays > 0 ? `${trialDays} dia(s) restantes` : "expirado"}
              </span>
            </>
          )}
          {status === "inadimplente" && (
            <Badge variant="outline" className="border-red-500/40 text-red-500">
              <AlertTriangle className="mr-1 h-3 w-3" /> Inadimplente
            </Badge>
          )}
          {status === "cancelada" && (
            <Badge variant="outline" className="border-red-500/40 text-red-500">Cancelada</Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Usuários</span>
            <span className="text-muted-foreground">{usersCount} de {userLimit}</span>
          </div>
          <Progress value={userLimit > 0 ? Math.min(100, (usersCount / userLimit) * 100) : 0} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mensagens automáticas neste mês</span>
            <span className="text-muted-foreground">{usageTotal} de {msgLimit}</span>
          </div>
          <Progress value={msgLimit > 0 ? Math.min(100, (usageTotal / msgLimit) * 100) : 0} />
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          Use o e-mail <span className="font-mono text-foreground">{email}</span> ao finalizar o pagamento
          para que sua assinatura seja ativada automaticamente. A ativação pode levar alguns minutos
          após a confirmação do pagamento.
        </div>

        <Button onClick={openCheckout} className="gap-2">
          <ExternalLink className="h-4 w-4" /> Assinar agora
        </Button>
      </CardContent>
    </Card>
  );
}
