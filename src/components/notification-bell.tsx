import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";

export function NotificationBell() {
  const { notifications } = useNotifications();
  const count = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold">Notificações</p>
          <span className="text-xs text-muted-foreground">{count} pendente(s)</span>
        </div>
        <ScrollArea className="max-h-80">
          {count === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Tudo em dia! Nenhuma notificação. 🎉
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = n.severity === "warning" ? AlertTriangle : Info;
                const color = n.severity === "warning" ? "text-amber-400" : "text-sky-400";
                return (
                  <li key={n.id} className="px-4 py-3">
                    <div className="flex gap-2.5">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.description}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center">
            <Link to="/tarefas">Ver tarefas</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
