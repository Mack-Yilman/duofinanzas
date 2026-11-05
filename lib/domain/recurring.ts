/** Fechas de gastos recurrentes mensuales (día 1-28, así existe en todos los meses). */

/** Máximo de gastos que se generan de una vez por plantilla (evita ráfagas tras meses sin abrir la app). */
export const MAX_CATCH_UP = 12;

/** Primera fecha con ese día a partir de `from` (incluido). */
export function firstOccurrence(dayOfMonth: number, from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), dayOfMonth);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return d.getTime() >= start.getTime() ? d : new Date(from.getFullYear(), from.getMonth() + 1, dayOfMonth);
}

/** Misma fecha el mes siguiente. */
export function nextMonthly(date: Date, dayOfMonth: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, dayOfMonth);
}

/**
 * Fechas vencidas (≤ hoy) desde `nextDate`, y la siguiente fecha pendiente.
 * Con más de MAX_CATCH_UP vencidas se generan solo las últimas MAX_CATCH_UP.
 */
export function dueOccurrences(nextDate: Date, dayOfMonth: number, today: Date = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const due: Date[] = [];
  let d = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
  while (d.getTime() <= end) {
    due.push(d);
    d = nextMonthly(d, dayOfMonth);
  }
  return { due: due.slice(-MAX_CATCH_UP), next: d };
}
