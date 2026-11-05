import type { Budget, Category, Expense } from "../types";
import { isInPeriod, type PeriodRange } from "./period";
import { roundMoney } from "./money";

export type BudgetLevel = "ok" | "warn" | "over";

export interface BudgetStatus {
  categoryId: string;
  name: string;
  icon: string;
  limit: number;
  spent: number;
  /** Porcentaje usado (0-∞), redondeado a entero. */
  pct: number;
  level: BudgetLevel;
  /** Presupuesto personal: solo cuenta los gastos personales de su dueño. */
  personal: boolean;
}

/** Umbral de alerta temprana. */
export const BUDGET_WARN_PCT = 80;

export function budgetLevel(pct: number): BudgetLevel {
  if (pct >= 100) return "over";
  if (pct >= BUDGET_WARN_PCT) return "warn";
  return "ok";
}

/**
 * Gasto del periodo por categoría frente a su presupuesto (en PEN, `amountBase`).
 *  - Presupuesto compartido (`userId` vacío): cuenta los gastos **compartidos**.
 *  - Presupuesto personal (`userId`): cuenta solo los gastos **personales** de esa persona.
 * Ordena primero lo más comprometido.
 */
export function computeBudgets(
  budgets: Budget[],
  categories: Category[],
  expenses: Expense[],
  period: PeriodRange
): BudgetStatus[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const sharedBy = new Map<string, number>();
  const personalBy = new Map<string, number>(); // clave: `${userId}:${categoryId}`
  for (const e of expenses) {
    if (!e.categoryId || !isInPeriod(e.date, period)) continue;
    if (e.isShared) sharedBy.set(e.categoryId, (sharedBy.get(e.categoryId) ?? 0) + e.amountBase);
    else {
      const k = `${e.paidById}:${e.categoryId}`;
      personalBy.set(k, (personalBy.get(k) ?? 0) + e.amountBase);
    }
  }
  return budgets
    .filter((b) => byId.has(b.categoryId) && b.amount > 0)
    .map((b) => {
      const cat = byId.get(b.categoryId)!;
      const personal = !!b.userId;
      const raw = personal ? personalBy.get(`${b.userId}:${b.categoryId}`) : sharedBy.get(b.categoryId);
      const spent = roundMoney(raw ?? 0);
      const pct = Math.round((spent / b.amount) * 100);
      return { categoryId: b.categoryId, name: cat.name, icon: cat.icon, limit: b.amount, spent, pct, level: budgetLevel(pct), personal };
    })
    .sort((a, b) => b.pct - a.pct);
}
