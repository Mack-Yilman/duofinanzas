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
  const contributionCurrency = (formData.get("contributionCurrency") as string) || "PEN";

  const { updateGoal, getGoal } = await import("@/lib/repos/goals");
  const goal = await getGoal(id);

  // Convertir el aporte a la moneda de la meta si difieren.
  // Frankfurter (BCE) NO soporta PEN → para PEN↔USD usamos la tasa manual de la pareja.
  const coupleId = (session.user as any).coupleId;
  const { getCouple } = await import("@/lib/repos/couples");
  const couple = await getCouple(coupleId);
  const fxRate = couple.fxRate || 3.8;

  let addedInGoalCurrency = contribution;
  if (contributionCurrency !== goal.currency) {
    if (contributionCurrency === "USD" && goal.currency === "PEN") {
      addedInGoalCurrency = contribution * fxRate;
    } else if (contributionCurrency === "PEN" && goal.currency === "USD") {
      addedInGoalCurrency = contribution / fxRate;
    } else {
      // Otros pares (p.ej. USD↔EUR) vía Frankfurter; si falla, cae a 1:1.
      const { getRate } = await import("@/lib/domain/fx");
      const rate = await getRate(contributionCurrency, goal.currency);
      addedInGoalCurrency = contribution * rate;
    }
  }
  addedInGoalCurrency = Math.round(addedInGoalCurrency * 100) / 100;

  // Guarda el aporte en la moneda de la meta (ya convertido).
  const { createGoalContribution } = await import("@/lib/repos/goal-contributions");
  try {
    await createGoalContribution({
      name: `Aporte de ${session.user.name || 'Usuario'}`,
      goalId: id,
      userId: session.user.id!,
      amount: addedInGoalCurrency,
      currency: goal.currency,
      date: new Date(),
    });
  } catch (err) {
    console.warn("Aportes detallados no registrados. Falta configuración GOALS_CONTRIBUTIONS_DB_ID");
  }

  await updateGoal(id, {
    currentAmount: currentAmount + addedInGoalCurrency,
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
