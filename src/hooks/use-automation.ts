import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listScheduledMessages, createScheduledMessage, cancelScheduledMessage,
  listCadences, listCadenceSteps, createCadence, updateCadence, deleteCadence, saveCadenceSteps,
  listEnrollments, enrollLead, cancelEnrollment,
} from "@/lib/automation-api";

export function useScheduledMessages() {
  return useQuery({ queryKey: ["scheduled_messages"], queryFn: listScheduledMessages });
}

export function useCadences() {
  return useQuery({ queryKey: ["cadences"], queryFn: listCadences });
}

export function useCadenceSteps(cadence_id: string | null) {
  return useQuery({
    queryKey: ["cadence_steps", cadence_id],
    queryFn: () => listCadenceSteps(cadence_id!),
    enabled: !!cadence_id,
  });
}

export function useEnrollments() {
  return useQuery({ queryKey: ["cadence_enrollments"], queryFn: listEnrollments });
}

export function useAutomationMutations() {
  const qc = useQueryClient();
  const invSched = () => qc.invalidateQueries({ queryKey: ["scheduled_messages"] });
  const invCad = () => {
    qc.invalidateQueries({ queryKey: ["cadences"] });
    qc.invalidateQueries({ queryKey: ["cadence_steps"] });
  };
  const invEnr = () => qc.invalidateQueries({ queryKey: ["cadence_enrollments"] });

  return {
    scheduleMessage: useMutation({
      mutationFn: createScheduledMessage,
      onSuccess: () => { invSched(); toast.success("Mensagem agendada!"); },
      onError: (e: Error) => toast.error("Erro ao agendar", { description: e.message }),
    }),
    cancelScheduled: useMutation({
      mutationFn: cancelScheduledMessage,
      onSuccess: () => { invSched(); toast.success("Mensagem cancelada"); },
      onError: (e: Error) => toast.error("Erro", { description: e.message }),
    }),
    createCadence: useMutation({
      mutationFn: ({ nome, compartilhada }: { nome: string; compartilhada?: boolean }) =>
        createCadence(nome, compartilhada),
      onSuccess: () => { invCad(); toast.success("Cadência criada!"); },
      onError: (e: Error) => toast.error("Erro", { description: e.message }),
    }),
    updateCadence: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateCadence>[1] }) =>
        updateCadence(id, input),
      onSuccess: () => { invCad(); toast.success("Cadência atualizada"); },
      onError: (e: Error) => toast.error("Erro", { description: e.message }),
    }),
    deleteCadence: useMutation({
      mutationFn: deleteCadence,
      onSuccess: () => { invCad(); toast.success("Cadência removida"); },
      onError: (e: Error) => toast.error("Erro", { description: e.message }),
    }),
    saveSteps: useMutation({
      mutationFn: ({ cadence_id, steps }: { cadence_id: string; steps: Parameters<typeof saveCadenceSteps>[1] }) =>
        saveCadenceSteps(cadence_id, steps),
      onSuccess: () => { invCad(); toast.success("Etapas salvas!"); },
      onError: (e: Error) => toast.error("Erro", { description: e.message }),
    }),
    enroll: useMutation({
      mutationFn: ({ cadence_id, lead_id }: { cadence_id: string; lead_id: string }) =>
        enrollLead(cadence_id, lead_id),
      onSuccess: () => { invEnr(); toast.success("Lead inscrito na cadência!"); },
      onError: (e: Error) => toast.error("Erro ao inscrever", { description: e.message }),
    }),
    cancelEnrollment: useMutation({
      mutationFn: cancelEnrollment,
      onSuccess: () => { invEnr(); toast.success("Inscrição cancelada"); },
      onError: (e: Error) => toast.error("Erro", { description: e.message }),
    }),
  };
}
