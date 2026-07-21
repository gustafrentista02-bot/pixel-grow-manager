import type { LucideIcon } from "lucide-react";
import { Rocket, CheckCircle2, PauseCircle, RefreshCw, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type ClientStatus =
  | "implantacao"
  | "ativo"
  | "pausado"
  | "renovacao"
  | "cancelado";

const CLIENT_STATUS_META: Record<
  ClientStatus,
  { label: string; icon: LucideIcon; className: string; dot: string }
> = {
  implantacao: {
    label: "Implantação",
    icon: Rocket,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    dot: "bg-sky-400",
  },
  ativo: {
    label: "Ativo",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  pausado: {
    label: "Pausado",
    icon: PauseCircle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  renovacao: {
    label: "Renovação",
    icon: RefreshCw,
    className: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    dot: "bg-violet-400",
  },
  cancelado: {
    label: "Cancelado",
    icon: Ban,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
  },
};

export interface ClientStatusBadgeProps {
  status: ClientStatus;
  size?: "sm" | "md";
  className?: string;
}

export function ClientStatusBadge({
  status,
  size = "sm",
  className,
}: ClientStatusBadgeProps) {
  const meta = CLIENT_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        meta.className,
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {meta.label}
    </Badge>
  );
}

export function ClientStatusDot({ status }: { status: ClientStatus }) {
  const meta = CLIENT_STATUS_META[status];
  return <span className={cn("h-2 w-2 rounded-full", meta.dot)} />;
}

export const CLIENT_STATUS_LIST: ClientStatus[] = [
  "implantacao",
  "ativo",
  "pausado",
  "renovacao",
  "cancelado",
];

export function getClientStatusLabel(status: ClientStatus): string {
  return CLIENT_STATUS_META[status].label;
}
