import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Filter,
  Wallet,
  CalendarClock,
  Users,
  Activity,
  ArrowRight,
  MapPin,
  Target,
  Repeat,
  FileText,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { useLeads, usePurgeExpired } from "@/hooks/use-leads";
import { useTasks } from "@/hooks/use-tasks";
import { Block, KpiCard, KpiCardSkeleton, isToday } from "@/components/dashboard/shared";
import { AttentionBlock } from "@/components/dashboard/attention-block";
import { FunnelBlock } from "@/components/dashboard/funnel-block";
import { FinanceBlock } from "@/components/dashboard/finance-block";
import { MeetingsBlock } from "@/components/dashboard/meetings-block";
import { RecentLeadsBlock } from "@/components/dashboard/recent-leads-block";
import { ActivityBlock } from "@/components/dashboard/activity-block";
import { SeoLocalBlock, ForecastBlock } from "@/components/dashboard/seo-local-block";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Comercial · Pixel CRM" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { data: tasks = [] } = useTasks();
  const purge = usePurgeExpired();

  useEffect(() => {
    purge.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // KPIs — deltas ficam preparados (null enquanto não há histórico)
  const kpis = useMemo(() => {
    const leadsNovos = leads.filter((l) => l.stage === "lead_novo").length;
    const followupsPendentes = leads.filter((l) => l.stage === "follow_up").length;
    const reunioesHoje = leads.filter((l) => isToday(l.reuniao_at)).length;
    const propostasPendentes = leads.filter((l) => l.stage === "proposta").length;
    const ganhosMes = leads.filter((l) => {
      if (l.stage !== "ganho") return false;
      const d = new Date(l.updated_at);
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    }).length;
    return {
      leadsNovos,
      followupsPendentes,
      reunioesHoje,
      propostasPendentes,
      ganhosMes,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  // Sem histórico ainda — estrutura pronta pra receber comparativos
  const delta = {
    leadsNovos: null as number | null,
    followupsPendentes: null as number | null,
    reunioesHoje: null as number | null,
    propostasPendentes: null as number | null,
    ganhosMes: null as number | null,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-14 pb-16">
      {/* ─── Cabeçalho institucional ─────────────────────────────── */}
      <header className="space-y-1.5">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard Comercial
        </h1>
        <p className="text-sm capitalize text-muted-foreground">{dataFormatada}</p>
      </header>

      {/* ─── 1. KPIs PRINCIPAIS ─────────────────────────────────── */}
      <Block title="Visão do dia" icon={BarChart3}>
        {loadingLeads ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <KpiCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard icon={Sparkles} tone="green" value={kpis.leadsNovos} label="Leads novos" delta={delta.leadsNovos} />
            <KpiCard icon={Repeat} tone="cyan" value={kpis.followupsPendentes} label="Follow-ups pendentes" delta={delta.followupsPendentes} />
            <KpiCard icon={CalendarClock} tone="violet" value={kpis.reunioesHoje} label="Reuniões de hoje" delta={delta.reunioesHoje} />
            <KpiCard icon={FileText} tone="orange" value={kpis.propostasPendentes} label="Propostas pendentes" delta={delta.propostasPendentes} />
            <KpiCard icon={CheckCircle2} tone="amber" value={kpis.ganhosMes} label="Ganhos no mês" delta={delta.ganhosMes} />
          </div>
        )}
      </Block>

      {/* ─── 2. PRIORIDADES DO DIA (destaque principal) ─────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">
                Prioridades do dia
              </h2>
              <p className="text-xs text-muted-foreground">
                Sua próxima ação, em ordem de urgência
              </p>
            </div>
          </div>
        </div>

        <AttentionBlock leads={leads} tasks={tasks} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Block
            title="Próximas reuniões"
            icon={CalendarClock}
            action={
              <Link to="/funil" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Ver funil <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <MeetingsBlock leads={leads} />
          </Block>

          <Block
            title="Leads recentes"
            icon={Users}
            action={
              <Link to="/leads" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <RecentLeadsBlock leads={leads} />
          </Block>
        </div>
      </section>

      {/* ─── 3. ATIVIDADE RECENTE (subiu — alta importância operacional) ── */}
      <Block title="Atividade recente" icon={Activity}>
        <ActivityBlock />
      </Block>

      {/* ─── 4. DESEMPENHO ──────────────────────────────────────── */}
      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Desempenho
          </h2>
        </div>

        <Block title="Previsão de fechamento" icon={Target}>
          <ForecastBlock leads={leads} />
        </Block>

        <Block title="Funil de vendas" icon={Filter}>
          <FunnelBlock leads={leads} />
        </Block>

        <Block title="Financeiro" icon={Wallet}>
          <FinanceBlock leads={leads} />
        </Block>

        <Block
          title="Oportunidades de SEO Local"
          icon={MapPin}
          action={
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Em evolução → Score Comercial
            </span>
          }
        >
          <SeoLocalBlock leads={leads} />
        </Block>
      </section>
    </div>
  );
}
