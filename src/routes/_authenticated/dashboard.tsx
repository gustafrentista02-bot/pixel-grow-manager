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
import { Block } from "@/components/dashboard/shared";
import { TodayBlock } from "@/components/dashboard/today-block";
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
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();
  const purge = usePurgeExpired();

  useEffect(() => {
    purge.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGerente = auth?.role === "gerente";
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-10">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {saudacao}, {auth?.nome?.split(" ")[0] || "vendedor"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </header>

      {/* BLOCO 1 — HOJE */}
      <Block title="Hoje" icon={Sparkles}>
        <TodayBlock leads={leads} tasks={tasks} />
      </Block>

      {/* BLOCO 2 — ATENÇÃO */}
      <AttentionBlock leads={leads} tasks={tasks} />

      {/* BLOCO 3 — FUNIL */}
      <Block title="Funil de vendas" icon={Filter}>
        <FunnelBlock leads={leads} />
      </Block>

      {/* BLOCO 4 — FINANCEIRO */}
      <Block title="Financeiro" icon={Wallet}>
        <FinanceBlock leads={leads} />
      </Block>

      {/* BLOCO 4.5 — PREVISÃO PONDERADA */}
      <Block title="Previsão de fechamento" icon={Target}>
        <ForecastBlock leads={leads} />
      </Block>

      {/* BLOCO 4.75 — SEO LOCAL (foco do negócio) */}
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

      {/* BLOCOS 5 + 6 lado a lado */}
      <div className="grid gap-8 lg:grid-cols-2">
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

      {/* BLOCO 7 — ATIVIDADE RECENTE */}
      <Block title="Atividade recente" icon={Activity}>
        <ActivityBlock />
      </Block>

      {isGerente && (
        <Block title="Equipe" icon={Trophy}>
          <TeamRanking />
        </Block>
      )}
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
