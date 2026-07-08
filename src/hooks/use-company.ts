import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCompanySettings, saveCompanySettings, type CompanyInput } from "@/lib/company-api";

export function useCompanySettings() {
  return useQuery({ queryKey: ["company-settings"], queryFn: getCompanySettings });
}

export function useCompanyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyInput) => saveCompanySettings(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Dados da empresa salvos!");
    },
    onError: (e: Error) => toast.error("Erro ao salvar empresa", { description: e.message }),
  });
}
