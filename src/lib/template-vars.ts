import type { Lead } from "@/lib/leads-api";
import { formatCurrency } from "@/lib/format";

/** Replaces {nome} {empresa} {cidade} {valor} {responsavel} etc. in a template string. */
export function fillTemplate(text: string, lead: Lead | null | undefined, extras: Record<string, string> = {}): string {
  if (!text) return "";
  const primeiro = (lead?.nome ?? "").trim().split(/\s+/)[0] ?? "";
  const vars: Record<string, string> = {
    nome: lead?.nome ?? "",
    primeiro_nome: primeiro,
    empresa: lead?.empresa ?? "",
    cidade: lead?.cidade ?? "",
    uf: lead?.uf ?? "",
    segmento: lead?.segmento ?? "",
    telefone: lead?.telefone ?? "",
    plano: lead?.plano ?? "",
    valor: lead?.valor_contrato ? formatCurrency(lead.valor_contrato) : "",
    faturamento: lead?.faturamento_mensal ? formatCurrency(lead.faturamento_mensal) : "",
    ...extras,
  };
  return text.replace(/\{([a-z_]+)\}/gi, (_, key) => vars[key.toLowerCase()] ?? `{${key}}`);
}

export const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: "nome", label: "Nome" },
  { key: "primeiro_nome", label: "Primeiro nome" },
  { key: "empresa", label: "Empresa" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "segmento", label: "Segmento" },
  { key: "plano", label: "Plano" },
  { key: "valor", label: "Valor do contrato" },
];
