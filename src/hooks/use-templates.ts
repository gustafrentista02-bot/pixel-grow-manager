import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listProposals,
  createProposal,
  updateProposal,
  deleteProposal,
  listMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  type ProposalInput,
  type MessageInput,
} from "@/lib/templates-api";

export function useProposals() {
  return useQuery({ queryKey: ["proposal-templates"], queryFn: listProposals });
}

export function useProposalMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["proposal-templates"] });

  const create = useMutation({
    mutationFn: (input: ProposalInput) => createProposal(input),
    onSuccess: () => { invalidate(); toast.success("Proposta salva!"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProposalInput> }) => updateProposal(id, input),
    onSuccess: () => { invalidate(); toast.success("Proposta atualizada!"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteProposal(id),
    onSuccess: () => { invalidate(); toast.success("Proposta excluída"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  return { create, update, remove };
}

export function useMessages() {
  return useQuery({ queryKey: ["message-templates"], queryFn: listMessages });
}

export function useMessageMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["message-templates"] });

  const create = useMutation({
    mutationFn: (input: MessageInput) => createMessage(input),
    onSuccess: () => { invalidate(); toast.success("Mensagem salva!"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MessageInput> }) => updateMessage(id, input),
    onSuccess: () => { invalidate(); toast.success("Mensagem atualizada!"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: () => { invalidate(); toast.success("Mensagem excluída"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });
  return { create, update, remove };
}
