/**
 * Utilidades de fecha "civil" (sin hora). Postgres `date` llega como "YYYY-MM-DD";
 * `new Date("YYYY-MM-DD")` lo interpreta en UTC y en Perú (UTC-5) mostraría el día anterior.
 * Por eso parseamos y serializamos siempre en hora LOCAL.
 */
export function parseLocalDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return new Date(value);
  return new Date(y, m - 1, d);
}

export function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
