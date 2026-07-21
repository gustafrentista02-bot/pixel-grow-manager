/**
 * Pixel Design System — barrel único.
 *
 * SEMPRE importe componentes reutilizáveis a partir daqui:
 *   import { StatusBadge, KpiCard, EmptyState } from "@/components/pixel";
 *
 * Não duplicar estilos ad-hoc. Se um componente novo for genérico o suficiente
 * para reuso, adicione aqui e documente em `src/components/pixel/README.md`.
 */

// Badges e indicadores (status, temperatura, origem, pulse do lead)
export {
  StatusBadge,
  TemperatureBadge,
  OriginBadge,
  PulseIndicator,
  computeLeadPulse,
  type PulseLevel,
} from "@/components/pixel-badges";

// Cards de link externo (perfil Google, WhatsApp, site, drive, contratos…)
export {
  ExternalLinkCard,
  ExternalLinkGrid,
  type ExternalLinkKind,
  type ExternalLinkCardProps,
} from "@/components/external-link-card";

// KPIs, tiles e blocos do dashboard/operação
export {
  KpiCard,
  KpiCardSkeleton,
  StatTile,
  Block,
  TONES,
} from "@/components/dashboard/shared";

// Novos primitivos Sprint 6
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { LoadingState, SkeletonRow, type LoadingStateProps } from "./loading-state";
export { ErrorState, type ErrorStateProps } from "./error-state";
export { SectionHeader, type SectionHeaderProps } from "./section-header";
export { InfoCard, type InfoCardProps } from "./info-card";
