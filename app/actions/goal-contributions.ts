"use server";

import { auth } from "@/auth";
import { createGoalContribution, deleteGoalContribution } from "@/lib/repos/goal-contributions";
import { getGoal, updateGoal } from "@/lib/repos/goals";
import { revalidatePath } from "next/cache";

export async function deleteContributionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const id = formData.get("id") as string;
  const goalId = formData.get("goalId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  
  // Deduct from goal
  const goal = await getGoal(goalId);
  const newAmount = Math.max(0, goal.currentAmount - amount);
  await updateGoal(goalId, { currentAmount: newAmount });
  
  // Delete contribution
  await deleteGoalContribution(id);
  
  revalidatePath("/goals");
}
