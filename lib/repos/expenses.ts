import { supabase, unwrap } from "../supabase/client";
import { toExpense } from "./mappers";
import { toDateString } from "../domain/dates";
import type { Expense } from "../types";

export async function getExpenses(coupleId: string): Promise<Expense[]> {
  const rows = unwrap(
    await supabase
      .from("expenses")
      .select("*")
      .eq("couple_id", coupleId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
  );
  return (rows ?? []).map(toExpense);
}

export async function getExpense(id: string): Promise<Expense> {
  return toExpense(unwrap(await supabase.from("expenses").select("*").eq("id", id).single())!);
}

type ExpenseInput = Omit<Expense, "id" | "createdAt" | "createdById" | "settlementId" | "receiptUrl">;

function toRow(data: Partial<ExpenseInput>) {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.amount !== undefined) row.amount = data.amount;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.amountBase !== undefined) row.amount_base = data.amountBase;
  if (data.fxRate !== undefined) row.fx_rate = data.fxRate;
  if (data.fxDate !== undefined) row.fx_date = toDateString(data.fxDate);
  if (data.date !== undefined) row.date = toDateString(data.date);
  if (data.categoryId !== undefined) row.category_id = data.categoryId || null;
  if (data.paidById !== undefined) row.paid_by = data.paidById || null;
  if (data.splitMode !== undefined) row.split_mode = data.splitMode;
  if (data.splitShareA !== undefined) row.split_share_a = data.splitShareA;
  if (data.splitShareB !== undefined) row.split_share_b = data.splitShareB;
  if (data.isShared !== undefined) row.is_shared = data.isShared;
  if (data.isSettled !== undefined) row.is_settled = data.isSettled;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.recurringSourceId !== undefined) row.recurring_id = data.recurringSourceId || null;
  return row;
}

export async function createExpense(data: ExpenseInput): Promise<string> {
  const row = unwrap(await supabase.from("expenses").insert(toRow(data)).select("id").single());
  return row!.id as string;
}

export async function updateExpense(id: string, data: Partial<ExpenseInput>) {
  unwrap(await supabase.from("expenses").update(toRow(data)).eq("id", id));
}

export async function deleteExpense(id: string) {
  unwrap(await supabase.from("expenses").delete().eq("id", id));
}

/** Inserción masiva (importar CSV): en lotes de 100 filas. */
export async function createExpenses(list: ExpenseInput[]) {
  for (let i = 0; i < list.length; i += 100) {
    unwrap(await supabase.from("expenses").insert(list.slice(i, i + 100).map((d) => toRow(d))));
  }
}
