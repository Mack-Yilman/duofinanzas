import type { Category, Expense } from "../types";
import { toDateString } from "./dates";

/**
 * Celda CSV segura: comillas escapadas y protección contra inyección de fórmulas
 * (Excel ejecuta celdas que empiezan por = + - @ o tabulador/retorno, también tras espacios
 * iniciales o con sus variantes de ancho completo ＝ ＋ － ＠).
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[\s\u00a0\u3000]*[=+\-@\uff1d\uff0b\uff0d\uff20\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) || s.startsWith("'") ? `"${s.replace(/"/g, '""')}"` : s;
}

const SPLIT: Record<string, string> = { proportional: "Proporcional", equal: "50/50", custom: "Personalizado", owner_100: "Personal" };

/**
 * CSV de gastos (separador `;` y coma decimal para Excel en español). Lleva BOM UTF-8
 * para que las tildes se vean bien al abrirlo.
 */
export function expensesToCsv(expenses: Expense[], categories: Category[], names: Record<string, string>): string {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const money = (n: number) => n.toFixed(2).replace(".", ",");
  const header = ["Fecha", "Descripción", "Categoría", "Monto", "Moneda", "Monto en PEN", "Pagó", "Tipo", "Reparto", "Liquidado"];
  const rows = [...expenses]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e) => [
      toDateString(e.date),
      e.name,
      cat.get(e.categoryId) ?? "Sin categoría",
      money(e.amount),
      e.currency,
      money(e.amountBase),
      names[e.paidById] ?? "",
      e.isShared ? "Compartido" : "Personal",
      SPLIT[e.splitMode] ?? e.splitMode,
      e.isSettled ? "Sí" : "No",
    ]);
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

/** Nombre de archivo seguro: duofinanzas-gastos-<etiqueta>.csv */
export function exportFileName(label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `duofinanzas-gastos-${slug || "export"}.csv`;
}
