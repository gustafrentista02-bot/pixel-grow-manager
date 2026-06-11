import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  moveLeadStage,
  moveFollowupStage,
  purgeExpiredLeads,
  type Lead,
  type LeadInput,
} from "@/lib/leads-api";
import type { LeadStage, FollowupStage } from "@/lib/crm";

export function useLeads() {
  return useQuery({ queryKey: ["leads"], queryFn: listLeads });
}

export function useLeadMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["leads"] });

  const create = useMutation({
    mutationFn: (input: LeadInput) => createLead(input),
    onSuccess: () => { invalidate(); toast.success("Lead criado!"); },
    onError: (e: Error) => toast.error("Erro ao criar", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LeadInput> }) => updateLead(id, input),
    onSuccess: () => { invalidate(); toast.success("Lead atualizado!"); },
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => { invalidate(); toast.success("Lead excluído"); },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const move = useMutation({
    mutationFn: ({ lead, to }: { lead: Lead; to: LeadStage }) => moveLeadStage(lead, to),
    onMutate: async ({ lead, to }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const prev = qc.getQueryData<Lead[]>(["leads"]);
      qc.setQueryData<Lead[]>(["leads"], (old) =>
        (old ?? []).map((l) => (l.id === lead.id ? { ...l, stage: to } : l)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leads"], ctx.prev);
      toast.error("Erro ao mover", { description: e.message });
    },
    onSettled: () => invalidate(),
  });

  const moveFollowup = useMutation({
    mutationFn: ({ lead, to }: { lead: Lead; to: FollowupStage }) => moveFollowupStage(lead, to),
    onMutate: async ({ lead, to }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const prev = qc.getQueryData<Lead[]>(["leads"]);
      qc.setQueryData<Lead[]>(["leads"], (old) =>
        (old ?? []).map((l) => (l.id === lead.id ? { ...l, followup_stage: to } : l)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leads"], ctx.prev);
      toast.error("Erro ao mover", { description: e.message });
    },
    onSettled: () => invalidate(),
  });

  return { create, update, remove, move, moveFollowup };
}

/** Run once on mount to purge expired "sem interesse" leads. */
export function usePurgeExpired() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purgeExpiredLeads,
    onSuccess: (count) => {
      if (count > 0) {
        qc.invalidateQueries({ queryKey: ["leads"] });
        toast.info(`${count} lead(s) sem interesse removido(s) automaticamente.`);
      }
    },
  });
}
