import { supabase, unwrap } from "../supabase/client";
import { toUser } from "./mappers";
import type { User } from "../types";

export type CurrentUser = User & {
  isAdmin: boolean;
  consentVersion: string | null;
  /** Tiene MFA y la sesión aún no pasó el segundo paso: la BD no le muestra datos. */
  mfaPending: boolean;
};

/** Perfil del usuario autenticado (null si no hay sesión). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const [profile, admin, aal] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase.rpc("is_admin"),
    // Si falla, no se bloquea la entrada: la BD igual exige AAL2 a quien activó MFA.
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().catch(() => ({ data: null })),
  ]);
  const row = unwrap(profile);
  const mfaPending = !!aal.data && aal.data.nextLevel === "aal2" && aal.data.currentLevel !== "aal2";
  return row
    ? {
        ...toUser(row),
        // Con MFA pendiente la BD oculta la pareja (my_couple_id = null): no forzar /setup.
        isAdmin: admin.data === true,
        consentVersion: (row.consent_version as string | null) ?? null,
        mfaPending,
      }
    : null;
}

/** Miembros de la pareja (RLS ya limita a la pareja del usuario). */
export async function getUsersByCoupleId(coupleId: string): Promise<User[]> {
  const rows = unwrap(await supabase.from("profiles").select("*").eq("couple_id", coupleId).order("id"));
  return (rows ?? []).map(toUser);
}

export async function updateMyName(id: string, name: string) {
  unwrap(await supabase.from("profiles").update({ name }).eq("id", id));
}
