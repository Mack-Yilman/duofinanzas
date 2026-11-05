import { describe, it, expect } from "vitest";
import { computeAnnual, availableYears } from "./annual";
import type { Category, Expense } from "../types";

const e = (m: number, amountBase: number, isShared = true, categoryId = "c1", paidById = "u1", y = 2026) =>
  ({ date: new Date(y, m, 5), amountBase, isShared, categoryId, paidById }) as Expense;

describe("resumen anual", () => {
  it("agrupa por mes, categoría y pagador, solo del año pedido", () => {
    const cats = [{ id: "c1", name: "Casa", icon: "🏠" }, { id: "c2", name: "Ocio", icon: "🎬" }] as Category[];
    const r = computeAnnual([e(0, 100), e(0, 50, false, "c2", "u2"), e(2, 30, true, "c2"), e(5, 999, true, "c1", "u1", 2025)], cats, 2026);
    expect(r.months[0]).toMatchObject({ shared: 100, personal: 50 });
    expect(r.months[2].shared).toBe(30);
    expect(r.total).toBe(180);
    expect(r.monthlyAverage).toBe(90);
    expect(r.topCategories[0]).toEqual({ id: "c1", name: "🏠 Casa", amount: 100 });
    expect(r.byPayer).toEqual({ u1: 130, u2: 50 });
  });

  it("lista años con datos y el actual", () => {
    expect(availableYears([e(0, 1, true, "c1", "u1", 2024)], new Date(2026, 0, 1))).toEqual([2026, 2024]);
  });
});
