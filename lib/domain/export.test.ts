import { describe, it, expect } from "vitest";
import { csvCell, expensesToCsv, exportFileName } from "./export";
import type { Category, Expense } from "../types";

describe("exportación CSV", () => {
  it("neutraliza fórmulas y escapa comillas y separadores", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("-5")).toBe(`"'-5"`);
    expect(csvCell("a;b")).toBe(`"a;b"`);
    expect(csvCell("Pan")).toBe("Pan");
    expect(csvCell("  =1+1")).toBe(`"'  =1+1"`); // espacios iniciales
    expect(csvCell("＝SUM(A1)")).toBe(`"'＝SUM(A1)"`); // signo igual de ancho completo
  });

  it("genera cabecera, BOM y filas ordenadas por fecha", () => {
    const cats = [{ id: "c1", name: "Comida" }] as Category[];
    const exps = [
      { name: "Cena", amount: 10.5, currency: "USD", amountBase: 39.9, date: new Date(2026, 10, 3), categoryId: "c1", paidById: "u1", isShared: true, splitMode: "equal", isSettled: false },
      { name: "Pan", amount: 2, currency: "PEN", amountBase: 2, date: new Date(2026, 10, 1), categoryId: "", paidById: "u2", isShared: false, splitMode: "owner_100", isSettled: true },
    ] as Expense[];
    const csv = expensesToCsv(exps, cats, { u1: "Ana", u2: "Luis" });
    expect(csv.startsWith("﻿Fecha;")).toBe(true);
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toBe("2026-11-01;Pan;Sin categoría;2,00;PEN;2,00;Luis;Personal;Personal;Sí");
    expect(lines[2]).toBe("2026-11-03;Cena;Comida;10,50;USD;39,90;Ana;Compartido;50/50;No");
  });

  it("nombre de archivo sin tildes ni espacios", () => {
    expect(exportFileName("1 nov. – 30 nov.")).toBe("duofinanzas-gastos-1-nov-30-nov.csv");
  });
});
