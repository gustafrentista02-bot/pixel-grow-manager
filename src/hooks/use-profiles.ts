import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProfileLite = { id: string; nome: string };

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles-lite"],
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase.from("profiles").select("id, nome");
      if (error) throw error;
      return new Map((data ?? []).map((p) => [p.id, p.nome ?? ""]));
    },
    staleTime: 5 * 60_000,
  });
}
