import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Compact: usado dentro de cards/blocos pequenos. */
  compact?: boolean;
}

/**
 * Pixel DS — Empty State padrão.
 * Usar sempre que uma lista, tabela ou seção não tiver dados a exibir.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 text-center",
        compact ? "gap-2 p-6" : "gap-3 p-10",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted/40 text-muted-foreground",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
      <div className="space-y-1">
        <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
        {description && (
          <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
