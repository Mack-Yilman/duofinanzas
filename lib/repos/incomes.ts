import { supabase, unwrap } from "../supabase/client";
import { toIncome } from "./mappers";
import { toDateString } from "../domain/dates";
import type { Income } from "../types";

export async function getIncomes(coupleId: string): Promise<Income[]> {
  const rows = unwrap(
    await supabase.from("incomes").select("*").eq("couple_id", coupleId).order("effective_date", { ascending: false })
  );
  return (rows ?? []).map(toIncome);
}

export async function createIncome(data: Partial<Income>) {
  unwrap(
    await supabase.from("incomes").insert({
      name: data.name,
      user_id: data.userId,
      amount: data.amount || 0,
      currency: data.currency || "PEN",
      type: data.type || "salary",
      period: data.period || "monthly",
      effective_date: toDateString(data.effectiveDate),
      is_active: data.isActive !== false,
      notes: data.notes || "",
    })
  );
}

export async function deleteIncome(id: string) {
  unwrap(await supabase.from("incomes").delete().eq("id", id));
}

export async function updateIncome(id: string, data: Partial<Income>) {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.currency !== undefined) patch.currency = data.currency;
  if (data.type !== undefined) patch.type = data.type;
  if (data.period !== undefined) patch.period = data.period;
  if (data.effectiveDate !== undefined) patch.effective_date = toDateString(data.effectiveDate);
  if (data.isActive !== undefined) patch.is_active = data.isActive;
  unwrap(await supabase.from("incomes").update(patch).eq("id", id));
}
