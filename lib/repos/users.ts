import { supabase, unwrap } from "../supabase/client";
import { toUser } from "./mappers";
import type { User } from "../types";

/** Perfil del usuario autenticado (null si no hay sesión). */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const row = unwrap(await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle());
  return row ? toUser(row) : null;
}

/** Miembros de la pareja (RLS ya limita a la pareja del usuario). */
export async function getUsersByCoupleId(coupleId: string): Promise<User[]> {
  const rows = unwrap(await supabase.from("profiles").select("*").eq("couple_id", coupleId).order("id"));
  return (rows ?? []).map(toUser);
}
