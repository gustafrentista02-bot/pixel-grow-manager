import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OrgSubscription = {
  id: string;
  nome: string;
  subscription_status: "trial" | "ativa" | "inadimplente" | "cancelada" | string;
  trial_ends_at: string;
  current_period_end: string | null;
  limite_usuarios: number;
  limite_mensagens_mes: number;
  cakto_customer_email: string;
};

async function loadOrg(): Promise<OrgSubscription | null> {
  const { data } = await supabase
    .from("organizations")
    .select(
      "id, nome, subscription_status, trial_ends_at, current_period_end, limite_usuarios, limite_mensagens_mes, cakto_customer_email",
    )
    .maybeSingle();
  return (data as OrgSubscription) ?? null;
}

export function useCurrentOrg() {
  return useQuery({ queryKey: ["current-org"], queryFn: loadOrg, staleTime: 60_000 });
}

export function isSubscriptionBlocking(org: OrgSubscription | null | undefined): boolean {
  if (!org) return false;
  if (org.subscription_status === "cancelada") return true;
  if (org.subscription_status === "trial") {
    const ends = org.trial_ends_at ? new Date(org.trial_ends_at).getTime() : 0;
    return ends > 0 && ends < Date.now();
  }
  return false;
}
