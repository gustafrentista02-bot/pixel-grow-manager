import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CompanySettings = Tables<"company_settings">;

export type CompanyInput = {
  nome_empresa: string;
  logo_url: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
  site: string;
  meet_padrao: string;
  assinatura: string;
};

/** Returns the single company settings row, or null if none exists yet. */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Upsert-style save: updates the existing row or inserts the first one. */
export async function saveCompanySettings(input: CompanyInput): Promise<CompanySettings> {
  const existing = await getCompanySettings();
  if (existing) {
    const { data, error } = await supabase
      .from("company_settings")
      .update(input)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("company_settings")
    .insert(input as any) // organization_id preenchido via trigger
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
