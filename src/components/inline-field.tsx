import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number | null | undefined;
  onSave: (v: string) => Promise<unknown> | unknown;
  placeholder?: string;
  type?: "text" | "number" | "url" | "tel" | "email";
  className?: string;
  displayFormat?: (v: string | number) => React.ReactNode;
};

export function InlineField({
  label,
  value,
  onSave,
  placeholder = "—",
  type = "text",
  className,
  displayFormat,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value ?? ""));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const empty = value === null || value === undefined || value === "";
  const changed = String(value ?? "") !== draft;

  async function commit() {
    if (!changed) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(String(value ?? "")); setEditing(false); }
            }}
            className="h-8 text-sm"
            disabled={saving}
          />
          <button onClick={commit} disabled={saving} className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => { setDraft(String(value ?? "")); setEditing(false); }} className="rounded p-1 text-muted-foreground hover:bg-muted/50">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="group flex w-full items-center gap-1.5 rounded border border-transparent px-1 py-0.5 -mx-1 text-left text-sm transition hover:border-border/60 hover:bg-muted/20"
        >
          <span className={cn("truncate", empty && "text-muted-foreground/50")}>
            {empty ? placeholder : displayFormat ? displayFormat(value!) : value}
          </span>
          <Pencil className="ml-auto h-3 w-3 opacity-0 transition group-hover:opacity-60" />
        </button>
      )}
    </div>
  );
}
