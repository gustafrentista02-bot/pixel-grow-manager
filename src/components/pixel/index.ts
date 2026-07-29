/**
 * Pixel Design System — barrel único.
 */

export {
  StatusBadge,
  TemperatureBadge,
  OriginBadge,
  PulseIndicator,
  computeLeadPulse,
  type PulseLevel,
} from "@/components/pixel-badges";

export {
  ExternalLinkCard,
  ExternalLinkGrid,
  type ExternalLinkKind,
  type ExternalLinkCardProps,
} from "@/components/external-link-card";

export {
  KpiCard,
  KpiCardSkeleton,
  StatTile,
  Block,
  TONES,
} from "@/components/dashboard/shared";

export { EmptyState, type EmptyStateProps } from "./empty-state";
export { LoadingState, SkeletonRow, type LoadingStateProps } from "./loading-state";
export { ErrorState, type ErrorStateProps } from "./error-state";
export { SectionHeader, type SectionHeaderProps } from "./section-header";
export { InfoCard, type InfoCardProps } from "./info-card";
