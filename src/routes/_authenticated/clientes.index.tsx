import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Filter,
  ExternalLink,
  MessageSquare,
  Building2,
  CheckCircle2,
  Rocket,
  PauseCircle,
  RefreshCw,
  Gauge,
  DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  KpiCard,
  SectionHeader,
  EmptyState,
} from "@/components/pixel";
import {
  ClientStatusBadge,
  type ClientStatus,
} from "@/components/pixel/client-status";
import {
  PLACEHOLDER_CLIENTS,
  formatBrl,
  type ClientRecord,
} from "@/lib/clients-placeholder";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Pixel CRM" },
      {
        name: "description",
        content:
          "Base de clientes ativos: implantação, plano contratado, SEO Score, próxima revisão e operação recorrente.",
      },
      { property: "og:title", content: "Clientes — Pixel CRM" },
      {
        property: "og:description",
        content:
          "Gestão de clientes ativos da agência: implantação, planos, SEO Score e relacionamento contínuo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientsListPage,
});

type StatusFilter = "todos" | ClientStatus;

function ClientsListPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("todos");

  const filtered = useMemo<ClientRecord[]>(() => {
    const query = q.trim().toLowerCase();
    return PLACEHOLDER_CLIENTS.filter((c) => {
      if (filter !== "todos" && c.status !== filter) return false;
      if (!query) return true;
      return (
        c.empresa.toLowerCase().includes(query) ||
        c.responsavelInterno.toLowerCase().includes(query) ||
        c.plano.toLowerCase().includes(query)
      );
    });
  }, [q, filter]);

  const totals = useMemo(() => {
    const ativos = PLACEHOLDER_CLIENTS.filter((c) => c.status === "ativo").length;
    const implantacao = PLACEHOLDER_CLIENTS.filter((c) => c.status === "implantacao").length;
    const renovacao = PLACEHOLDER_CLIENTS.filter((c) => c.status === "renovacao").length;
    const pausados = PLACEHOLDER_CLIENTS.filter((c) => c.status === "pausado").length;
    const mrr = PLACEHOLDER_CLIENTS.filter((c) => c.status !== "cancelado").reduce(
      (acc, c) => acc + c.mensalidade,
      0,
    );
    return { ativos, implantacao, renovacao, pausados, mrr };
  }, []);

  const filters: { value: StatusFilter; label: string; count: number }[] = [
    { value: "todos", label: "Todos", count: PLACEHOLDER_CLIENTS.length },
    { value: "ativo", label: "Ativos", count: totals.ativos },
    { value: "implantacao", label: "Implantação", count: totals.implantacao },
    { value: "renovacao", label: "Renovação", count: totals.renovacao },
    { value: "pausado", label: "Pausados", count: totals.pausados },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <SectionHeader
        variant="page"
        icon={Users}
        title="Clientes"
        description="Base de clientes ativos da agência — implantação, operação recorrente e SEO local."
        action={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo cliente
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard icon={CheckCircle2} value={String(totals.ativos)} label="Ativos" tone="green" />
        <KpiCard icon={Rocket} value={String(totals.implantacao)} label="Implantação" tone="sky" />
        <KpiCard icon={RefreshCw} value={String(totals.renovacao)} label="Renovação" tone="violet" />
        <KpiCard icon={PauseCircle} value={String(totals.pausados)} label="Pausados" tone="amber" />
        <KpiCard icon={DollarSign} value={formatBrl(totals.mrr)} label="MRR estimado" tone="green" hint="Placeholder" />
      </div>

      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por empresa, responsável ou plano…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {filters.map((f) => {
                const active = filter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter(f.value)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                      (active
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground")
                    }
                  >
                    {f.label}
                    <span
                      className={
                        "rounded-full px-1.5 py-0 text-[10px] tabular-nums " +
                        (active ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground")
                      }
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum cliente encontrado"
              description="Ajuste os filtros ou converta um Lead em cliente na tela do funil."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="min-w-[200px]">Empresa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Mensalidade</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead className="min-w-[160px]">Implantação</TableHead>
                    <TableHead>SEO Score</TableHead>
                    <TableHead>Última atividade</TableHead>
                    <TableHead>Próx. revisão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <ClientRow key={c.id} client={c} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientRow({ client }: { client: ClientRecord }) {
  const navigate = { to: "/clientes/$clientId", params: { clientId: client.id } } as const;
  return (
    <TableRow className="cursor-pointer">
      <TableCell>
        <Link
          to="/clientes/$clientId"
          params={{ clientId: client.id }}
          className="flex items-center gap-3 group"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold group-hover:text-primary">
              {client.empresa}
            </p>
            {client.cidade && (
              <p className="truncate text-[11px] text-muted-foreground">
                {client.cidade}
                {client.uf ? ` · ${client.uf}` : ""}
              </p>
            )}
          </div>
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{client.responsavelInterno}</TableCell>
      <TableCell>
        <span className="inline-flex items-center rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[11px] font-medium">
          {client.plano}
        </span>
      </TableCell>
      <TableCell className="text-right text-sm font-semibold tabular-nums">
        {formatBrl(client.mensalidade)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(client.dataEntrada).toLocaleDateString("pt-BR")}
      </TableCell>
      <TableCell>
        <ImplProgress value={client.statusImplantacao} />
      </TableCell>
      <TableCell>
        <SeoPill score={client.seoScore} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{client.ultimaAtividade}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{client.proximaRevisao}</TableCell>
      <TableCell>
        <ClientStatusBadge status={client.status} />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="WhatsApp">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Abrir Workspace">
            <Link {...navigate}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ImplProgress({ value }: { value: number }) {
  const done = value >= 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/40">
        <div
          className={
            "h-full rounded-full transition-all " +
            (done ? "bg-emerald-400" : value >= 60 ? "bg-sky-400" : "bg-amber-400")
          }
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
      <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
        {value}%
      </span>
    </div>
  );
}

function SeoPill({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : score >= 60
        ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
        : score >= 40
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums " +
        tone
      }
    >
      <Gauge className="h-3 w-3" />
      {score}
    </span>
  );
}
