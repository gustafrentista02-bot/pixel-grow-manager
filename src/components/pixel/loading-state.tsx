import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  label?: string;
  className?: string;
  compact?: boolean;
}

/** Pixel DS — Loading state padrão (inline em blocos ou telas). */
export function LoadingState({ label = "Carregando…", className, compact = false }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/30 text-muted-foreground",
        compact ? "p-4 text-xs" : "p-8 text-sm",
        className,
      )}
    >
      <Loader2 className={cn("animate-spin", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <span>{label}</span>
    </div>
  );
}

/** Skeleton row genérico — bloco animado para placeholders de lista/tabela. */
export function SkeletonRow({ className }: { className?: string }) {
  return <div className={cn("h-4 w-full animate-pulse rounded bg-muted/40", className)} />;
}
