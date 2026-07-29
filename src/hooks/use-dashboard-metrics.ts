import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayRange, monthRange, isWithin } from "@/lib/tz";
import { useLeads } from "@/hooks/use-leads";

export type PeriodMetrics = {
  leadsNovos: number;
  followupsPendentes: number;
  followupsRealizados: number;
  reunioes: number;
  propostasEnviadas: number;
  ganhos: number;
  perdidos: number;
};

export type DashboardMetrics = {
  totalLeads: number;
  dia: PeriodMetrics;
  mes: PeriodMetrics;
};

const LOSS_STAGES = new Set(["perdido", "sem_interesse"]);

/**
 * Busca todas as movimentações, eventos e envios de proposta do mês corrente (fuso da org)
 * e agrega em dois buckets: "dia" e "mês". Combina com os leads já em cache.
 *
 * Denominador do percentual: `totalLeads` (base total da org visível pelo RLS).
 */
export function useDashboardMetrics() {
  const { data: leads = [], isLoading: leadsLoading } = useLeads();

  const activity = useQuery({
    queryKey: ["dashboard-activity"],
    staleTime: 30_000,
    queryFn: async () => {
      const { start: monthStart, end: monthEnd } = monthRange();
      const [movementsRes, eventsRes, proposalsRes] = await Promise.all([
        supabase
          .from("lead_movements")
          .select("to_stage, created_at, lead_id")
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd),
        supabase
          .from("lead_events")
          .select("tipo, created_at, lead_id")
          .in("tipo", ["followup_realizado", "proposta"])
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd),
        supabase
          .from("proposal_sends")
          .select("enviada_em, lead_id")
          .gte("enviada_em", monthStart)
          .lt("enviada_em", monthEnd),
      ]);
      if (movementsRes.error) throw movementsRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (proposalsRes.error) throw proposalsRes.error;
      return {
        movements: movementsRes.data ?? [],
        events: eventsRes.data ?? [],
        proposals: proposalsRes.data ?? [],
      };
    },
  });

  const isLoading = leadsLoading || activity.isLoading;

  const { start: dayStart, end: dayEnd } = dayRange();
  const { start: monthStart, end: monthEnd } = monthRange();

  function compute(start: string, end: string): PeriodMetrics {
    const leadsNovos = leads.filter((l) => isWithin(l.created_at, start, end)).length;

    const followupsPendentes = leads.filter((l) => {
      if (!l.proximo_followup_at) return false;
      if (l.stage === "ganho" || LOSS_STAGES.has(l.stage)) return false;
      // Pendente = agendado até o fim do período e ainda não realizado no período.
      if (l.proximo_followup_at >= end) return false;
      // Consideramos "realizado" se existe evento followup_realizado depois do agendamento e dentro do período.
      const realizado = (activity.data?.events ?? []).some(
        (e) =>
          e.tipo === "followup_realizado" &&
          e.lead_id === l.id &&
          e.created_at >= (l.proximo_followup_at as string) &&
          e.created_at < end,
      );
      return !realizado;
    }).length;

    const followupsRealizados = (activity.data?.events ?? []).filter(
      (e) => e.tipo === "followup_realizado" && isWithin(e.created_at, start, end),
    ).length;

    const reunioes = leads.filter((l) => isWithin(l.reuniao_at, start, end)).length;

    // Propostas: proposal_sends OR lead_events.tipo === "proposta", dedupe por lead_id + timestamp aproximado.
    const proposalKeys = new Set<string>();
    (activity.data?.proposals ?? [])
      .filter((p) => isWithin(p.enviada_em, start, end))
      .forEach((p) => proposalKeys.add(`${p.lead_id}:${p.enviada_em}`));
    (activity.data?.events ?? [])
      .filter((e) => e.tipo === "proposta" && isWithin(e.created_at, start, end))
      .forEach((e) => {
        // se já existe um proposal_sends próximo (mesmo lead e mesmo minuto), não conta de novo
        const near = Array.from(proposalKeys).some((k) => {
          const [lid, ts] = k.split(":");
          if (lid !== e.lead_id) return false;
          return Math.abs(new Date(ts).getTime() - new Date(e.created_at).getTime()) < 60_000;
        });
        if (!near) proposalKeys.add(`event:${e.lead_id}:${e.created_at}`);
      });
    const propostasEnviadas = proposalKeys.size;

    const movementsInRange = (activity.data?.movements ?? []).filter((m) =>
      isWithin(m.created_at, start, end),
    );
    const ganhos = movementsInRange.filter((m) => m.to_stage === "ganho").length;
    const perdidos = movementsInRange.filter((m) => LOSS_STAGES.has(m.to_stage)).length;

    return {
      leadsNovos,
      followupsPendentes,
      followupsRealizados,
      reunioes,
      propostasEnviadas,
      ganhos,
      perdidos,
    };
  }

  const data: DashboardMetrics = {
    totalLeads: leads.length,
    dia: compute(dayStart, dayEnd),
    mes: compute(monthStart, monthEnd),
  };

  return { data, isLoading, error: activity.error };
}
