import Papa from "papaparse";
import type { Lead, LeadInput } from "@/lib/leads-api";
import { EMPTY_LEAD_INPUT } from "@/lib/leads-api";
import { ORIGINS, STAGE_META, STAGES, ORIGIN_LABELS } from "@/lib/crm";
import type { LeadOrigin, LeadStage } from "@/lib/crm";
import { formatDateTime } from "@/lib/format";

/** normalize a header/value: lowercase, trim, strip accents */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// origem label/value -> LeadOrigin
const ORIGIN_LOOKUP = new Map<string, LeadOrigin>();
for (const o of ORIGINS) {
  ORIGIN_LOOKUP.set(normalize(o.value), o.value);
  ORIGIN_LOOKUP.set(normalize(o.label), o.value);
}

// estágio label/value -> LeadStage
const STAGE_LOOKUP = new Map<string, LeadStage>();
for (const s of STAGES) {
  STAGE_LOOKUP.set(normalize(s.value), s.value);
  STAGE_LOOKUP.set(normalize(s.label), s.value);
}

/** read a value from a row trying several possible header names (already normalized) */
function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export type ParsedImport = {
  valid: LeadInput[];
  errors: { row: number; message: string }[];
};

export function parseLeadsCsv(file: File): Promise<ParsedImport> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => normalize(h),
      complete: (result) => {
        const valid: LeadInput[] = [];
        const errors: { row: number; message: string }[] = [];

        result.data.forEach((raw, i) => {
          const linha = i + 2; // +1 header, +1 for 1-based
          try {
            const nome = pick(raw, "nome", "name");
            if (!nome) {
              errors.push({ row: linha, message: "Campo 'Nome' vazio ou ausente." });
              return;
            }

            const origemRaw = pick(raw, "origem", "origin");
            const origem: LeadOrigin = origemRaw
              ? (ORIGIN_LOOKUP.get(normalize(origemRaw)) ?? "outro")
              : "outro";

            const estagioRaw = pick(raw, "estagio", "estágio", "stage", "etapa");
            const stage: LeadStage = estagioRaw
              ? (STAGE_LOOKUP.get(normalize(estagioRaw)) ?? "lead_novo")
              : "lead_novo";

            valid.push({
              ...EMPTY_LEAD_INPUT,
              nome,
              empresa: pick(raw, "empresa", "company"),
              telefone: pick(raw, "telefone", "phone", "celular"),
              whatsapp: pick(raw, "whatsapp"),
              cidade: pick(raw, "cidade", "city"),
              uf: pick(raw, "uf", "estado").toUpperCase().slice(0, 2),
              segmento: pick(raw, "segmento", "segment", "nicho"),
              origem,
              observacoes: pick(raw, "observacoes", "observações", "obs", "notes"),
              stage,
            });
          } catch (err) {
            errors.push({
              row: linha,
              message: err instanceof Error ? err.message : "Linha inválida.",
            });
          }
        });

        resolve({ valid, errors });
      },
      error: () => resolve({ valid: [], errors: [{ row: 0, message: "Não foi possível ler o arquivo." }] }),
    });
  });
}

export function exportLeadsCsv(leads: Lead[]) {
  const rows = leads.map((l) => ({
    nome: l.nome,
    empresa: l.empresa,
    telefone: l.telefone,
    cidade: l.cidade,
    uf: l.uf,
    segmento: l.segmento,
    origem: ORIGIN_LABELS[l.origem],
    estagio: STAGE_META[l.stage]?.label ?? l.stage,
    observacoes: l.observacoes,
    atualizado_em: formatDateTime(l.updated_at),
  }));
  const csv = Papa.unparse(rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-pixel-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _kanbanStages = KANBAN_STAGES;
