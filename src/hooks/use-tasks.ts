import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listTasks,
  createTask,
  updateTask,
  toggleTask,
  deleteTask,
  type TaskInput,
} from "@/lib/tasks-api";

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: listTasks });
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const create = useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => { invalidate(); toast.success("Tarefa criada!"); },
    onError: (e: Error) => toast.error("Erro ao criar tarefa", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TaskInput> }) => updateTask(id, input),
    onSuccess: () => { invalidate(); toast.success("Tarefa atualizada!"); },
    onError: (e: Error) => toast.error("Erro ao atualizar tarefa", { description: e.message }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleTask(id, done),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => { invalidate(); toast.success("Tarefa excluída"); },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  return { create, update, toggle, remove };
}
