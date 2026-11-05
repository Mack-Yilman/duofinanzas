import { supabase } from "./supabase/client";
import { queryClient } from "./query-client";
import { ME_KEY } from "./session";

/**
 * Verificación en dos pasos (TOTP: Google Authenticator, Microsoft Authenticator, 1Password…).
 * La base de datos exige nivel AAL2 a quien la activó (`private.mfa_ok`), así que este módulo
 * solo guía la UI: activar, verificar al entrar y desactivar.
 */

function msg(e: { message: string } | null | undefined, fallback: string) {
  if (!e) return fallback;
  if (/invalid.*code|code.*invalid|expired/i.test(e.message)) return "Código incorrecto o vencido. Prueba con el siguiente.";
  return e.message || fallback;
}

/** true si el usuario tiene MFA y la sesión aún no pasó el segundo paso. */
export async function mfaPending(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return !!data && data.nextLevel === "aal2" && data.currentLevel !== "aal2";
  } catch {
    return false;
  }
}

export async function verifiedTotp() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return data.totp.filter((f) => f.status === "verified");
}

/** Paso 1 de activación: devuelve el QR (SVG en data URL) y el secreto para ingresarlo a mano. */
export async function startEnroll() {
  // Limpia intentos previos sin terminar (Supabase limita los factores sin verificar).
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.all ?? []) {
    if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `DúoFinanzas ${Date.now()}` });
  if (error || !data) throw new Error(msg(error, "No se pudo iniciar la activación"));
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifica un código para un factor (activación o inicio de sesión). */
export async function verifyCode(factorId: string, code: string) {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) throw new Error("El código tiene 6 dígitos.");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: clean });
  if (error) throw new Error(msg(error, "No se pudo verificar el código"));
  await queryClient.invalidateQueries();
  await queryClient.invalidateQueries({ queryKey: ME_KEY });
}

/** Segundo paso al iniciar sesión. */
export async function verifyLogin(code: string) {
  const [factor] = await verifiedTotp();
  if (!factor) throw new Error("No hay verificación en dos pasos activa.");
  await verifyCode(factor.id, code);
}

/** Desactivar (requiere sesión AAL2, es decir, haber entrado con el código). */
export async function disableMfa(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(msg(error, "No se pudo desactivar"));
  await supabase.auth.refreshSession();
  await queryClient.invalidateQueries();
}
