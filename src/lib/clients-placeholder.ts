import type { ClientStatus } from "@/components/pixel/client-status";

export interface ClientRecord {
  id: string;
  empresa: string;
  logoUrl?: string;
  responsavelInterno: string;
  plano: "Starter" | "Pro" | "Enterprise";
  mensalidade: number;
  dataEntrada: string; // ISO
  statusImplantacao: number; // 0–100
  status: ClientStatus;
  seoScore: number; // 0–100
  ultimaAtividade: string; // human friendly
  proximaRevisao: string; // human friendly
  cidade?: string;
  uf?: string;
}

export const PLACEHOLDER_CLIENTS: ClientRecord[] = [
  {
    id: "cli-001",
    empresa: "Óptica Visão Clara",
    responsavelInterno: "Ana Torres",
    plano: "Pro",
    mensalidade: 1490,
    dataEntrada: "2025-08-12",
    statusImplantacao: 100,
    status: "ativo",
    seoScore: 78,
    ultimaAtividade: "há 2 dias",
    proximaRevisao: "em 5 dias",
    cidade: "Curitiba",
    uf: "PR",
  },
  {
    id: "cli-002",
    empresa: "Clínica Odonto Sorriso",
    responsavelInterno: "Bruno Lima",
    plano: "Enterprise",
    mensalidade: 2890,
    dataEntrada: "2025-06-03",
    statusImplantacao: 100,
    status: "renovacao",
    seoScore: 84,
    ultimaAtividade: "ontem",
    proximaRevisao: "amanhã",
    cidade: "São Paulo",
    uf: "SP",
  },
  {
    id: "cli-003",
    empresa: "Restaurante Fogo & Brasa",
    responsavelInterno: "Ana Torres",
    plano: "Starter",
    mensalidade: 890,
    dataEntrada: "2026-01-20",
    statusImplantacao: 72,
    status: "implantacao",
    seoScore: 41,
    ultimaAtividade: "há 4 dias",
    proximaRevisao: "em 12 dias",
    cidade: "Belo Horizonte",
    uf: "MG",
  },
  {
    id: "cli-004",
    empresa: "Studio Bella Beauty",
    responsavelInterno: "Camila Souza",
    plano: "Pro",
    mensalidade: 1490,
    dataEntrada: "2025-10-05",
    statusImplantacao: 100,
    status: "pausado",
    seoScore: 55,
    ultimaAtividade: "há 3 semanas",
    proximaRevisao: "pendente",
    cidade: "Porto Alegre",
    uf: "RS",
  },
  {
    id: "cli-005",
    empresa: "Auto Center Turbo",
    responsavelInterno: "Bruno Lima",
    plano: "Pro",
    mensalidade: 1490,
    dataEntrada: "2024-11-18",
    statusImplantacao: 100,
    status: "ativo",
    seoScore: 69,
    ultimaAtividade: "há 6 horas",
    proximaRevisao: "em 3 dias",
    cidade: "Curitiba",
    uf: "PR",
  },
  {
    id: "cli-006",
    empresa: "Academia Fit Power",
    responsavelInterno: "Ana Torres",
    plano: "Starter",
    mensalidade: 890,
    dataEntrada: "2024-05-02",
    statusImplantacao: 100,
    status: "cancelado",
    seoScore: 32,
    ultimaAtividade: "há 2 meses",
    proximaRevisao: "—",
    cidade: "Rio de Janeiro",
    uf: "RJ",
  },
];

export function findPlaceholderClient(id: string): ClientRecord | undefined {
  return PLACEHOLDER_CLIENTS.find((c) => c.id === id);
}

export function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function timeAsClient(iso: string): string {
  const start = new Date(iso).getTime();
  const diff = Date.now() - start;
  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mês${months === 1 ? "" : "es"}`;
  const years = Math.floor(months / 12);
  const remMonths = months - years * 12;
  return remMonths > 0
    ? `${years} ano${years === 1 ? "" : "s"} e ${remMonths} m`
    : `${years} ano${years === 1 ? "" : "s"}`;
}
