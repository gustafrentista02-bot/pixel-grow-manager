/**
 * Time-zone helpers for the CRM.
 *
 * Todo o produto usa America/Sao_Paulo como fuso "oficial" da organização até que
 * exista uma configuração por org. Centralizamos aqui para não repetir a lógica em
 * cada dashboard/relatório e evitar bugs baseados no fuso do navegador.
 */

export const ORG_TZ = "America/Sao_Paulo";

type ParsedDate = { y: number; m: number; d: number };

function partsInTz(date: Date, timeZone: string): ParsedDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, d };
}

/** UTC timestamp correspondente à meia-noite local no fuso informado. */
function utcMidnightInTz(y: number, m: number, d: number, timeZone: string): Date {
  // Aproximação inicial: 00:00 UTC daquele dia
  const guess = new Date(Date.UTC(y, m - 1, d));
  // Descobre em que hora local esse UTC caiu
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(guess);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const min = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  // Quantos minutos o fuso está deslocado (positivo = à frente do UTC)
  const offsetMin = hour * 60 + min;
  // Ajusta: se o horário local do "guess" é 21:00 (SP, UTC-3), o UTC real da 00:00 SP é 03:00 UTC do mesmo dia.
  return new Date(guess.getTime() + ((offsetMin === 0 ? 0 : 24 * 60 - offsetMin) * 60000));
}

/** Intervalo [start, end) em UTC-ISO cobrindo o dia atual no fuso da org. */
export function dayRange(now: Date = new Date(), timeZone: string = ORG_TZ): { start: string; end: string } {
  const { y, m, d } = partsInTz(now, timeZone);
  const start = utcMidnightInTz(y, m, d, timeZone);
  const end = utcMidnightInTz(y, m, d + 1, timeZone);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Intervalo [start, end) em UTC-ISO cobrindo o mês civil atual no fuso da org. */
export function monthRange(now: Date = new Date(), timeZone: string = ORG_TZ): { start: string; end: string } {
  const { y, m } = partsInTz(now, timeZone);
  const start = utcMidnightInTz(y, m, 1, timeZone);
  const end = utcMidnightInTz(y, m + 1, 1, timeZone);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** True se `iso` está dentro de [start, end). */
export function isWithin(iso: string | null | undefined, start: string, end: string): boolean {
  if (!iso) return false;
  return iso >= start && iso < end;
}

/** Data legível no fuso da org, e.g. "quarta-feira, 29 de julho de 2026". */
export function formatOrgDate(now: Date = new Date(), timeZone: string = ORG_TZ): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
}
