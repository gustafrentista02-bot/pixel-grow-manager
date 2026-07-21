import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  /** "page" (títulos de rota) ou "block" (subseções). */
  variant?: "page" | "block";
}

/**
 * Pixel DS — Section Header unificado.
 * Use `variant="page"` para topos de tela e `variant="block"` para subseções.
 */
export function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
  variant = "block",
}: SectionHeaderProps) {
  const isPage = variant === "page";
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon && (
          <Icon
            className={cn(
              "shrink-0 text-muted-foreground",
              isPage ? "h-5 w-5" : "h-4 w-4",
            )}
          />
        )}
        <div className="min-w-0">
          {isPage ? (
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
          ) : (
            <h2 className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {title}
            </h2>
          )}
          {description && (
            <p
              className={cn(
                "text-muted-foreground",
                isPage ? "mt-1 text-sm" : "mt-0.5 text-xs normal-case tracking-normal",
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
