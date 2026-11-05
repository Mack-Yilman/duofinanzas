import { supabase, unwrap } from "../supabase/client";
import { toCategoryRule } from "./mappers";
import type { CategoryRule } from "../types";

export async function getCategoryRules(coupleId: string): Promise<CategoryRule[]> {
  const rows = unwrap(
    await supabase.from("category_rules").select("*").eq("couple_id", coupleId).order("created_at", { ascending: true })
  );
  return (rows ?? []).map(toCategoryRule);
}

export async function createCategoryRule(pattern: string, categoryId: string) {
  const res = await supabase.from("category_rules").insert({ pattern, category_id: categoryId });
  // 23505 = índice único (couple_id, lower(pattern)).
  if (res.error?.code === "23505") throw new Error("Ya existe una regla con ese texto");
  unwrap(res);
}

export async function deleteCategoryRule(id: string) {
  unwrap(await supabase.from("category_rules").delete().eq("id", id));
}
