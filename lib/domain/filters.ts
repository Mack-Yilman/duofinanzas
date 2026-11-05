import type { Expense } from "../types";

export type ExpenseStatus = "all" | "pending" | "settled" | "personal";

export interface ExpenseFilters {
  q: string;
  category: string; // id o "" (todas) o "none" (sin categoría)
  payer: string; // id o ""
  status: ExpenseStatus;
}

export const EMPTY_FILTERS: ExpenseFilters = { q: "", category: "", payer: "", status: "all" };

/** Minúsculas y sin tildes: "Café" coincide con "cafe". */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Lee los filtros de la URL (?q=&cat=&who=&status=). */
export function parseFilters(sp: { get(key: string): string | null }): ExpenseFilters {
  const status = sp.get("status");
  return {
    q: (sp.get("q") ?? "").slice(0, 80),
    category: sp.get("cat") ?? "",
    payer: sp.get("who") ?? "",
    status: status === "pending" || status === "settled" || status === "personal" ? status : "all",
  };
}

export function hasFilters(f: ExpenseFilters): boolean {
  return !!(f.q || f.category || f.payer || f.status !== "all");
}

/** Aplica búsqueda (descripción, notas o nombre de categoría) y filtros. */
export function filterExpenses(expenses: Expense[], f: ExpenseFilters, categoryName: (id: string) => string = () => ""): Expense[] {
  const q = normalize(f.q);
  return expenses.filter((e) => {
    if (f.category === "none" ? !!e.categoryId : f.category && e.categoryId !== f.category) return false;
    if (f.payer && e.paidById !== f.payer) return false;
    if (f.status === "pending" && (!e.isShared || e.isSettled)) return false;
    if (f.status === "settled" && (!e.isShared || !e.isSettled)) return false;
    if (f.status === "personal" && e.isShared) return false;
    if (q && !normalize(`${e.name} ${e.notes ?? ""} ${categoryName(e.categoryId)}`).includes(q)) return false;
    return true;
  });
}
