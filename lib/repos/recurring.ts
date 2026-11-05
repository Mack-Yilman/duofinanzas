import { supabase, unwrap } from "../supabase/client";
import { toRecurring } from "./mappers";
import { toDateString } from "../domain/dates";
import type { RecurringExpense } from "../types";

export async function getRecurring(coupleId: string): Promise<RecurringExpense[]> {
  const rows = unwrap(
    await supabase.from("recurring_expenses").select("*").eq("couple_id", coupleId).order("day_of_month")
  );
  return (rows ?? []).map(toRecurring);
}

export async function createRecurring(data: Omit<RecurringExpense, "id" | "isActive">) {
  unwrap(
    await supabase.from("recurring_expenses").insert({
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      category_id: data.categoryId || null,
      paid_by: data.paidById,
      split_mode: data.splitMode,
      is_shared: data.isShared,
      day_of_month: data.dayOfMonth,
      next_date: toDateString(data.nextDate),
    })
  );
}

export async function setRecurringActive(id: string, isActive: boolean, nextDate?: Date) {
  const patch: Record<string, unknown> = { is_active: isActive };
  if (nextDate) patch.next_date = toDateString(nextDate);
  unwrap(await supabase.from("recurring_expenses").update(patch).eq("id", id));
}

/**
 * Avanza la próxima fecha SOLO si nadie la avanzó antes (condición sobre el valor leído):
 * evita retrocederla si ambos miembros procesan la plantilla a la vez.
 */
export async function advanceRecurring(id: string, from: Date, to: Date) {
  unwrap(
    await supabase
      .from("recurring_expenses")
      .update({ next_date: toDateString(to) })
      .eq("id", id)
      .eq("next_date", toDateString(from))
  );
}

export async function deleteRecurring(id: string) {
  unwrap(await supabase.from("recurring_expenses").delete().eq("id", id));
}
