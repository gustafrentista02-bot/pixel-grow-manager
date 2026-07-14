import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/crm";

export type AuthContext = {
  user: User | null;
  nome: string;
  email: string;
  role: AppRole | null;
  status: "pendente" | "aprovado" | null;
};

async function loadAuthContext(): Promise<AuthContext> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;
  if (!user) return { user: null, nome: "", email: "", role: null, status: null };

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("nome, email, status").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const roleList = (roles ?? []).map((r) => r.role);
  const role: AppRole | null = roleList.includes("gerente")
    ? "gerente"
    : roleList.includes("vendedor")
      ? "vendedor"
      : null;

  const status = ((profile as any)?.status ?? "aprovado") as "pendente" | "aprovado";

  return {
    user,
    nome: profile?.nome ?? user.email ?? "",
    email: profile?.email ?? user.email ?? "",
    role,
    status,
  };
}

export function useAuth() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["auth"],
    queryFn: loadAuthContext,
    staleTime: 60_000,
  });
}
