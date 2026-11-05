import { supabase, unwrap } from "../supabase/client";
import { toBudget } from "./mappers";
import type { Budget } from "../types";

export async function getBudgets(coupleId: string): Promise<Budget[]> {
  const rows = unwrap(await supabase.from("budgets").select("*").eq("couple_id", coupleId));
  return (rows ?? []).map(toBudget);
}

/** Crea o actualiza el presupuesto de una categoría (uno por categoría y pareja). */
export async function upsertBudget(coupleId: string, categoryId: string, amount: number) {
  unwrap(
    await supabase
      .from("budgets")
      .upsert({ couple_id: coupleId, category_id: categoryId, amount }, { onConflict: "couple_id,category_id" })
  );
}

export async function deleteBudget(categoryId: string) {
  unwrap(await supabase.from("budgets").delete().eq("category_id", categoryId));
}
