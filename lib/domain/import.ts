import type { Category, Currency, Expense } from "../types";
import { normalize } from "./filters";
import { toDateString } from "./dates";

export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_BYTES = 1024 * 1024;

/** Parser CSV (RFC 4180) con separador `;` o `,` detectado en la cabecera. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** "1.234,56" · "1,234.56" · "1234.5" · "S/ 20" → número (o NaN). */
export function parseAmount(raw: string): number {
  let s = raw.replace(/[^\d,.-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  return s ? Number(s) : NaN;
}

/** "2026-11-05" · "05/11/2026" · "5-11-26" → Date local (o null). */
export function parseDate(raw: string): Date | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (m) return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return null;
}
function valid(y: number, mo: number, d: number): Date | null {
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null;
}

const COLS = {
  date: ["fecha", "date"],
  name: ["descripcion", "concepto", "detalle", "description"],
  category: ["categoria", "category"],
  amount: ["monto", "importe", "amount"],
  currency: ["moneda", "currency"],
  payer: ["pago", "pagado por", "paid by"],
  type: ["tipo", "type"],
};

export interface ImportRow {
  line: number;
  date: Date;
  name: string;
  amount: number;
  currency: Currency;
  categoryId: string;
  categoryName: string;
  payerId: string | null;
  isShared: boolean;
  duplicate: boolean;
}

export interface ImportResult {
  rows: ImportRow[];
  errors: { line: number; message: string }[];
  truncated: boolean;
}

const dupKey = (date: Date, amount: number, name: string) => `${toDateString(date)}|${amount.toFixed(2)}|${normalize(name)}`;

/**
 * Convierte un CSV en filas listas para importar. Acepta el formato de “Exportar CSV” y
 * cualquier CSV con columnas Fecha, Descripción y Monto (las demás son opcionales).
 * Marca como duplicado lo que coincide en fecha + monto + descripción con un gasto existente
 * o con otra fila del mismo archivo.
 */
export function buildImport(
  text: string,
  ctx: { categories: Category[]; users: { id: string; name: string }[]; existing: Expense[] }
): ImportResult {
  const table = parseCsv(text);
  const errors: ImportResult["errors"] = [];
  if (table.length < 2) return { rows: [], errors: [{ line: 1, message: "El archivo no tiene filas de datos." }], truncated: false };

  const header = table[0].map((h) => normalize(h));
  const idx = Object.fromEntries(
    Object.entries(COLS).map(([k, names]) => [k, header.findIndex((h) => names.includes(h))])
  ) as Record<keyof typeof COLS, number>;
  const missing = (["date", "name", "amount"] as const).filter((k) => idx[k] < 0);
  if (missing.length) {
    const label = { date: "Fecha", name: "Descripción", amount: "Monto" };
    return { rows: [], errors: [{ line: 1, message: `Faltan columnas: ${missing.map((k) => label[k]).join(", ")}.` }], truncated: false };
  }

  const catByName = new Map(ctx.categories.map((c) => [normalize(c.name), c]));
  const userByName = new Map(ctx.users.filter((u) => u.name).map((u) => [normalize(u.name), u.id]));
  const seen = new Set(ctx.existing.map((e) => dupKey(e.date, e.amount, e.name)));
  const body = table.slice(1, IMPORT_MAX_ROWS + 1);
  const rows: ImportRow[] = [];

  body.forEach((cells, i) => {
    const line = i + 2;
    const get = (k: keyof typeof COLS) => (idx[k] >= 0 ? (cells[idx[k]] ?? "").trim() : "");
    const date = parseDate(get("date"));
    const name = get("name").replace(/^'(?=[=+\-@])/, "").slice(0, 120); // quita el escape anti-fórmulas de la exportación
    const amount = parseAmount(get("amount"));
    const cur = get("currency").toUpperCase() || "PEN";
    if (!date) return errors.push({ line, message: `Fecha inválida: “${get("date")}”` });
    if (!name) return errors.push({ line, message: "Falta la descripción" });
    if (!Number.isFinite(amount) || amount <= 0) return errors.push({ line, message: `Monto inválido: “${get("amount")}”` });
    if (!["PEN", "USD", "EUR"].includes(cur)) return errors.push({ line, message: `Moneda no soportada: ${cur}` });
    const cat = catByName.get(normalize(get("category")));
    const key = dupKey(date, amount, name);
    const duplicate = seen.has(key);
    seen.add(key);
    rows.push({
      line,
      date,
      name,
      amount: Math.round(amount * 100) / 100,
      currency: cur as Currency,
      categoryId: cat?.id ?? "",
      categoryName: cat?.name ?? "Sin categoría",
      payerId: userByName.get(normalize(get("payer"))) ?? null,
      isShared: normalize(get("type")) !== "personal",
      duplicate,
    });
  });

  return { rows, errors, truncated: table.length - 1 > IMPORT_MAX_ROWS };
}
