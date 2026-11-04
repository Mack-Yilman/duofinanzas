import { queryClient } from "./query-client";
import { getCurrentUser } from "./repos/users";
import type { User } from "./types";

export const ME_KEY = ["me"] as const;

export function fetchMe() {
  return queryClient.fetchQuery({ queryKey: ME_KEY, queryFn: getCurrentUser, staleTime: 5 * 60_000 });
}

/** Usuario autenticado; lanza si no hay sesión. */
export async function requireUser(): Promise<User> {
  const me = await fetchMe();
  if (!me) throw new Error("No autenticado");
  return me;
}

/** Usuario autenticado con pareja; lanza si aún no la configuró. */
export async function requireCoupleUser(): Promise<User> {
  const me = await requireUser();
  if (!me.coupleId) throw new Error("Primero configura tu pareja");
  return me;
}
