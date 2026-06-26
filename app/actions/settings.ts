"use server";

import { auth } from "@/auth";
import { updateCouple } from "@/lib/repos/couples";
import { revalidatePath } from "next/cache";

export async function updateFxRateAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  const coupleId = (session.user as any).coupleId;
  const fxRate = parseFloat(formData.get("fxRate") as string);
  
  if (!fxRate || isNaN(fxRate) || fxRate <= 0) {
    throw new Error("Invalid FX rate");
  }
  
  await updateCouple(coupleId, fxRate);
  
  revalidatePath("/");
  revalidatePath("/settings");
}
