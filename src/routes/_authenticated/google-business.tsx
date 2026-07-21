import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Star,
  MessageSquare,
  Image as ImageIcon,
  Wrench,
  History,
  ClipboardList,
  Gauge,
  MapPin,
  Phone,
  Globe,
  Tag,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SectionHeader,
  InfoCard,
  KpiCard,
  Block,
  EmptyState,
  ExternalLinkCard,
  ExternalLinkGrid,
} from "@/components/pixel";

export const Route = createFileRoute("/_authenticated/google-business")({
  head: () => ({
    meta: [
      { title: "Google Business Hub — Pixel CRM" },
      {
        name: "description",
        content:
          "Centro de gerenciamento do Perfil da Empresa no Google: presença digital, score SEO local, auditorias, avaliações, postagens e fotos.",
      },
      { property: "og:title", content: "Google Business Hub — Pixel CRM" },
      {
        property: "og:description",
        content:
          "Gerencie o Perfil da Empresa no Google: score SEO local, auditorias, avaliações, postagens e fotos em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoogleBusinessHubPage,
});

function GoogleBusinessHubPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <CompanyHeader />
      <KpiStrip />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal (2/3) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ProfileInfoBlock />
          <DigitalPresenceBlock />
          <AuditsBlock />
          <ReviewsBlock />
          <PostsBlock />
          <PhotosBlock />
        </div>

        {/* Sidebar direita (1/3) */}
        <aside className="flex flex-col gap-6">
          <ScoreCard />
          <ServicesBlock />
          <HistoryBlock />
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho da empresa                                                */
/* ------------------------------------------------------------------ */
function CompanyHeader() {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Building2 className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Google Business Hub
            </h1>
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Perfil ativo
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            Centro de gerenciamento do Perfil da Empresa no Google — score, auditorias, avaliações,
            postagens e fotos em um só lugar.
          </p>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* KPIs de topo                                                        */
/* ------------------------------------------------------------------ */
function KpiStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard icon={Gauge} value="—" label="Score SEO Local" tone="violet" hint="Aguardando 1ª auditoria" />
      <KpiCard icon={Star} value="—" label="Avaliação média" tone="amber" hint="Aguardando integração" />
      <KpiCard icon={ClipboardList} value="0" label="Auditorias realizadas" tone="sky" />
      <KpiCard icon={TrendingUp} value="—" label="Evolução no mês" tone="green" hint="Aguardando histórico" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Informações do Perfil                                            */
/* ------------------------------------------------------------------ */
function ProfileInfoBlock() {
  return (
    <Block title="Informações do Perfil" icon={BadgeCheck}>
      <Card className="border-border/60 bg-card/40">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <InfoCard icon={Building2} label="Nome da empresa" value="—" hint="Ainda não vinculado" />
          <InfoCard icon={Tag} label="Categoria principal" value="—" />
          <InfoCard icon={Tag} label="Categoria secundária" value="—" />
          <InfoCard icon={MapPin} label="Endereço" value="—" />
          <InfoCard icon={Phone} label="Telefone" value="—" />
          <InfoCard icon={Globe} label="Website" value="—" />
          <InfoCard
            icon={CheckCircle2}
            label="Status"
            value={
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Aguardando dados
              </span>
            }
            className="sm:col-span-2"
          />
        </CardContent>
      </Card>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Presença Digital                                                 */
/* ------------------------------------------------------------------ */
function DigitalPresenceBlock() {
  return (
    <Block title="Presença Digital" icon={Globe}>
      <ExternalLinkGrid>
        <ExternalLinkCard kind="google-profile" />
        <ExternalLinkCard kind="site" />
        <ExternalLinkCard kind="instagram" />
        <ExternalLinkCard kind="facebook" />
        <ExternalLinkCard kind="whatsapp" />
        <ExternalLinkCard kind="google-maps" />
      </ExternalLinkGrid>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Score Geral (sidebar)                                            */
/* ------------------------------------------------------------------ */
function ScoreCard() {
  return (
    <Block title="Score SEO Local" icon={Gauge}>
      <Card className="border-border/60 bg-card/40">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="relative grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-violet-500/20 to-primary/10 ring-1 ring-violet-500/30">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-card">
              <div>
                <p className="font-display text-3xl font-bold tabular-nums leading-none">—</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  /100
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Score indisponível</p>
            <p className="text-xs text-muted-foreground">
              Realize a primeira auditoria para calcular o score SEO Local do perfil.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 border-t border-border/60 pt-4">
            <MiniStat label="Ficha" value="—" />
            <MiniStat label="Fotos" value="—" />
            <MiniStat label="Reviews" value="—" />
          </div>
        </CardContent>
      </Card>
    </Block>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-base font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Auditorias                                                       */
/* ------------------------------------------------------------------ */
function AuditsBlock() {
  return (
    <Block title="Auditorias" icon={ClipboardList}>
      <EmptyState
        icon={ClipboardList}
        title="Nenhuma auditoria realizada"
        description="Assim que a primeira auditoria for gerada, o histórico aparecerá aqui com score, evolução e recomendações."
      />
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Avaliações                                                       */
/* ------------------------------------------------------------------ */
function ReviewsBlock() {
  return (
    <Block title="Avaliações" icon={Star}>
      <Card className="border-border/60 bg-card/40">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <InfoCard icon={Star} label="Nota média" value="—" hint="0 avaliações" />
          <InfoCard icon={MessageSquare} label="Respondidas" value="—" hint="0%" />
          <InfoCard icon={Sparkles} label="Sentimento" value="—" hint="Aguardando dados" />
          <div className="sm:col-span-3">
            <EmptyState
              compact
              icon={Star}
              title="Sem avaliações importadas"
              description="As avaliações do Perfil Google aparecerão aqui quando a integração for ativada."
            />
          </div>
        </CardContent>
      </Card>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Postagens                                                        */
/* ------------------------------------------------------------------ */
function PostsBlock() {
  return (
    <Block title="Postagens" icon={MessageSquare}>
      <EmptyState
        icon={MessageSquare}
        title="Nenhuma postagem publicada"
        description="Publicações e agendamentos do Perfil Google ficarão listados aqui."
      />
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Fotos                                                            */
/* ------------------------------------------------------------------ */
function PhotosBlock() {
  return (
    <Block title="Fotos" icon={ImageIcon}>
      <Card className="border-border/60 bg-card/40">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-muted-foreground/40"
              >
                <ImageIcon className="h-6 w-6" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Galeria preparada para integração com o Perfil Google — fotos serão sincronizadas automaticamente.
          </p>
        </CardContent>
      </Card>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Serviços (sidebar)                                               */
/* ------------------------------------------------------------------ */
function ServicesBlock() {
  return (
    <Block title="Serviços" icon={Wrench}>
      <EmptyState
        compact
        icon={Wrench}
        title="Nenhum serviço cadastrado"
        description="Os serviços do Perfil Google serão listados aqui."
      />
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Histórico (sidebar)                                              */
/* ------------------------------------------------------------------ */
function HistoryBlock() {
  return (
    <Block title="Histórico" icon={History}>
      <EmptyState
        compact
        icon={History}
        title="Sem eventos ainda"
        description="Alterações no perfil, novas auditorias e publicações aparecerão em ordem cronológica."
      />
    </Block>
  );
}
