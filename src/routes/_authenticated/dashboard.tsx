import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Filter,
  Wallet,
  CalendarClock,
  Users,
  Activity,
  Trophy,
  ArrowRight,
  MapPin,
  Target,
  Repeat,
  FileText,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLeads, usePurgeExpired } from "@/hooks/use-leads";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { getTeamMetrics } from "@/lib/leads-api";
import { formatCurrency } from "@/lib/format";
import { Block, KpiCard, KpiCardSkeleton, isToday } from "@/components/dashboard/shared";
import { AttentionBlock } from "@/components/dashboard/attention-block";
import { FunnelBlock } from "@/components/dashboard/funnel-block";
import { FinanceBlock } from "@/components/dashboard/finance-block";
import { MeetingsBlock } from "@/components/dashboard/meetings-block";
import { RecentLeadsBlock } from "@/components/dashboard/recent-leads-block";
import { ActivityBlock } from "@/components/dashboard/activity-block";
import { SeoLocalBlock, ForecastBlock } from "@/components/dashboard/seo-local-block";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Pixel CRM" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: auth } = useAuth();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { data: tasks = [] } = useTasks();
  const purge = usePurgeExpired();

  useEffect(() => {
    purge.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGerente = auth?.role === "gerente";
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const hoje = new Date();

  // KPIs principais — pequenos, elegantes, respondem "como estou hoje?"
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
    return { leadsNovos, followupsPendentes, reunioesHoje, propostasPendentes, ganhosMes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-12">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {saudacao}, {auth?.nome?.split(" ")[0] || "vendedor"}
        </h1>
        <p className="text-sm capitalize text-muted-foreground">
          {hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
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
            <KpiCard icon={Sparkles} tone="green" value={kpis.leadsNovos} label="Leads novos" />
            <KpiCard icon={Repeat} tone="cyan" value={kpis.followupsPendentes} label="Follow-ups pendentes" />
            <KpiCard icon={CalendarClock} tone="violet" value={kpis.reunioesHoje} label="Reuniões de hoje" />
            <KpiCard icon={FileText} tone="orange" value={kpis.propostasPendentes} label="Propostas pendentes" />
            <KpiCard icon={CheckCircle2} tone="amber" value={kpis.ganhosMes} label="Clientes ganhos no mês" />
          </div>
        )}
      </Block>

      {/* ─── 2. PRIORIDADES DO DIA (seção principal) ────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Prioridades do dia
          </h2>
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

      {/* ─── 3. DESEMPENHO ──────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Desempenho
          </h2>
        </div>

        <Block title="Funil de vendas" icon={Filter}>
          <FunnelBlock leads={leads} />
        </Block>

        <Block title="Financeiro" icon={Wallet}>
          <FinanceBlock leads={leads} />
        </Block>

        <Block title="Previsão de fechamento" icon={Target}>
          <ForecastBlock leads={leads} />
        </Block>

        <Block
          title="Oportunidades de SEO Local"
          icon={MapPin}
          action={
            <Link to="/leads" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Ver leads <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <SeoLocalBlock leads={leads} />
        </Block>

        {isGerente && (
          <Block title="Ranking da equipe" icon={Trophy}>
            <TeamRanking />
          </Block>
        )}
      </section>

      {/* ─── 4. ATIVIDADE RECENTE ───────────────────────────────── */}
      <Block title="Atividade recente" icon={Activity}>
        <ActivityBlock />
      </Block>
    </div>
  );
}

function TeamRanking() {
  const { data: team = [], isLoading } = useQuery({ queryKey: ["team-metrics"], queryFn: getTeamMetrics });

  const totals = useMemo(
    () =>
      team.reduce(
        (acc, m) => ({
          leads: acc.leads + Number(m.total_leads),
          ganhos: acc.ganhos + Number(m.ganhos),
          faturamento: acc.faturamento + Number(m.faturamento_ganho),
        }),
        { leads: 0, ganhos: 0, faturamento: 0 },
      ),
    [team],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando métricas da equipe...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card/40">
        <div className="p-4">
          <p className="text-xl font-bold">{totals.leads}</p>
          <p className="text-xs text-muted-foreground">Leads da equipe</p>
        </div>
        <div className="p-4">
          <p className="text-xl font-bold text-emerald-400">{totals.ganhos}</p>
          <p className="text-xs text-muted-foreground">Ganhos</p>
        </div>
        <div className="p-4">
          <p className="text-xl font-bold text-amber-400">{formatCurrency(totals.faturamento)}</p>
          <p className="text-xs text-muted-foreground">Faturamento</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Ganhos</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Sem vendedores.
                </TableCell>
              </TableRow>
            ) : (
              team.map((m, i) => {
                const taxa = Number(m.total_leads) > 0 ? Math.round((Number(m.ganhos) / Number(m.total_leads)) * 100) : 0;
                return (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}º</TableCell>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="text-right">{m.total_leads}</TableCell>
                    <TableCell className="text-right text-emerald-400">{m.ganhos}</TableCell>
                    <TableCell className="text-right">{taxa}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(m.faturamento_ganho))}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
