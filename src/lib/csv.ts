import Papa from "papaparse";
import { z } from "zod";
import type { Lead, LeadInput } from "@/lib/leads-api";
import { EMPTY_LEAD_INPUT } from "@/lib/leads-api";
import { ORIGINS, STAGE_META, ORIGIN_LABELS } from "@/lib/crm";
import type { LeadOrigin } from "@/lib/crm";
import { formatDateTime } from "@/lib/format";

const originValues = ORIGINS.map((o) => o.value) as [LeadOrigin, ...LeadOrigin[]];

const rowSchema = z.object({
  nome: z.string().min(1).max(200),
  telefone: z.string().max(40).optional().default(""),
  whatsapp: z.string().max(40).optional().default(""),
  cidade: z.string().max(120).optional().default(""),
  uf: z.string().max(2).optional().default(""),
  empresa: z.string().max(200).optional().default(""),
  instagram: z.string().max(200).optional().default(""),
  site: z.string().max(200).optional().default(""),
  segmento: z.string().max(200).optional().default(""),
  faturamento_mensal: z.coerce.number().min(0).optional().default(0),
  valor_contrato: z.coerce.number().min(0).optional().default(0),
  plano: z.string().max(120).optional().default(""),
  origem: z.string().optional().default("outro"),
  observacoes: z.string().max(2000).optional().default(""),
});

export type ParsedImport = {
  valid: LeadInput[];
  errors: { row: number; message: string }[];
};

export function parseLeadsCsv(file: File): Promise<ParsedImport> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        const valid: LeadInput[] = [];
        const errors: { row: number; message: string }[] = [];
        result.data.forEach((raw, i) => {
          const parsed = rowSchema.safeParse(raw);
          if (!parsed.success) {
            errors.push({ row: i + 2, message: parsed.error.issues[0]?.message ?? "Inválido" });
            return;
          }
          const origemRaw = parsed.data.origem.toLowerCase().trim();
          const origem = (originValues as string[]).includes(origemRaw)
            ? (origemRaw as LeadOrigin)
            : "outro";
          valid.push({
            ...EMPTY_LEAD_INPUT,
            nome: parsed.data.nome,
            telefone: parsed.data.telefone,
            whatsapp: parsed.data.whatsapp,
            cidade: parsed.data.cidade,
            uf: parsed.data.uf.toUpperCase(),
            empresa: parsed.data.empresa,
            instagram: parsed.data.instagram,
            site: parsed.data.site,
            segmento: parsed.data.segmento,
            faturamento_mensal: parsed.data.faturamento_mensal,
            valor_contrato: parsed.data.valor_contrato,
            plano: parsed.data.plano,
            origem,
            observacoes: parsed.data.observacoes,
          });
        });
        resolve({ valid, errors });
      },
    });
  });
}

export function exportLeadsCsv(leads: Lead[]) {
  const rows = leads.map((l) => ({
    nome: l.nome,
    telefone: l.telefone,
    empresa: l.empresa,
    cidade: l.cidade,
    uf: l.uf,
    segmento: l.segmento,
    faturamento_mensal: l.faturamento_mensal,
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
