"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { createUser } from "@/lib/repos/users";
import { createCouple, getCoupleByInviteCode, addMemberToCouple } from "@/lib/repos/couples";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { updateUserCouple } from "@/lib/repos/users";

export async function login(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Credenciales inválidas." };
        default:
          return { error: "Ocurrió un error. Inténtalo de nuevo." };
      }
    }
    throw error;
  }
}

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  try {
    await createUser({ name, email, passwordHash });
  } catch (error) {
    console.error(error);
    throw new Error("No se pudo crear la cuenta");
  }
  
  // Auto login after register
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/setup",
  });
}

export async function setupAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const action = formData.get("action"); // 'create' or 'join'
  
  if (action === "create") {
    const name = formData.get("coupleName") as string;
    const { id: coupleId } = await createCouple(name, userId);
    await updateUserCouple(userId, coupleId, 'owner');
  } else if (action === "join") {
    const inviteCode = formData.get("inviteCode") as string;
    const coupleId = await getCoupleByInviteCode(inviteCode);
    if (!coupleId) {
      throw new Error("Código inválido");
    }
    await addMemberToCouple(coupleId, userId);
    await updateUserCouple(userId, coupleId, 'member');
  }
  
  redirect("/");
}
