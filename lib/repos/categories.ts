import { supabase, unwrap } from "../supabase/client";
import { toCategory } from "./mappers";
import type { Category } from "../types";

export async function getCategories(coupleId: string): Promise<Category[]> {
  const rows = unwrap(
    await supabase.from("categories").select("*").eq("couple_id", coupleId).eq("is_archived", false).order("name")
  );
  return (rows ?? []).map(toCategory);
}

export async function createCategory(data: Partial<Category>) {
  const row = unwrap(
    await supabase
      .from("categories")
      .insert({ name: data.name, icon: data.icon || "🏷️", color: data.color || "blue", kind: data.kind || "shared" })
      .select()
      .single()
  );
  return toCategory(row);
}

export async function updateCategory(id: string, data: Partial<Category>) {
  const patch: Record<string, unknown> = {};
  if (data.name) patch.name = data.name;
  if (data.icon) patch.icon = data.icon;
  if (data.color) patch.color = data.color;
  if (data.kind) patch.kind = data.kind;
  unwrap(await supabase.from("categories").update(patch).eq("id", id));
}

/** Archivado lógico: los gastos existentes conservan su categoría. */
export async function deleteCategory(id: string) {
  unwrap(await supabase.from("categories").update({ is_archived: true }).eq("id", id));
}
