import type { Page } from "@playwright/test";

/**
 * Supabase simulado para probar la app con sesión sin tocar el proyecto real:
 * - inyecta una sesión en localStorage (supabase-js no verifica la firma en el navegador),
 * - responde a /rest/v1 con datos de ejemplo de una pareja.
 */
export const U1 = "11111111-1111-4111-8111-111111111111";
export const U2 = "22222222-2222-4222-8222-222222222222";
const COUPLE = "33333333-3333-4333-8333-333333333333";
const CAT = "44444444-4444-4444-8444-444444444444";
const PROJECT = "vjglzizutcijcyexcume";

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

function fakeSession() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: U1, role: "authenticated", aal: "aal1", exp, amr: [{ method: "password", timestamp: exp - 60 }] })}.${Buffer.from("firma-de-prueba").toString("base64url")}`;
  return {
    access_token: jwt,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token: "refresh",
    user: { id: U1, aud: "authenticated", role: "authenticated", email: "ana@example.test", factors: [], app_metadata: {}, user_metadata: {} },
  };
}

const today = new Date();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5);
const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), 1);

export function mockData(consentVersion: string) {
  return {
    profiles: [
      { id: U1, name: "Ana", email: "ana@example.test", avatar_color: "indigo", couple_id: COUPLE, role: "owner", consent_version: consentVersion },
      { id: U2, name: "Luis", email: "luis@example.test", avatar_color: "rose", couple_id: COUPLE, role: "member", consent_version: consentVersion },
    ],
    couples: [{ id: COUPLE, name: "Ana y Luis", invite_code: "DUO-TEST0001", fx_rate: 3.8, cutoff_day: 1 }],
    categories: [{ id: CAT, couple_id: COUPLE, name: "Comida", icon: "🍔", color: "blue", kind: "shared", is_archived: false }],
    incomes: [
      { id: "i1", couple_id: COUPLE, user_id: U1, name: "Sueldo", amount: 3000, currency: "PEN", type: "salary", period: "monthly", effective_date: ymd(today), is_active: true },
      { id: "i2", couple_id: COUPLE, user_id: U2, name: "Sueldo", amount: 2000, currency: "PEN", type: "salary", period: "monthly", effective_date: ymd(today), is_active: true },
    ],
    expenses: [
      { id: "e1", couple_id: COUPLE, name: "Supermercado", amount: 85, currency: "PEN", amount_base: 85, fx_rate: 1, fx_date: ymd(today), date: ymd(today),
        category_id: CAT, paid_by: U1, split_mode: "equal", split_share_a: 50, split_share_b: 50, is_shared: true, is_settled: false, notes: "", created_by: U1, created_at: today.toISOString() },
      { id: "e0", couple_id: COUPLE, name: "Cine", amount: 40, currency: "PEN", amount_base: 40, fx_rate: 1, fx_date: ymd(lastYear), date: ymd(lastYear),
        category_id: CAT, paid_by: U2, split_mode: "equal", split_share_a: 50, split_share_b: 50, is_shared: true, is_settled: true, settlement_id: "s1",
        notes: "", created_by: U2, created_at: lastYear.toISOString() },
    ],
    budgets: [
      { id: "b1", couple_id: COUPLE, category_id: CAT, amount: 100, user_id: null },
      { id: "b2", couple_id: COUPLE, category_id: CAT, amount: 40, user_id: U1 },
    ],
    settlements: [
      { id: "s1", couple_id: COUPLE, from_user: U1, to_user: U2, amount: 20, currency: "PEN", expense_count: 1, created_by: U1, created_at: lastYear.toISOString() },
    ],
    category_rules: [{ id: "cr1", couple_id: COUPLE, pattern: "farma", category_id: CAT }],
    recurring_expenses: [
      { id: "r1", couple_id: COUPLE, name: "Alquiler", amount: 1200, currency: "PEN", category_id: CAT, paid_by: U1, split_mode: "proportional",
        is_shared: true, day_of_month: 5, next_date: ymd(nextMonth), is_active: true },
    ],
    goal_contributions: [
      { id: "gc1", couple_id: COUPLE, goal_id: "g1", user_id: U1, name: "Aporte", amount: 200, currency: "PEN", date: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 10)) },
      { id: "gc2", couple_id: COUPLE, goal_id: "g1", user_id: U2, name: "Aporte", amount: 100, currency: "PEN", date: ymd(today) },
    ],
    goals: [
      { id: "g1", couple_id: COUPLE, name: "Viaje", target_amount: 2000, current_amount: 300, currency: "PEN", target_date: null, contribution_mode: "proportional", icon: "✈️", is_achieved: false },
    ],
    receipts: [],
  } as Record<string, Record<string, unknown>[]>;
}

export interface Mutation { method: string; table: string; url: string; body: unknown }

export async function mockSupabase(page: Page, consentVersion: string, mutations: Mutation[] = []) {
  const data = mockData(consentVersion);
  const session = fakeSession();
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [`sb-${PROJECT}-auth-token`, JSON.stringify(session)] as const
  );
  await page.route(`https://${PROJECT}.supabase.co/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith("/auth/v1/user")) {
      return route.fulfill({ json: session.user });
    }
    if (url.pathname === "/rest/v1/rpc/is_admin") return route.fulfill({ json: false });
    const table = url.pathname.replace("/rest/v1/", "");
    if (req.method() !== "GET") {
      mutations.push({ method: req.method(), table, url: req.url(), body: req.postDataJSON?.() ?? null });
      return route.fulfill({ status: req.method() === "POST" ? 201 : 204, json: [] });
    }
    let rows = data[table] ?? [];
    const idEq = url.searchParams.get("id");
    if (idEq?.startsWith("eq.")) rows = rows.filter((r) => r.id === idEq.slice(3));
    const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    return route.fulfill({ json: single ? (rows[0] ?? null) : rows });
  });
}
