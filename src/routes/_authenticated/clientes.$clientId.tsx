import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  ExternalLink,
  ClipboardList,
  FileText,
  Folder,
  Gauge,
  Sparkles,
  CalendarClock,
  Users,
  DollarSign,
  BadgeCheck,
  Rocket,
  History,
  Wallet,
  ListChecks,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  KpiCard,
  InfoCard,
  Block,
  EmptyState,
  SectionHeader,
} from "@/components/pixel";
import { ClientStatusBadge } from "@/components/pixel/client-status";
import {
  findPlaceholderClient,
  formatBrl,
  timeAsClient,
  type ClientRecord,
} from "@/lib/clients-placeholder";

export const Route = createFileRoute("/_authenticated/clientes/$clientId")({
  loader: ({ params }) => {
    const client = findPlaceholderClient(params.clientId);
    if (!client) throw notFound();
    return { client };
  },
  head: ({ loaderData }) => {
    const empresa = loaderData?.client.empresa ?? "Cliente";
    return {
      meta: [
        { title: `${empresa} — Clientes · Pixel CRM` },
        {
          name: "description",
          content: `Workspace do cliente ${empresa}: implantação, SEO Score, Google Business, plano de ação e histórico.`,
        },
        { property: "og:title", content: `${empresa} — Clientes · Pixel CRM` },
        {
          property: "og:description",
          content: `Workspace do cliente ${empresa} no Pixel CRM.`,
        },
        { property: "og:type", content: "website" },
      ],
    };
  },
  notFoundComponent: ClientNotFound,
  component: ClientWorkspacePage,
});

function ClientNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 p-10 text-center">
      <EmptyState
        icon={Users}
        title="Cliente não encontrado"
        description="O cliente que você tentou abrir não existe ou foi removido."
        action={
          <Button asChild size="sm">
            <Link to="/clientes">Voltar para a lista</Link>
          </Button>
        }
      />
    </div>
  );
}

function ClientWorkspacePage() {
  const { client } = Route.useLoaderData();
  const [tab, setTab] = useState("overview");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <ClientHeader client={client} />
      <SummaryStrip client={client} />

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/30 p-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="google-business">Google Business</TabsTrigger>
          <TabsTrigger value="seo">SEO Score</TabsTrigger>
          <TabsTrigger value="auditorias">Auditorias</TabsTrigger>
          <TabsTrigger value="plano-acao">Plano de Ação</TabsTrigger>
          <TabsTrigger value="projetos">Projetos</TabsTrigger>
          <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab client={client} />
        </TabsContent>

        <TabsContent value="google-business" className="mt-0">
          <GoogleBusinessTab />
        </TabsContent>

        <TabsContent value="seo" className="mt-0">
          <PlaceholderTab
            icon={Gauge}
            title="SEO Score"
            description="Motor de SEO Local com histórico de evolução — será plugado a partir do Google Business Hub."
          />
        </TabsContent>

        <TabsContent value="auditorias" className="mt-0">
          <PlaceholderTab
            icon={ClipboardList}
            title="Auditorias"
            description="Histórico de auditorias do cliente com score e recomendações."
          />
        </TabsContent>

        <TabsContent value="plano-acao" className="mt-0">
          <PlaceholderTab
            icon={Sparkles}
            title="Plano de Ação"
            description="Recomendações priorizadas transformadas em tarefas para a equipe."
          />
        </TabsContent>

        <TabsContent value="projetos" className="mt-0">
          <PlaceholderTab
            icon={ListChecks}
            title="Projetos"
            description="Projetos entregáveis: implantação, campanhas e sprints operacionais."
          />
        </TabsContent>

        <TabsContent value="arquivos" className="mt-0">
          <PlaceholderTab
            icon={Folder}
            title="Arquivos"
            description="Contratos, briefings, artes e materiais compartilhados com o cliente."
          />
        </TabsContent>

        <TabsContent value="financeiro" className="mt-0">
          <PlaceholderTab
            icon={Wallet}
            title="Financeiro"
            description="Mensalidade, faturas, reajustes e histórico financeiro."
            hint="Placeholder — a ser conectado ao módulo Financeiro."
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          <PlaceholderTab
            icon={History}
            title="Histórico"
            description="Linha do tempo com todas as ações, reuniões e entregas do cliente."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
function ClientHeader({ client }: { client: ClientRecord }) {
  return (
    <header className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5 text-muted-foreground">
        <Link to="/clientes">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Clientes
        </Link>
      </Button>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {client.empresa}
              </h1>
              <ClientStatusBadge status={client.status} size="md" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                Plano {client.plano}
              </span>
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {formatBrl(client.mensalidade)}/mês
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {client.responsavelInterno}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Desde {new Date(client.dataEntrada).toLocaleDateString("pt-BR")}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                {timeAsClient(client.dataEntrada)} como cliente
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/google-business">
              <Building2 className="h-4 w-4" />
              Google Business
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Nova Auditoria
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Novo Relatório
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Folder className="h-4 w-4" />
            Arquivos
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Summary strip                                                       */
/* ------------------------------------------------------------------ */
function SummaryStrip({ client }: { client: ClientRecord }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        icon={Gauge}
        value={String(client.seoScore)}
        label="SEO Score"
        tone={client.seoScore >= 70 ? "green" : client.seoScore >= 50 ? "sky" : "amber"}
      />
      <KpiCard icon={ClipboardList} value="—" label="Última auditoria" tone="violet" hint="Aguardando dados" />
      <KpiCard icon={Sparkles} value="—" label="Ações pendentes" tone="amber" hint="Plano de ação" />
      <KpiCard
        icon={Rocket}
        value={`${client.statusImplantacao}%`}
        label="Implantação"
        tone={client.statusImplantacao >= 100 ? "green" : "sky"}
      />
      <KpiCard icon={CalendarClock} value={client.proximaRevisao} label="Próxima revisão" tone="sky" />
      <KpiCard icon={History} value={client.ultimaAtividade} label="Última atividade" tone="violet" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visão Geral                                                         */
/* ------------------------------------------------------------------ */
function OverviewTab({ client }: { client: ClientRecord }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Block title="Resumo Executivo" icon={BadgeCheck}>
          <Card className="border-border/60 bg-card/40">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <InfoCard icon={Gauge} label="SEO Score" value={String(client.seoScore)} hint="Placeholder" />
              <InfoCard icon={ClipboardList} label="Última auditoria" value="—" hint="Aguardando integração" />
              <InfoCard icon={Sparkles} label="Ações pendentes" value="—" hint="Plano de ação" />
              <InfoCard icon={Rocket} label="Status da implantação" value={`${client.statusImplantacao}%`} />
              <InfoCard icon={CalendarClock} label="Última reunião" value="—" />
              <InfoCard icon={CalendarClock} label="Próxima revisão" value={client.proximaRevisao} />
              <InfoCard icon={Building2} label="Google Business" value="Perfil vinculado" hint="Aguardando dados" />
              <InfoCard icon={BadgeCheck} label="Plano contratado" value={client.plano} />
              <InfoCard icon={DollarSign} label="Mensalidade" value={`${formatBrl(client.mensalidade)}/mês`} />
              <InfoCard icon={CalendarClock} label="Tempo de contrato" value={timeAsClient(client.dataEntrada)} />
            </CardContent>
          </Card>
        </Block>

        <ImplantationBlock value={client.statusImplantacao} />
        <GoogleBusinessCompactBlock seoScore={client.seoScore} />
      </div>

      <aside className="flex flex-col gap-6">
        <Block title="Responsáveis" icon={Users}>
          <Card className="border-border/60 bg-card/40">
            <CardContent className="grid gap-3 p-4">
              <InfoCard icon={Users} label="Responsável interno" value={client.responsavelInterno} />
              <InfoCard icon={Users} label="Contato principal" value="—" hint="Aguardando cadastro" />
            </CardContent>
          </Card>
        </Block>

        <Block title="Financeiro" icon={Wallet}>
          <Card className="border-border/60 bg-card/40">
            <CardContent className="grid gap-3 p-4">
              <InfoCard icon={DollarSign} label="Mensalidade" value={`${formatBrl(client.mensalidade)}/mês`} />
              <InfoCard icon={CalendarClock} label="Próxima cobrança" value="—" hint="Placeholder" />
              <InfoCard icon={BadgeCheck} label="Status do pagamento" value="—" />
            </CardContent>
          </Card>
        </Block>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Implantação                                                         */
/* ------------------------------------------------------------------ */
function ImplantationBlock({ value }: { value: number }) {
  const done = value >= 100;
  return (
    <Block title="Implantação" icon={Rocket}>
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-display text-3xl font-bold tabular-nums">
                {value}%
              </p>
              <p className="text-xs text-muted-foreground">
                {done ? "Implantação concluída" : "Progresso da implantação"}
              </p>
            </div>
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Placeholder
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className={
                "h-full rounded-full transition-all " +
                (done ? "bg-emerald-400" : value >= 60 ? "bg-sky-400" : "bg-amber-400")
              }
              style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
            />
          </div>
          <EmptyState
            compact
            icon={ListChecks}
            title="Checklist de implantação"
            description="A lista detalhada de etapas será conectada nas próximas Sprints (kickoff, acessos, GBP, SEO on-page, treinamento)."
          />
        </CardContent>
      </Card>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* Google Business compacto                                            */
/* ------------------------------------------------------------------ */
function GoogleBusinessCompactBlock({ seoScore }: { seoScore: number }) {
  return (
    <Block title="Google Business" icon={Building2}>
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoCard icon={Gauge} label="SEO Score" value={String(seoScore)} hint="Score ponderado" />
            <InfoCard icon={ClipboardList} label="Auditorias" value="—" hint="Aguardando 1ª auditoria" />
            <InfoCard icon={Sparkles} label="Plano de Ação" value="—" hint="Recomendações priorizadas" />
          </div>
          <div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/google-business">
                <ExternalLink className="h-4 w-4" />
                Abrir Google Business Hub
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* Google Business Tab                                                 */
/* ------------------------------------------------------------------ */
function GoogleBusinessTab() {
  return (
    <Block title="Google Business" icon={Building2}>
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col gap-4 p-6">
          <SectionHeader
            variant="block"
            title="Perfil vinculado"
            description="Score, auditorias e plano de ação são gerenciados no Google Business Hub."
          />
          <Button asChild variant="outline" size="sm" className="w-fit gap-1.5">
            <Link to="/google-business">
              <ExternalLink className="h-4 w-4" />
              Abrir Google Business Hub
            </Link>
          </Button>
        </CardContent>
      </Card>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* Placeholder Tab                                                     */
/* ------------------------------------------------------------------ */
function PlaceholderTab({
  icon: Icon,
  title,
  description,
  hint,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <Block title={title} icon={Icon}>
      <EmptyState
        icon={Icon}
        title={title}
        description={description}
        action={
          hint ? (
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {hint}
            </span>
          ) : undefined
        }
      />
    </Block>
  );
}
