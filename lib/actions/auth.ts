import { supabase } from "../supabase/client";
import { queryClient } from "../query-client";
import { navigate } from "../nav";
import { ME_KEY } from "../session";
import { createCouple, joinCouple } from "../repos/couples";

function translate(message: string) {
  if (/invalid login credentials/i.test(message)) return "Credenciales inválidas.";
  if (/email not confirmed/i.test(message)) return "Confirma tu correo antes de iniciar sesión.";
  if (/already registered/i.test(message)) return "Ese correo ya está registrado.";
  if (/solo por invitación|signups not allowed|database error saving new user/i.test(message))
    return "El acceso es solo por invitación del administrador.";
  if (/password should be at least/i.test(message)) return "La contraseña es demasiado corta.";
  if (/same.*password|different from the old/i.test(message)) return "La nueva contraseña debe ser distinta a la anterior.";
  if (/weak|pwned|leaked/i.test(message)) return "Esa contraseña es débil o apareció en filtraciones; elige otra.";
  if (/rate limit|too many/i.test(message)) return "Demasiados intentos. Espera unos minutos.";
  if (/aal2|verificación en dos pasos/i.test(message)) return "Confirma primero el código de verificación en dos pasos.";
  // No mostrar mensajes crudos de Postgres/Auth (pueden revelar nombres internos).
  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

export async function login(formData: FormData): Promise<{ error?: string; mfa?: boolean }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: translate(error.message) };
  await queryClient.invalidateQueries({ queryKey: ME_KEY });
  // Con verificación en dos pasos activa, falta el código antes de entrar.
  const { mfaPending } = await import("../mfa");
  if (await mfaPending()) return { mfa: true };
  navigate("/");
  return {};
}

/** Segundo paso del inicio de sesión (código TOTP de 6 dígitos). */
export async function loginMfa(code: string): Promise<{ error?: string }> {
  const { verifyLogin } = await import("../mfa");
  try {
    await verifyLogin(code);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Código inválido" };
  }
  navigate("/");
  return {};
}

/**
 * Aceptar invitación: la sesión llega en el enlace del correo. El invitado define
 * nombre y contraseña y otorga el consentimiento (Ley 29733), que queda registrado.
 */
export async function acceptInvite(input: {
  userId: string;
  name: string;
  password: string;
  consent: boolean;
  version: string;
}): Promise<{ error?: string }> {
  if (!input.consent) return { error: "Debes aceptar la Política de Privacidad y los Términos." };
  if (input.password.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { error: "Escribe tu nombre." };

  const { error } = await supabase.auth.updateUser({ password: input.password, data: { name } });
  if (error) return { error: translate(error.message) };
  const { updateMyName } = await import("../repos/users");
  await updateMyName(input.userId, name);
  const consent = await supabase.rpc("accept_terms", { p_version: input.version });
  if (consent.error) return { error: translate(consent.error.message) };
  await queryClient.invalidateQueries({ queryKey: ME_KEY });
  navigate("/setup");
  return {};
}

export async function acceptTerms(version: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("accept_terms", { p_version: version });
  if (error) return { error: translate(error.message) };
  await queryClient.invalidateQueries({ queryKey: ME_KEY });
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

export async function requestPasswordReset(email: string): Promise<{ error?: string; info?: string }> {
  const { resetRedirectUrl } = await import("../repos/admin");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetRedirectUrl() });
  // Mismo mensaje exista o no la cuenta (no revelar qué correos están registrados).
  if (error && !/rate limit/i.test(error.message)) return { error: translate(error.message) };
  if (error) return { error: "Demasiados intentos. Espera unos minutos." };
  return { info: "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña." };
}

export async function setNewPassword(password: string): Promise<{ error?: string }> {
  if (password.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translate(error.message) };
  await queryClient.invalidateQueries({ queryKey: ME_KEY });
  navigate("/");
  return {};
}
