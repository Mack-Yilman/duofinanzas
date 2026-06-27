export interface PeriodRange {
  start: Date; // inclusivo
  end: Date; // exclusivo (siguiente corte)
  label: string;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Construye la fecha de corte para un (año, mes, día) dado, ajustando el día al
 * último día del mes si el mes es más corto (p. ej. corte 31 en febrero → 28/29).
 * `monthIndex` puede estar fuera de [0,11]; JS normaliza el año automáticamente.
 */
function makeBoundary(year: number, monthIndex: number, day: number): Date {
  const base = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = Math.min(day, daysInMonth(y, m));
  return new Date(y, m, d, 0, 0, 0, 0);
}

function formatLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  // end es exclusivo; mostramos el último día incluido (end - 1 día) para legibilidad.
  const lastIncluded = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return `${fmt(start)} – ${fmt(lastIncluded)}`;
}

/**
 * Rango del periodo según el día de corte configurable.
 * offset 0 = periodo actual, -1 = anterior, etc.
 */
export function getPeriodRange(cutoffDay: number, ref: Date = new Date(), offset = 0): PeriodRange {
  const day = Math.min(Math.max(Math.floor(cutoffDay) || 1, 1), 31);
  const year = ref.getFullYear();
  let monthIndex = ref.getMonth();

  // Si aún no llegamos al corte de este mes, el periodo actual empezó el mes anterior.
  const anchorThisMonth = makeBoundary(year, monthIndex, day);
  if (ref.getTime() < anchorThisMonth.getTime()) {
    monthIndex -= 1;
  }

  const start = makeBoundary(year, monthIndex + offset, day);
  const end = makeBoundary(year, monthIndex + offset + 1, day);
  return { start, end, label: formatLabel(start, end) };
}

export function isInPeriod(date: Date, range: PeriodRange): boolean {
  const t = date.getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}
