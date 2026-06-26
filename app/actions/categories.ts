"use server";

import { auth } from "@/auth";
import { createCategory, updateCategory, deleteCategory } from "@/lib/repos/categories";
import { revalidatePath } from "next/cache";

export async function addCategoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const coupleId = (session.user as any).coupleId;

  const name = formData.get("name") as string;
  const icon = formData.get("icon") as string;
  
  await createCategory({ name, icon, color: "blue", kind: "shared" }, coupleId);
  revalidatePath("/categories");
}

export async function editCategoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const icon = formData.get("icon") as string;
  
  await updateCategory(id, { name, icon });
  revalidatePath("/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const id = formData.get("id") as string;
  await deleteCategory(id);
  revalidatePath("/categories");
}
