import { describe, it, expect } from "vitest";
import { buildImport, parseAmount, parseCsv, parseDate } from "./import";
import { expensesToCsv } from "./export";
import { toDateString } from "./dates";
import type { Category, Expense } from "../types";

const cats = [{ id: "c1", name: "Comida", icon: "🍔" }] as Category[];
const users = [{ id: "u1", name: "Ana" }, { id: "u2", name: "Luis" }];

describe("importar CSV", () => {
  it("parsea comillas, separador y líneas vacías", () => {
    expect(parseCsv('﻿a;b\r\n"x;1";"di ""hola"""\n\n')).toEqual([["a", "b"], ["x;1", 'di "hola"']]);
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("montos y fechas en formatos comunes", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("S/ 20")).toBe(20);
    expect(parseAmount("abc")).toBeNaN();
    expect(toDateString(parseDate("05/11/2026")!)).toBe("2026-11-05");
    expect(toDateString(parseDate("2026-11-05")!)).toBe("2026-11-05");
    expect(parseDate("31/02/2026")).toBeNull();
  });

  it("lee su propia exportación (ida y vuelta) y detecta duplicados", () => {
    const existing = [
      { name: "Cena", amount: 10.5, currency: "PEN", amountBase: 10.5, date: new Date(2026, 10, 3), categoryId: "c1", paidById: "u1", isShared: true, splitMode: "equal", isSettled: false },
    ] as Expense[];
    const csv = expensesToCsv(
      [...existing, { ...existing[0], name: "=Taxi", amount: 8, amountBase: 8, paidById: "u2", isShared: false, splitMode: "owner_100" }],
      cats,
      { u1: "Ana", u2: "Luis" }
    );
    const r = buildImport(csv, { categories: cats, users, existing });
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ name: "Cena", duplicate: true, categoryId: "c1", payerId: "u1", isShared: true });
    expect(r.rows[1]).toMatchObject({ name: "=Taxi", amount: 8, duplicate: false, payerId: "u2", isShared: false });
  });

  it("informa errores por fila y columnas faltantes", () => {
    const r = buildImport("Fecha;Descripción;Monto;Moneda\n2026-11-01;Pan;2,50;PEN\nmal;X;1;PEN\n2026-11-02;;1;PEN\n2026-11-02;Y;0;PEN\n2026-11-02;Z;1;GBP", { categories: cats, users, existing: [] });
    expect(r.rows.map((x) => x.name)).toEqual(["Pan"]);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4, 5, 6]);
    expect(buildImport("Nombre;Valor\nA;1", { categories: cats, users, existing: [] }).errors[0].message).toMatch(/Faltan columnas/);
  });
});
