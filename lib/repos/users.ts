import { supabase, unwrap } from "../supabase/client";
import { toUser } from "./mappers";
import type { User } from "../types";

export type CurrentUser = User & { isAdmin: boolean };

/** Perfil del usuario autenticado (null si no hay sesión). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const [profile, admin] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    supabase.rpc("is_admin"),
  ]);
  const row = unwrap(profile);
  return row ? { ...toUser(row), isAdmin: admin.data === true } : null;
}

/** Miembros de la pareja (RLS ya limita a la pareja del usuario). */
export async function getUsersByCoupleId(coupleId: string): Promise<User[]> {
  const rows = unwrap(await supabase.from("profiles").select("*").eq("couple_id", coupleId).order("id"));
  return (rows ?? []).map(toUser);
}
