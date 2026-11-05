import type { Category, Expense } from "../types";
import { roundMoney } from "./money";
import { comparePeriods } from "./stats";

export const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * Resumen anual por mes calendario (en PEN). Los gastos compartidos y personales se
 * separan para que el gráfico muestre ambos; `byPayer` suma lo que pagó cada persona.
 */
export function computeAnnual(expenses: Expense[], categories: Category[], year: number) {
  const months = MONTHS_ES.map((label) => ({ label, shared: 0, personal: 0 }));
  const byCat = new Map<string, number>();
  const byPayer = new Map<string, number>();
  let total = 0;
  for (const e of expenses) {
    if (e.date.getFullYear() !== year) continue;
    const m = months[e.date.getMonth()];
    if (e.isShared) m.shared += e.amountBase;
    else m.personal += e.amountBase;
    byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amountBase);
    if (e.paidById) byPayer.set(e.paidById, (byPayer.get(e.paidById) ?? 0) + e.amountBase);
    total += e.amountBase;
  }
  const catById = new Map(categories.map((c) => [c.id, c]));
  const topCategories = [...byCat.entries()]
    .map(([id, amount]) => ({ id, name: catById.get(id) ? `${catById.get(id)!.icon} ${catById.get(id)!.name}` : "Sin categoría", amount: roundMoney(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const activeMonths = months.filter((m) => m.shared + m.personal > 0).length;
  return {
    months: months.map((m) => ({ ...m, shared: roundMoney(m.shared), personal: roundMoney(m.personal) })),
    topCategories,
    byPayer: Object.fromEntries([...byPayer.entries()].map(([k, v]) => [k, roundMoney(v)])),
    total: roundMoney(total),
    monthlyAverage: activeMonths ? roundMoney(total / activeMonths) : 0,
  };
}

/** Años con gastos (más el actual), del más reciente al más antiguo. */
export function availableYears(expenses: Expense[], now: Date = new Date()): number[] {
  const ys = new Set<number>([now.getFullYear(), ...expenses.map((e) => e.date.getFullYear())]);
  return [...ys].sort((a, b) => b - a);
}

/**
 * Comparativa interanual (PEN) reutilizando `comparePeriods`.
 * Año en curso: 1 de enero → hoy frente al mismo tramo del año anterior (comparación justa);
 * años cerrados: año completo frente al anterior.
 */
export function compareYearOverYear(expenses: Expense[], categories: Category[], year: number, today: Date = new Date()) {
  const partial = year === today.getFullYear();
  const endOf = (y: number) => (partial ? new Date(y, today.getMonth(), today.getDate() + 1) : new Date(y + 1, 0, 1));
  const current = { start: new Date(year, 0, 1), end: endOf(year), label: String(year) };
  const previous = { start: new Date(year - 1, 0, 1), end: endOf(year - 1), label: String(year - 1) };
  return { ...comparePeriods(expenses, categories, current, previous), partial, previousYear: year - 1 };
}
