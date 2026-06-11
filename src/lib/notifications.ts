import type { Lead } from "@/lib/leads-api";
import type { Task } from "@/lib/tasks-api";

export type NotificationKind =
  | "tarefa_vencida"
  | "tarefa_hoje"
  | "followup_atrasado"
  | "proposta_aguardando"
  | "reuniao_hoje";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  leadId?: string;
  severity: "warning" | "info";
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole days elapsed since an ISO timestamp. */
export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/** Days until a due_date (YYYY-MM-DD). Negative = overdue. */
export function daysUntilDate(date: string | null | undefined): number | null {
  if (!date) return null;
  const due = new Date(`${date}T00:00:00`).getTime();
  return Math.round((due - startOfToday()) / 86_400_000);
}

const FOLLOWUP_STALE_DAYS = 2;
const PROPOSTA_STALE_DAYS = 2;

export function buildNotifications(leads: Lead[], tasks: Task[]): AppNotification[] {
  const out: AppNotification[] = [];

  for (const t of tasks) {
    if (t.done) continue;
    const d = daysUntilDate(t.due_date);
    if (d === null) continue;
    if (d < 0) {
      out.push({
        id: `task-${t.id}`,
        kind: "tarefa_vencida",
        title: "Tarefa vencida",
        description: `${t.titulo} — venceu há ${Math.abs(d)} dia(s)`,
        leadId: t.lead_id ?? undefined,
        severity: "warning",
      });
    } else if (d === 0) {
      out.push({
        id: `task-${t.id}`,
        kind: "tarefa_hoje",
        title: "Tarefa para hoje",
        description: `${t.titulo}${t.due_time ? ` às ${t.due_time}` : ""}`,
        leadId: t.lead_id ?? undefined,
        severity: "info",
      });
    }
  }

  for (const l of leads) {
    if (l.stage === "follow_up") {
      const days = daysSince(l.last_interaction_at);
      if (days >= FOLLOWUP_STALE_DAYS) {
        out.push({
          id: `fu-${l.id}`,
          kind: "followup_atrasado",
          title: "Follow-up atrasado",
          description: `${l.nome} — sem contato há ${days} dia(s)`,
          leadId: l.id,
          severity: "warning",
        });
      }
    }
    if (l.stage === "proposta") {
      const days = daysSince(l.last_interaction_at);
      if (days >= PROPOSTA_STALE_DAYS) {
        out.push({
          id: `pr-${l.id}`,
          kind: "proposta_aguardando",
          title: "Proposta aguardando retorno",
          description: `${l.nome} — proposta enviada há ${days} dia(s)`,
          leadId: l.id,
          severity: "info",
        });
      }
    }
  }

  return out;
}
