import { describe, it, expect } from "vitest";
import { filterExpenses, parseFilters, hasFilters, EMPTY_FILTERS } from "./filters";
import type { Expense } from "../types";

const e = (id: string, o: Partial<Expense>) => ({ id, name: "", notes: "", categoryId: "", paidById: "a", isShared: true, isSettled: false, ...o }) as Expense;
const list = [
  e("1", { name: "Café Tostado", categoryId: "c1" }),
  e("2", { name: "Luz", categoryId: "c2", paidById: "b", isSettled: true }),
  e("3", { name: "Zapatos", isShared: false }),
];
const ids = (xs: Expense[]) => xs.map((x) => x.id);

describe("filtros de gastos", () => {
  it("busca sin tildes ni mayúsculas, también por categoría", () => {
    expect(ids(filterExpenses(list, { ...EMPTY_FILTERS, q: "cafe" }))).toEqual(["1"]);
    expect(ids(filterExpenses(list, { ...EMPTY_FILTERS, q: "servicios" }, (id) => (id === "c2" ? "Servicios" : "")))).toEqual(["2"]);
  });

  it("filtra por categoría, pagador y estado", () => {
    expect(ids(filterExpenses(list, { ...EMPTY_FILTERS, category: "none" }))).toEqual(["3"]);
    expect(ids(filterExpenses(list, { ...EMPTY_FILTERS, payer: "b" }))).toEqual(["2"]);
    expect(ids(filterExpenses(list, { ...EMPTY_FILTERS, status: "pending" }))).toEqual(["1"]);
    expect(ids(filterExpenses(list, { ...EMPTY_FILTERS, status: "settled" }))).toEqual(["2"]);
    expect(ids(filterExpenses(list, { ...EMPTY_FILTERS, status: "personal" }))).toEqual(["3"]);
  });

  it("lee la URL y detecta filtros activos", () => {
    const f = parseFilters(new URLSearchParams("q=luz&status=raro&who=b"));
    expect(f).toEqual({ q: "luz", category: "", payer: "b", status: "all" });
    expect(hasFilters(f)).toBe(true);
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
  });
});
