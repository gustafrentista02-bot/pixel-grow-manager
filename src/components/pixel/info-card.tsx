import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InfoCardProps {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

/**
 * Pixel DS — Info Card compacto, ideal para grades de detalhes
 * (workspace do lead, sidebar comercial, ficha da empresa).
 */
export function InfoCard({ icon: Icon, label, value, hint, className }: InfoCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/40 p-3 transition-colors hover:bg-card/60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 truncate text-sm font-medium text-foreground">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
