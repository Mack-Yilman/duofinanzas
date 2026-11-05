import { describe, it, expect } from "vitest";
import { comparePeriods, dailyCumulative, deltaPct, evolutionSeries, goalEta, periodDays, projectPeriod, savingsRate } from "./stats";
import type { Category, Expense, Goal, GoalContribution, Income } from "../types";

const nov = { start: new Date(2026, 10, 1), end: new Date(2026, 11, 1), label: "nov" };
const oct = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1), label: "oct" };
const exp = (d: Date, amountBase: number, o: Partial<Expense> = {}) =>
  ({ date: d, amountBase, categoryId: "c1", isShared: true, splitShareA: 50, splitShareB: 50, paidById: "a", ...o }) as Expense;

describe("estadísticas", () => {
  it("variación porcentual", () => {
    expect(deltaPct(110, 100)).toBe(10);
    expect(deltaPct(50, 100)).toBe(-50);
    expect(deltaPct(10, 0)).toBeNull();
  });

  it("días del periodo", () => {
    expect(periodDays(nov, new Date(2026, 10, 10, 15))).toEqual({ total: 30, elapsed: 10 });
    expect(periodDays(nov, new Date(2027, 0, 1))).toEqual({ total: 30, elapsed: 30 });
  });

  it("compara con el periodo anterior por categoría", () => {
    const cats = [{ id: "c1", name: "Comida", icon: "🍔" }, { id: "c2", name: "Ocio", icon: "🎬" }] as Category[];
    const r = comparePeriods(
      [exp(new Date(2026, 10, 2), 120), exp(new Date(2026, 10, 3), 30, { categoryId: "c2" }), exp(new Date(2026, 9, 5), 100)],
      cats, nov, oct
    );
    expect(r).toMatchObject({ total: 150, prevTotal: 100, deltaPct: 50 });
    expect(r.byCategory[0]).toMatchObject({ id: "c1", amount: 120, previous: 100, deltaPct: 20 });
    expect(r.byCategory[1]).toMatchObject({ id: "c2", deltaPct: null });
  });

  it("proyecta el cierre con el ritmo diario", () => {
    const p = projectPeriod(300, nov, new Date(2026, 10, 10), 600);
    expect(p).toMatchObject({ projected: 900, dailyAvg: 30, daysElapsed: 10, daysTotal: 30, pctOfBudget: 150 });
    expect(projectPeriod(0, nov, new Date(2026, 9, 1)).projected).toBe(0);
  });

  it("tasa de ahorro personal y de la pareja", () => {
    const incomes = [
      { userId: "a", amount: 1000, currency: "PEN", isActive: true, period: "monthly" },
      { userId: "b", amount: 100, currency: "USD", isActive: true, period: "monthly" }, // 380 PEN
    ] as Income[];
    const toPen = (x: number, c: string) => (c === "USD" ? x * 3.8 : x);
    const r = savingsRate(incomes, [
      exp(new Date(2026, 10, 2), 200, { splitShareA: 70, splitShareB: 30 }),
      exp(new Date(2026, 10, 3), 60, { isShared: false, paidById: "a" }),
    ], "a", "a", nov, toPen);
    expect(r.me).toEqual({ income: 1000, spent: 200, rate: 80 }); // 140 cuota + 60 personal
    expect(r.couple).toEqual({ income: 1380, spent: 200, rate: 86 });
  });

  it("estima la fecha de una meta", () => {
    const goal = { id: "g", targetAmount: 1000, currentAmount: 400, currency: "PEN", targetDate: new Date(2027, 0, 1) } as Goal;
    const now = new Date(2026, 10, 15);
    const contribs = [
      { goalId: "g", amount: 150, currency: "PEN", date: new Date(2026, 9, 1) },
      { goalId: "g", amount: 150, currency: "PEN", date: new Date(2026, 10, 1) },
      { goalId: "otra", amount: 999, currency: "PEN", date: new Date(2026, 10, 1) },
    ] as GoalContribution[];
    const r = goalEta(goal, contribs, now);
    expect(r.status).toBe("eta");
    if (r.status === "eta") {
      expect(r.monthly).toBe(100);
      expect(r.months).toBe(6);
      expect(r.late).toBe(true);
    }
    expect(goalEta(goal, [], now).status).toBe("no_pace");
    expect(goalEta({ ...goal, currentAmount: 1000 }, [], now).status).toBe("done");
  });

  it("acumulado diario y serie comparada", () => {
    const xs = [exp(new Date(2026, 10, 1), 10), exp(new Date(2026, 10, 3), 5), exp(new Date(2026, 9, 1), 7)];
    expect(dailyCumulative(xs, nov, new Date(2026, 10, 3))).toEqual([10, 10, 15]);
    const s = evolutionSeries(xs, nov, oct, new Date(2026, 10, 3));
    expect(s).toHaveLength(31); // octubre tiene 31 días
    expect(s[2]).toEqual({ day: 3, actual: 15, anterior: 7 });
    expect(s[3].actual).toBeNull();
  });
});
