import { useEffect, useRef, useState } from "react";
import { NotebookPen, Check, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { updateQuickNotes, type Lead } from "@/lib/leads-api";
import { formatDateTime } from "@/lib/format";

/**
 * Freeform "Notas rápidas" block. Debounced autosave (900ms).
 * Displays the last-saved timestamp so the user knows changes persisted.
 */
export function LeadQuickNotes({ lead, onSaved }: { lead: Lead; onSaved?: (l: Lead) => void }) {
  const initial = (lead as Lead & { notas_rapidas?: string }).notas_rapidas ?? "";
  const savedAt = (lead as Lead & { notas_rapidas_updated_at?: string | null }).notas_rapidas_updated_at ?? null;

  const [value, setValue] = useState(initial);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(savedAt);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedRef = useRef(initial);

  const save = useMutation({
    mutationFn: (text: string) => updateQuickNotes(lead.id, text),
    onSuccess: (l) => {
      lastPersistedRef.current = value;
      const ts = (l as Lead & { notas_rapidas_updated_at?: string | null }).notas_rapidas_updated_at ?? null;
      setLastSavedAt(ts);
      onSaved?.(l);
    },
  });

  useEffect(() => {
    // Sync when we switch to a different lead
    setValue(initial);
    setLastSavedAt(savedAt);
    lastPersistedRef.current = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    if (value === lastPersistedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save.mutate(value), 900);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const status = save.isPending
    ? { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: "Salvando…" }
    : lastSavedAt
      ? { icon: <Check className="h-3 w-3 text-emerald-400" />, text: `Salvo em ${formatDateTime(lastSavedAt)}` }
      : { icon: null, text: "Digite para começar" };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">Notas rápidas</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          {status.icon} {status.text}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        placeholder="Ideias, observações rápidas, próximos passos…"
        className="resize-none border-transparent bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
