import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;

export const TASK_CATEGORIES = [
  { value: "ligacao", label: "Ligação", emoji: "📞" },
  { value: "email", label: "E-mail", emoji: "✉️" },
  { value: "reuniao", label: "Reunião", emoji: "🗓️" },
  { value: "proposta", label: "Proposta", emoji: "📄" },
  { value: "followup", label: "Follow-up", emoji: "🔁" },
  { value: "outro", label: "Outro", emoji: "•" },
] as const;
export type TaskCategoria = (typeof TASK_CATEGORIES)[number]["value"];

export const TASK_PRIORITIES = [
  { value: "alta", label: "Alta", color: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
  { value: "media", label: "Média", color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  { value: "baixa", label: "Baixa", color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
] as const;
export type TaskPrioridade = (typeof TASK_PRIORITIES)[number]["value"];

export type TaskInput = {
  titulo: string;
  descricao: string;
  due_date: string | null;
  due_time: string | null;
  lead_id: string | null;
  categoria: TaskCategoria;
  prioridade: TaskPrioridade;
};


export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, owner_id: uid })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function toggleTask(id: string, done: boolean): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
