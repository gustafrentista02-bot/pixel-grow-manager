import { jsPDF } from "jspdf";
import type { Audit, AuditMetrica } from "@/lib/audits-api";

type Mode = "full" | "client";

const NIVEL_LABEL: Record<string, string> = {
  bom: "Bom",
  razoavel: "Razoável",
  fraco: "Fraco",
  manual: "Verificar",
};

function nivelRGB(n: string): [number, number, number] {
  if (n === "bom") return [16, 185, 129];
  if (n === "razoavel") return [245, 158, 11];
  if (n === "fraco") return [239, 68, 68];
  return [148, 163, 184];
}

function scoreRGB(score: number): [number, number, number] {
  if (score >= 75) return [16, 185, 129];
  if (score >= 50) return [245, 158, 11];
  return [239, 68, 68];
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Bom";
  if (score >= 50) return "Razoável";
  return "Fraco";
}

export function generateAuditPdf(audit: Audit, mode: Mode = "full"): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const marginX = 48;
  let y = 56;

  const empresa = audit.lead?.empresa || audit.lead?.nome || "Negócio";
  const endereco = (audit.dados_brutos as any)?.endereco || "";
  const dataStr = new Date(audit.created_at).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // Faixa topo
  const [sr, sg, sb] = scoreRGB(audit.score_geral);
  doc.setFillColor(sr, sg, sb);
  doc.rect(0, 0, w, 6, "F");

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text("Auditoria de Perfil Google", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  y += 16;
  doc.text(mode === "client" ? "Versão para o cliente" : "Versão completa", marginX, y);
  doc.text(`Emitida em ${dataStr}`, w - marginX, y, { align: "right" });

  y += 22;
  doc.setDrawColor(230);
  doc.line(marginX, y, w - marginX, y);
  y += 22;

  // Lead info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(empresa, marginX, y);
  y += 14;
  if (endereco) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    const lines = doc.splitTextToSize(endereco, w - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 12;
  }

  y += 12;

  // Score box
  const boxH = 76;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, y, w - marginX * 2, boxH, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text("SCORE GERAL", marginX + 16, y + 22);
  doc.setFontSize(36);
  doc.setTextColor(sr, sg, sb);
  doc.text(`${Math.round(audit.score_geral)}%`, marginX + 16, y + 58);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(scoreLabel(audit.score_geral), marginX + 130, y + 58);
  y += boxH + 24;

  // Métricas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("Métricas avaliadas", marginX, y);
  y += 16;

  const metricas: AuditMetrica[] = audit.metricas ?? [];
  const rowH = 58;

  for (const m of metricas) {
    if (y + rowH > h - 48) {
      doc.addPage();
      y = 56;
    }

    const oculta = mode === "client" && m.visivel_cliente === false;

    doc.setDrawColor(230);
    doc.setFillColor(oculta ? 241 : 255, oculta ? 245 : 255, oculta ? 249 : 255);
    doc.roundedRect(marginX, y, w - marginX * 2, rowH - 8, 4, 4, "FD");

    if (oculta) {
      // Bloco bloqueado
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text("🔒  Item avaliado", marginX + 14, y + 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "Detalhes disponíveis na consultoria completa.",
        marginX + 14,
        y + 38,
      );
    } else {
      const [nr, ng, nb] = nivelRGB(m.nivel);
      // barra lateral colorida
      doc.setFillColor(nr, ng, nb);
      doc.rect(marginX, y, 4, rowH - 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(m.label, marginX + 14, y + 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      if (m.detalhe) doc.text(m.detalhe, marginX + 14, y + 34);

      // Badge nivel
      const badgeLabel = NIVEL_LABEL[m.nivel] ?? m.nivel;
      const bw = doc.getTextWidth(badgeLabel) + 16;
      const bx = w - marginX - bw - 8;
      const by = y + 12;
      doc.setFillColor(nr, ng, nb);
      doc.roundedRect(bx, by, bw, 18, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(badgeLabel, bx + bw / 2, by + 12, { align: "center" });

      // Percentual bar
      const barX = marginX + 14;
      const barY = y + rowH - 20;
      const barW = w - marginX * 2 - 28;
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(barX, barY, barW, 6, 3, 3, "F");
      doc.setFillColor(nr, ng, nb);
      doc.roundedRect(barX, barY, (barW * Math.max(0, Math.min(100, m.percentual))) / 100, 6, 3, 3, "F");
    }

    y += rowH;
  }

  // Rodapé
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Pixel CRM · página ${i} de ${total}`, w - marginX, h - 24, { align: "right" });
  }

  return doc.output("blob");
}

export function downloadAuditPdf(audit: Audit, mode: Mode = "full") {
  const blob = generateAuditPdf(audit, mode);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const empresa = (audit.lead?.empresa || audit.lead?.nome || "auditoria").replace(/[^\w\-]+/g, "_");
  a.download = `auditoria-${empresa}-${mode === "client" ? "cliente" : "completa"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
