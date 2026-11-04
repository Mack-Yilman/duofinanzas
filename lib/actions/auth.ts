import { supabase } from "../supabase/client";
import { queryClient } from "../query-client";
import { navigate } from "../nav";
import { ME_KEY } from "../session";
import { createCouple, joinCouple } from "../repos/couples";

function translate(message: string) {
  if (/invalid login credentials/i.test(message)) return "Credenciales inválidas.";
  if (/email not confirmed/i.test(message)) return "Confirma tu correo antes de iniciar sesión.";
  if (/already registered/i.test(message)) return "Ese correo ya está registrado.";
  if (/password should be at least/i.test(message)) return "La contraseña debe tener al menos 6 caracteres.";
  return message;
}

export async function login(formData: FormData): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: translate(error.message) };
  await queryClient.invalidateQueries({ queryKey: ME_KEY });
  navigate("/");
  return {};
}

export async function register(formData: FormData): Promise<{ error?: string; info?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: { data: { name: String(formData.get("name") ?? "") } },
  });
  if (error) return { error: translate(error.message) };
  if (!data.session) {
    return { info: "Revisa tu correo para confirmar la cuenta y luego inicia sesión." };
  }
  await queryClient.invalidateQueries({ queryKey: ME_KEY });
  navigate("/setup");
  return {};
}

export async function setupCouple(formData: FormData): Promise<{ error?: string }> {
  try {
    if (formData.get("action") === "join") {
      await joinCouple(String(formData.get("inviteCode") ?? ""));
    } else {
      await createCouple(String(formData.get("coupleName") ?? ""));
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo completar." };
  }
  await queryClient.invalidateQueries();
  navigate("/");
  return {};
}

export async function logout() {
  await supabase.auth.signOut();
  queryClient.clear();
  navigate("/login");
}
