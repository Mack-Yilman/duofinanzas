import { supabase, unwrap } from "../supabase/client";
import { toBudget } from "./mappers";
import type { Budget } from "../types";

/** RLS devuelve los compartidos y solo los personales propios. */
export async function getBudgets(coupleId: string): Promise<Budget[]> {
  const rows = unwrap(await supabase.from("budgets").select("*").eq("couple_id", coupleId));
  return (rows ?? []).map(toBudget);
}

/**
 * Crea o actualiza un presupuesto: uno compartido (`userId` vacío) y uno personal por persona
 * para cada categoría (índice único `nulls not distinct (couple_id, category_id, user_id)`).
 */
export async function upsertBudget(coupleId: string, categoryId: string, amount: number, userId?: string) {
  unwrap(
    await supabase
      .from("budgets")
      .upsert(
        { couple_id: coupleId, category_id: categoryId, amount, user_id: userId || null },
        { onConflict: "couple_id,category_id,user_id" }
      )
  );
}

export async function deleteBudget(categoryId: string, userId?: string) {
  const q = supabase.from("budgets").delete().eq("category_id", categoryId);
  unwrap(await (userId ? q.eq("user_id", userId) : q.is("user_id", null)));
}
