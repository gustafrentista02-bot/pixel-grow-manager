import type { Lead } from "@/lib/leads-api";

export function fillTemplate(template: string, lead: Lead): string {
  if (!template) return "";
  return template
    .replaceAll("{nome}", lead.nome ?? "")
    .replaceAll("{empresa}", lead.empresa ?? "")
    .replaceAll("{cidade}", lead.cidade ?? "")
    .replaceAll("{uf}", lead.uf ?? "")
    .replaceAll("{segmento}", lead.segmento ?? "");
}
