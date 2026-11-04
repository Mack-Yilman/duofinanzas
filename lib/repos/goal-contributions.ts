import { supabase, unwrap } from "../supabase/client";
import { toGoalContribution } from "./mappers";
import { toDateString } from "../domain/dates";
import type { GoalContribution } from "../types";

export async function getGoalContributions(goalId: string): Promise<GoalContribution[]> {
  const rows = unwrap(
    await supabase.from("goal_contributions").select("*").eq("goal_id", goalId).order("date", { ascending: false })
  );
  return (rows ?? []).map(toGoalContribution);
}

/** Aportes de la pareja (para descontarlos de la liquidez). */
export async function getAllGoalContributions(coupleId: string): Promise<GoalContribution[]> {
  const rows = unwrap(await supabase.from("goal_contributions").select("*").eq("couple_id", coupleId));
  return (rows ?? []).map(toGoalContribution);
}

/** El trigger `goal_contributions_sync` actualiza goals.current_amount de forma atómica. */
export async function createGoalContribution(data: Omit<GoalContribution, "id">): Promise<string> {
  const row = unwrap(
    await supabase.from("goal_contributions").insert({
      name: data.name,
      goal_id: data.goalId,
      user_id: data.userId,
      amount: data.amount,
      currency: data.currency,
      date: toDateString(data.date),
    }).select("id").single()
  );
  return row!.id as string;
}

export async function deleteGoalContribution(id: string) {
  unwrap(await supabase.from("goal_contributions").delete().eq("id", id));
}
