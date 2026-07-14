import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Globe, MapPin, Megaphone, Instagram, TrendingUp, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Lead } from "@/lib/leads-api";
import { cn } from "@/lib/utils";

type Bucket = {
  key: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  tone: "amber" | "red" | "emerald" | "sky" | "violet";
  match: (l: Lead) => boolean;
};

const BUCKETS: Bucket[] = [
  {
    key: "sem-google",
    icon: MapPin,
    label: "Sem Perfil no Google",
    hint: "Oportunidade clara de SEO Local",
    tone: "red",
    match: (l) => !l.tem_perfil_google && l.stage !== "ganho" && l.stage !== "perdido",
  },
  {
    key: "sem-site",
    icon: Globe,
    label: "Sem site",
    hint: "Precisa de presença web para converter",
    tone: "amber",
    match: (l) => !l.tem_site && l.stage !== "ganho" && l.stage !== "perdido",
  },
  {
    key: "ads-sem-seo",
    icon: Megaphone,
    label: "Faz Ads mas sem SEO",
    hint: "Cliente pagando tráfego — upsell forte",
    tone: "violet",
    match: (l) =>
      (l.faz_google_ads || l.faz_meta_ads) &&
      (!l.tem_perfil_google || !l.tem_site) &&
      l.stage !== "ganho" &&
      l.stage !== "perdido",
  },
  {
    key: "instagram-only",
    icon: Instagram,
    label: "Só Instagram",
    hint: "Depende de rede social alheia",
    tone: "sky",
    match: (l) =>
      !!l.instagram && !l.tem_site && !l.tem_perfil_google && l.stage !== "ganho" && l.stage !== "perdido",
  },
];

const TONE_STYLES = {
  amber: { chip: "bg-amber-500/15 text-amber-400", border: "hover:border-amber-500/30" },
  red: { chip: "bg-red-500/15 text-red-400", border: "hover:border-red-500/30" },
  emerald: { chip: "bg-emerald-500/15 text-emerald-400", border: "hover:border-emerald-500/30" },
  sky: { chip: "bg-sky-500/15 text-sky-400", border: "hover:border-sky-500/30" },
  violet: { chip: "bg-violet-500/15 text-violet-400", border: "hover:border-violet-500/30" },
} as const;

export function SeoLocalBlock({ leads }: { leads: Lead[] }) {
  const active = useMemo(
    () => leads.filter((l) => l.stage !== "ganho" && l.stage !== "perdido"),
    [leads],
  );

  const counts = useMemo(
    () => BUCKETS.map((b) => ({ ...b, count: leads.filter(b.match).length })),
    [leads],
  );

  const cobertura = useMemo(() => {
    if (active.length === 0) return { google: 0, site: 0 };
    const google = active.filter((l) => l.tem_perfil_google).length;
    const site = active.filter((l) => l.tem_site).length;
    return {
      google: Math.round((google / active.length) * 100),
      site: Math.round((site / active.length) * 100),
    };
  }, [active]);

  return (
    <div className="space-y-4">
      {/* Coverage bars */}
      <div className="grid gap-3 sm:grid-cols-2">
        <CoverageBar label="Cobertura de Perfil no Google" pct={cobertura.google} tone="text-emerald-400" />
        <CoverageBar label="Cobertura de Site" pct={cobertura.site} tone="text-sky-400" />
      </div>

      {/* Opportunity buckets */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((b) => {
          const Icon = b.icon;
          const style = TONE_STYLES[b.tone];
          return (
            <Link
              key={b.key}
              to="/leads"
              className={cn(
                "group rounded-2xl border border-border bg-card/40 p-4 transition-all",
                style.border,
              )}
            >
              <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", style.chip)}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold leading-none tracking-tight">{b.count}</p>
              <p className="mt-1.5 text-sm font-medium">{b.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{b.hint}</p>
            </Link>
          );
        })}
      </div>

      {active.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          Sem leads ativos para analisar. Cadastre leads para ver oportunidades de SEO Local.
        </p>
      )}
    </div>
  );
}

function CoverageBar({ label, pct, tone }: { label: string; pct: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-lg font-bold tracking-tight", tone)}>{pct}%</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/30">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "text-emerald-400" ? "bg-emerald-400" : "bg-sky-400",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Faturamento previsto ponderado por potencial (alta 70%, media 40%, baixa 15%) */
export function ForecastBlock({ leads }: { leads: Lead[] }) {
  const forecast = useMemo(() => {
    const weights: Record<string, number> = { alta: 0.7, media: 0.4, baixa: 0.15 };
    const active = leads.filter((l) => l.stage !== "ganho" && l.stage !== "perdido");
    const ponderado = active.reduce((s, l) => {
      const w = weights[l.potencial as string] ?? 0.3;
      return s + (l.valor_contrato || 0) * w;
    }, 0);
    const potencial = active.reduce((s, l) => s + (l.valor_contrato || 0), 0);
    return { ponderado, potencial, count: active.length };
  }, [leads]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <ForecastTile
        icon={TrendingUp}
        label="Potencial total do pipeline"
        value={forecast.potencial}
        hint={`${forecast.count} leads ativos`}
        tone="text-sky-400"
      />
      <ForecastTile
        icon={TrendingUp}
        label="Previsão ponderada"
        value={forecast.ponderado}
        hint="Peso por potencial (alta 70% · média 40% · baixa 15%)"
        tone="text-primary"
      />
      <ForecastTile
        icon={TrendingUp}
        label="Ticket médio potencial"
        value={forecast.count > 0 ? forecast.potencial / forecast.count : 0}
        hint="Sobre o pipeline ativo"
        tone="text-amber-400"
      />
    </div>
  );
}

function ForecastTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <Icon className={cn("mb-3 h-5 w-5", tone)} />
      <p className="text-xl font-bold tracking-tight">
        {new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        }).format(value)}
      </p>
      <p className="mt-1 text-xs font-medium">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
