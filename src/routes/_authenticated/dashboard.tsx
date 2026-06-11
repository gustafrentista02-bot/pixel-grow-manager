import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Users, Trophy, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLeads, usePurgeExpired } from "@/hooks/use-leads";
import { useAuth } from "@/hooks/use-auth";
import { getTeamMetrics } from "@/lib/leads-api";
import { STAGE_META, KANBAN_STAGES, ORIGINS, ORIGIN_LABELS } from "@/lib/crm";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Pixel CRM" }] }),
  component: DashboardPage,
});

const PIE_COLORS = ["#34d399", "#38bdf8", "#fbbf24", "#a78bfa", "#f87171", "#22d3ee", "#fb923c", "#94a3b8"];

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent ?? "bg-primary/15 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data: auth } = useAuth();
  const { data: leads = [] } = useLeads();
  const purge = usePurgeExpired();

  useEffect(() => {
    purge.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const ganhos = leads.filter((l) => l.stage === "ganho");
    const propostas = leads.filter((l) => l.stage === "proposta").length;
    const faturamento = ganhos.reduce((s, l) => s + l.faturamento_mensal, 0);
    const taxa = total > 0 ? Math.round((ganhos.length / total) * 100) : 0;
    return { total, ganhos: ganhos.length, propostas, faturamento, taxa };
  }, [leads]);

  const byStage = useMemo(
    () => KANBAN_STAGES.map((s) => ({ name: STAGE_META[s].label, value: leads.filter((l) => l.stage === s).length })),
    [leads],
  );

  const byOrigin = useMemo(
    () =>
      ORIGINS.map((o) => ({ name: o.label, value: leads.filter((l) => l.origem === o.value).length })).filter(
        (d) => d.value > 0,
      ),
    [leads],
  );

  const isGerente = auth?.role === "gerente";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Olá, {auth?.nome?.split(" ")[0] || "vendedor"} 👋</p>
      </div>

      {isGerente ? (
        <Tabs defaultValue="minha">
          <TabsList>
            <TabsTrigger value="minha">Minha Performance</TabsTrigger>
            <TabsTrigger value="equipe">Performance da Equipe</TabsTrigger>
          </TabsList>
          <TabsContent value="minha" className="mt-4">
            <MyPerformance stats={stats} byStage={byStage} byOrigin={byOrigin} />
          </TabsContent>
          <TabsContent value="equipe" className="mt-4">
            <TeamPerformance />
          </TabsContent>
        </Tabs>
      ) : (
        <MyPerformance stats={stats} byStage={byStage} byOrigin={byOrigin} />
      )}
    </div>
  );
}

type Stats = { total: number; ganhos: number; propostas: number; faturamento: number; taxa: number };

function MyPerformance({
  stats,
  byStage,
  byOrigin,
}: {
  stats: Stats;
  byStage: { name: string; value: number }[];
  byOrigin: { name: string; value: number }[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total de leads" value={String(stats.total)} />
        <StatCard icon={Trophy} label="Ganhos" value={String(stats.ganhos)} accent="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={TrendingUp} label="Taxa de conversão" value={`${stats.taxa}%`} accent="bg-sky-500/15 text-sky-400" />
        <StatCard icon={DollarSign} label="Faturamento ganho" value={formatCurrency(stats.faturamento)} accent="bg-amber-500/15 text-amber-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Leads por estágio</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byStage} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Leads por origem</CardTitle></CardHeader>
          <CardContent>
            {byOrigin.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={byOrigin} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {byOrigin.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeamPerformance() {
  const { data: team = [], isLoading } = useQuery({ queryKey: ["team-metrics"], queryFn: getTeamMetrics });

  const totals = useMemo(() => {
    return team.reduce(
      (acc, m) => ({
        leads: acc.leads + Number(m.total_leads),
        ganhos: acc.ganhos + Number(m.ganhos),
        faturamento: acc.faturamento + Number(m.faturamento_ganho),
      }),
      { leads: 0, ganhos: 0, faturamento: 0 },
    );
  }, [team]);

  const chartData = team.map((m) => ({ name: m.nome.split(" ")[0], ganhos: Number(m.ganhos), leads: Number(m.total_leads) }));

  if (isLoading) return <p className="text-muted-foreground">Carregando métricas da equipe...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Leads da equipe" value={String(totals.leads)} />
        <StatCard icon={Trophy} label="Ganhos da equipe" value={String(totals.ganhos)} accent="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={DollarSign} label="Faturamento total" value={formatCurrency(totals.faturamento)} accent="bg-amber-500/15 text-amber-400" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ranking de vendedores</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Ganhos</TableHead>
                <TableHead className="text-right">Propostas</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Sem vendedores.</TableCell></TableRow>
              ) : (
                team.map((m, i) => {
                  const taxa = Number(m.total_leads) > 0 ? Math.round((Number(m.ganhos) / Number(m.total_leads)) * 100) : 0;
                  return (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-bold text-muted-foreground">{i + 1}º</TableCell>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell className="text-right">{m.total_leads}</TableCell>
                      <TableCell className="text-right text-emerald-400">{m.ganhos}</TableCell>
                      <TableCell className="text-right">{m.propostas}</TableCell>
                      <TableCell className="text-right">{taxa}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(m.faturamento_ganho))}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Desempenho por vendedor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                <Bar dataKey="leads" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Leads" />
                <Bar dataKey="ganhos" fill="#34d399" radius={[4, 4, 0, 0]} name="Ganhos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
