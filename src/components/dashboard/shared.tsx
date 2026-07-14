import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** midnight of local today as ms */
export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  const start = startOfToday();
  return t >= start && t < start + 86_400_000;
}

/** whole days elapsed since the given date */
export function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export function todayISODate(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Section wrapper — generous spacing, quiet label, dark space */
export function Block({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Large, colorful metric tile — big icon, number, description */
export function StatTile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 card-premium card-premium-hover",
        t.border,
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          t.chip,
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-3xl font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export const TONES = {
  green: { chip: "bg-emerald-500/15 text-emerald-400", border: "border-emerald-500/20" },
  violet: { chip: "bg-violet-500/15 text-violet-400", border: "border-violet-500/20" },
  sky: { chip: "bg-sky-500/15 text-sky-400", border: "border-sky-500/20" },
  cyan: { chip: "bg-cyan-500/15 text-cyan-400", border: "border-cyan-500/20" },
  amber: { chip: "bg-amber-500/15 text-amber-400", border: "border-amber-500/20" },
  orange: { chip: "bg-orange-500/15 text-orange-400", border: "border-orange-500/20" },
  red: { chip: "bg-red-500/15 text-red-400", border: "border-red-500/20" },
} as const;
