import { describe, it, expect } from "vitest";
import { computeBudgets, budgetLevel } from "./budgets";
import type { Budget, Category, Expense } from "../types";

const period = { start: new Date(2026, 10, 1), end: new Date(2026, 11, 1), label: "" };
const cats = [
  { id: "c1", name: "Comida", icon: "🍔" },
  { id: "c2", name: "Ocio", icon: "🎬" },
] as Category[];
const exp = (categoryId: string, amountBase: number, date: Date, isShared = true, paidById = "u1") =>
  ({ categoryId, amountBase, date, isShared, paidById }) as Expense;

describe("presupuestos", () => {
  it("clasifica por umbral", () => {
    expect(budgetLevel(79)).toBe("ok");
    expect(budgetLevel(80)).toBe("warn");
    expect(budgetLevel(100)).toBe("over");
  });

  it("suma solo el periodo y ordena por % usado", () => {
    const budgets: Budget[] = [
      { id: "b1", categoryId: "c1", amount: 100 },
      { id: "b2", categoryId: "c2", amount: 200 },
      { id: "b3", categoryId: "archivada", amount: 50 },
    ];
    const r = computeBudgets(budgets, cats, [
      exp("c1", 50, new Date(2026, 10, 3)),
      exp("c1", 35, new Date(2026, 10, 20)),
      exp("c1", 999, new Date(2026, 9, 30)), // periodo anterior
      exp("c2", 10, new Date(2026, 10, 5)),
    ], period);
    expect(r.map((x) => x.categoryId)).toEqual(["c1", "c2"]);
    expect(r[0]).toMatchObject({ spent: 85, pct: 85, level: "warn" });
    expect(r[1]).toMatchObject({ spent: 10, pct: 5, level: "ok" });
  });

  it("separa presupuesto compartido y personal", () => {
    const budgets: Budget[] = [
      { id: "b1", categoryId: "c1", amount: 100 },
      { id: "b2", categoryId: "c1", amount: 40, userId: "u1" },
    ];
    const d = new Date(2026, 10, 10);
    const r = computeBudgets(budgets, cats, [
      exp("c1", 30, d), // compartido
      exp("c1", 20, d, false, "u1"), // personal mío
      exp("c1", 99, d, false, "u2"), // personal de otra persona (no cuenta)
    ], period);
    const shared = r.find((x) => !x.personal)!;
    const mine = r.find((x) => x.personal)!;
    expect(shared).toMatchObject({ spent: 30, pct: 30, level: "ok" });
    expect(mine).toMatchObject({ spent: 20, pct: 50, level: "ok" });
  });
});
