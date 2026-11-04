import { supabase, unwrap } from "../supabase/client";
import { toGoal } from "./mappers";
import { toDateString } from "../domain/dates";
import type { Goal } from "../types";

export async function getGoals(coupleId: string): Promise<Goal[]> {
  const rows = unwrap(
    await supabase.from("goals").select("*").eq("couple_id", coupleId).eq("is_achieved", false).order("created_at")
  );
  return (rows ?? []).map(toGoal);
}

export async function getGoal(id: string): Promise<Goal> {
  return toGoal(unwrap(await supabase.from("goals").select("*").eq("id", id).single())!);
}

export async function createGoal(data: Partial<Goal>) {
  unwrap(
    await supabase.from("goals").insert({
      name: data.name,
      target_amount: data.targetAmount || 0,
      currency: data.currency || "PEN",
      target_date: data.targetDate ? toDateString(data.targetDate) : null,
      contribution_mode: data.contributionMode || "proportional",
      icon: data.icon || "🎯",
    })
  );
}

export async function updateGoal(id: string, data: Partial<Goal>) {
  const patch: Record<string, unknown> = {};
  if (data.name) patch.name = data.name;
  if (data.targetAmount !== undefined) patch.target_amount = data.targetAmount;
  if (data.currency) patch.currency = data.currency;
  if (data.icon) patch.icon = data.icon;
  unwrap(await supabase.from("goals").update(patch).eq("id", id));
}

export async function deleteGoal(id: string) {
  unwrap(await supabase.from("goals").delete().eq("id", id));
}
