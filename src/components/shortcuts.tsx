import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Keyboard } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// G+letter sequences → route
const GO_MAP: Record<string, string> = {
  d: "/dashboard",
  l: "/leads",
  f: "/funil",
  t: "/tarefas",
  a: "/agenda",
  u: "/follow-up",
  p: "/modelos-proposta",
  m: "/modelos-mensagem",
  c: "/configuracoes",
};

/** Global G+X navigation shortcuts (Attio/Linear-style). */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let awaitingG = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();

      if (awaitingG) {
        if (GO_MAP[key]) {
          e.preventDefault();
          const url = GO_MAP[key];
          if (url !== pathname) navigate({ to: url });
        }
        awaitingG = false;
        if (timeout) clearTimeout(timeout);
        return;
      }

      if (key === "g") {
        awaitingG = true;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => { awaitingG = false; }, 900);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timeout) clearTimeout(timeout);
    };
  }, [navigate, pathname]);
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Abrir busca / paleta de comandos" },
  { keys: ["G", "D"], label: "Ir para Dashboard" },
  { keys: ["G", "L"], label: "Ir para Leads" },
  { keys: ["G", "F"], label: "Ir para Funil" },
  { keys: ["G", "T"], label: "Ir para Tarefas" },
  { keys: ["G", "A"], label: "Ir para Agenda" },
  { keys: ["G", "U"], label: "Ir para Follow-up" },
  { keys: ["G", "P"], label: "Ir para Modelos de Proposta" },
  { keys: ["G", "M"], label: "Ir para Modelos de Mensagem" },
  { keys: ["G", "C"], label: "Ir para Configurações" },
  { keys: ["?"], label: "Abrir esta ajuda" },
];

/** Small "?" trigger + dialog that lists all shortcuts. */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="hidden h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:text-foreground sm:inline-flex"
          title="Atalhos de teclado (?)"
          aria-label="Atalhos de teclado"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Atalhos de teclado</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd key={i} className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
