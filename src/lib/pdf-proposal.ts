import { jsPDF } from "jspdf";
import { formatCurrency } from "@/lib/format";
import type { Lead } from "@/lib/leads-api";
import type { ProposalTemplate } from "@/lib/templates-api";

type Options = {
  empresa?: string;
  valor?: number;
  contatoEmpresa?: string;
};

/** Generates a clean, minimal proposal PDF (client-side) and triggers download. */
export function generateProposalPdf(proposal: ProposalTemplate, lead: Lead, opts: Options = {}): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 64;

  // Header
  doc.setFillColor(16, 185, 129); // green accent
  doc.rect(0, 0, w, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text(opts.empresa ?? "Pixel Marketing", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  y += 16;
  doc.text("Proposta comercial", marginX, y);

  // Meta
  const today = new Date().toLocaleDateString("pt-BR");
  doc.text(`Emitida em ${today}`, w - marginX, y, { align: "right" });

  y += 28;
  doc.setDrawColor(230);
  doc.line(marginX, y, w - marginX, y);
  y += 24;

  // Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("PARA", marginX, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(lead.empresa || lead.nome, marginX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  const line = [lead.nome, lead.cidade && `${lead.cidade}${lead.uf ? "/" + lead.uf : ""}`, lead.telefone]
    .filter(Boolean)
    .join(" · ");
  if (line) doc.text(line, marginX, y);
  y += 28;

  // Título proposta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(proposal.nome || "Proposta", marginX, y);
  y += 22;

  // Conteúdo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  const body = proposal.conteudo?.trim() || "Segue nossa proposta personalizada para o seu negócio.";
  const lines = doc.splitTextToSize(body, w - marginX * 2);
  doc.text(lines, marginX, y);
  y += lines.length * 15 + 20;

  // Valor
  if (opts.valor && opts.valor > 0) {
    doc.setDrawColor(230);
    doc.line(marginX, y, w - marginX, y);
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text("VALOR DO INVESTIMENTO", marginX, y);
    y += 22;
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129);
    doc.text(formatCurrency(opts.valor), marginX, y);
    y += 24;
  }

  // Link
  if (proposal.url?.trim()) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Material complementar:", marginX, y);
    y += 14;
    doc.setTextColor(16, 185, 129);
    doc.textWithLink(proposal.url, marginX, y, { url: proposal.url });
    y += 20;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(230);
  doc.line(marginX, footerY, w - marginX, footerY);
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(opts.empresa ?? "Pixel Marketing", marginX, footerY + 16);
  doc.text("Proposta válida por 7 dias", w - marginX, footerY + 16, { align: "right" });

  return doc.output("blob");
}

export function downloadProposalPdf(proposal: ProposalTemplate, lead: Lead, opts: Options = {}): void {
  const blob = generateProposalPdf(proposal, lead, opts);
  const safeName = `${proposal.nome || "proposta"}-${lead.empresa || lead.nome}`.replace(/[^\w\-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
