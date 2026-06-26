"use server";

import { auth } from "@/auth";
import { createGoal } from "@/lib/repos/goals";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addGoalAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const coupleId = (session.user as any).coupleId;
  const name = formData.get("name") as string;
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const currency = formData.get("currency") as any;
  const targetDateStr = formData.get("targetDate") as string;
  const icon = formData.get("icon") as string;
  
  await createGoal({
    name,
    targetAmount,
    currentAmount: 0,
    currency,
    targetDate: new Date(targetDateStr),
    icon,
    coupleId,
    contributionMode: "proportional",
    isAchieved: false,
  });

  revalidatePath("/goals");
  redirect("/goals");
}

export async function deleteGoalAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const id = formData.get("id") as string;
  const { deleteGoal } = await import("@/lib/repos/goals");
  await deleteGoal(id);
  
  revalidatePath("/goals");
}

export async function contributeToGoalAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const id = formData.get("id") as string;
  const currentAmount = parseFloat(formData.get("currentAmount") as string);
  const contribution = parseFloat(formData.get("contribution") as string);
  
  const { updateGoal, getGoal } = await import("@/lib/repos/goals");
  const goal = await getGoal(id);
  
  // Store contribution if DB exists
  const { createGoalContribution } = await import("@/lib/repos/goal-contributions");
  try {
    await createGoalContribution({
      name: `Aporte de ${session.user.name || 'Usuario'}`,
      goalId: id,
      userId: session.user.id!,
      amount: contribution,
      currency: goal.currency,
      date: new Date(),
    });
  } catch (err) {
    console.warn("Aportes detallados no registrados. Falta configuración GOALS_CONTRIBUTIONS_DB_ID");
  }
  
  await updateGoal(id, {
    currentAmount: currentAmount + contribution,
  });
  
  revalidatePath("/goals");
}

export async function updateGoalAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const currency = formData.get("currency") as any;
  const icon = formData.get("icon") as string;
  
  const { updateGoal } = await import("@/lib/repos/goals");
  
  await updateGoal(id, {
    name,
    targetAmount,
    currency,
    icon,
  });
  
  revalidatePath("/goals");
  redirect("/goals");
}
