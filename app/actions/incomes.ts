"use server";

import { auth } from "@/auth";
import { createIncome } from "@/lib/repos/incomes";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addIncomeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const userId = session.user.id;
  const name = formData.get("name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const currency = formData.get("currency") as any;
  const type = formData.get("type") as any;
  const period = formData.get("period") as any;

  await createIncome({
    name,
    amount,
    currency,
    type,
    period,
    userId,
    isActive: true,
    effectiveDate: new Date(),
  });

  revalidatePath("/income");
  redirect("/income");
}

export async function deleteIncomeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const id = formData.get("id") as string;
  const { deleteIncome } = await import("@/lib/repos/incomes");
  await deleteIncome(id);
  
  revalidatePath("/income");
}
