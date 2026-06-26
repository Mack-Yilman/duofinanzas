"use server";

import { auth } from "@/auth";
import { createExpense } from "@/lib/repos/expenses";
import { getIncomes } from "@/lib/repos/incomes";
import { calculateEquity, calculateExpenseSplit } from "@/lib/domain/split";
import { getRate } from "@/lib/domain/fx";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createExpenseAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  const coupleId = (session.user as any).coupleId;
  const currentUserId = session.user.id;
  if (!currentUserId || !coupleId) throw new Error("Invalid session");

  const name = formData.get("name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const currency = formData.get("currency") as "PEN" | "USD" | "EUR";
  const categoryId = formData.get("categoryId") as string;
  const splitMode = formData.get("splitMode") as any;
  
  // Base currency of couple (hardcoded to PEN for MVP)
  const baseCurrency = "PEN";
  
  const fxDate = new Date();
  const rate = await getRate(currency, baseCurrency);
  const amountBase = amount * rate;

  const incomes = await getIncomes(); // Get incomes to calculate equity
  const equity = calculateEquity(incomes, baseCurrency, (amt) => amt); // Mock FX inside equity for now

  // Calculate split
  const { quotaA, quotaB } = calculateExpenseSplit(
    amountBase,
    splitMode,
    equity.shareA,
    equity.shareB,
    undefined,
    undefined,
    currentUserId,
    equity.userA
  );
  
  // Note: quotaA and quotaB are absolute amounts. We store them as percentage in DB.
  const splitShareA = (quotaA / amountBase) * 100;
  const splitShareB = (quotaB / amountBase) * 100;

  await createExpense({
    name,
    amount,
    currency,
    amountBase,
    fxRate: rate,
    fxDate,
    date: new Date(),
    categoryId,
    paidById: currentUserId,
    splitMode,
    splitShareA,
    splitShareB,
    isShared: true,
    isSettled: false,
    createdById: currentUserId,
  });

  revalidatePath("/");
  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function deleteExpenseAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const id = formData.get("id") as string;
  const { deleteExpense } = await import("@/lib/repos/expenses");
  await deleteExpense(id);
  
  revalidatePath("/");
  revalidatePath("/expenses");
}
