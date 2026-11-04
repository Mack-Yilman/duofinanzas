/**
 * Migración única de datos: Notion → Supabase.
 *
 * Uso (en tu máquina, NUNCA en CI):
 *   1. Ejecuta supabase/migrations/0001_init.sql en un proyecto Supabase VACÍO.
 *   2. Completa .env.local con NOTION_TOKEN, los *_DB_ID de Notion,
 *      NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *   3. npm run migrate:notion
 *
 * Los hashes bcrypt de Notion no se pueden importar en Supabase Auth: el script crea
 * cada usuario con una contraseña temporal y la imprime al final. Cada persona puede
 * cambiarla luego en Ajustes → Cambiar contraseña.
 */
import { Client } from "@notionhq/client";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

/* eslint-disable @typescript-eslint/no-explicit-any */
type Page = any;

function env(name: string, ...alts: string[]): string {
  for (const n of [name, ...alts]) if (process.env[n]) return process.env[n]!;
  return "";
}

const notion = new Client({ auth: env("NOTION_TOKEN") });
const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
if (!env("NOTION_TOKEN") || !supabaseUrl || !serviceKey) {
  console.error("Faltan NOTION_TOKEN, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// ── Lectura de Notion ────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function queryAll(dbId: string): Promise<Page[]> {
  if (!dbId) return [];
  const out: Page[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.databases.query({ database_id: dbId, start_cursor: cursor });
    out.push(...res.results);
    cursor = res.next_cursor ?? undefined;
    await sleep(350); // ~3 req/s
  } while (cursor);
  return out;
}

const prop = (p: Page, k: string) => p.properties?.[k];
const text = (p: Page, k: string): string => {
  const v = prop(p, k);
  if (!v) return "";
  if (v.type === "title") return v.title?.map((t: any) => t.plain_text).join("") || "";
  if (v.type === "rich_text") return v.rich_text?.map((t: any) => t.plain_text).join("") || "";
  if (v.type === "email") return v.email || "";
  if (v.type === "url") return v.url || "";
  return "";
};
const num = (p: Page, k: string) => (prop(p, k)?.type === "number" ? prop(p, k).number ?? 0 : 0);
const sel = (p: Page, k: string) => (prop(p, k)?.type === "select" ? prop(p, k).select?.name ?? "" : "");
const bool = (p: Page, k: string) => (prop(p, k)?.type === "checkbox" ? !!prop(p, k).checkbox : false);
const date = (p: Page, k: string) => (prop(p, k)?.type === "date" ? prop(p, k).date?.start?.slice(0, 10) ?? null : null);
const rel = (p: Page, k: string) => (prop(p, k)?.type === "relation" ? prop(p, k).relation?.[0]?.id ?? "" : "");
const oneOf = (v: string, allowed: string[], fallback: string) => (allowed.includes(v) ? v : fallback);
const CURRENCIES = ["PEN", "USD", "EUR"];

async function insert(table: string, row: Record<string, unknown>) {
  const { data, error } = await sb.from(table).insert(row).select("id").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data.id as string;
}

// ── Migración ────────────────────────────────────────────────
async function main() {
  console.log("Leyendo Notion…");
  const [couples, users, categories, incomes, expenses, goals, contribs] = await Promise.all([
    queryAll(env("COUPLES_DB_ID")),
    queryAll(env("USERS_DB_ID")),
    queryAll(env("CATEGORIES_DB_ID")),
    queryAll(env("INCOMES_DB_ID")),
    queryAll(env("EXPENSES_DB_ID")),
    queryAll(env("GOALS_DB_ID")),
    queryAll(env("GOALS_CONTRIBUTIONS_DB_ID", "GOAL_CONTRIBUTIONS_DB_ID")),
  ]);
  console.log(
    `Notion: ${couples.length} parejas, ${users.length} usuarios, ${categories.length} categorías, ` +
      `${incomes.length} ingresos, ${expenses.length} gastos, ${goals.length} metas, ${contribs.length} aportes`
  );

  const coupleMap = new Map<string, string>();
  const userMap = new Map<string, string>();
  const userCouple = new Map<string, string>(); // nuevo userId → nuevo coupleId
  const categoryMap = new Map<string, string>();
  const goalMap = new Map<string, { id: string; coupleId: string }>();
  const tempPasswords: string[] = [];

  for (const c of couples) {
    const id = await insert("couples", {
      name: text(c, "Name") || "Pareja",
      invite_code: text(c, "inviteCode") || `DUO-${randomBytes(3).toString("hex").toUpperCase()}`,
      fx_rate: num(c, "fxRate") || 3.8,
      cutoff_day: Math.min(Math.max(num(c, "cutoffDay") || 1, 1), 31),
    });
    coupleMap.set(c.id, id);
  }

  const { data: existing } = await sb.auth.admin.listUsers({ perPage: 1000 });
  for (const u of users) {
    const email = text(u, "email").toLowerCase();
    if (!email) continue;
    let authId = existing?.users.find((x) => x.email?.toLowerCase() === email)?.id;
    if (!authId) {
      const password = randomBytes(9).toString("base64url");
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: text(u, "Name") },
      });
      if (error) throw new Error(`auth ${email}: ${error.message}`);
      authId = data.user.id;
      tempPasswords.push(`${email}  →  ${password}`);
    }
    const coupleId = coupleMap.get(rel(u, "couple")) ?? null;
    const { error } = await sb
      .from("profiles")
      .upsert({
        id: authId,
        name: text(u, "Name"),
        email,
        avatar_color: sel(u, "avatarColor") || "indigo",
        couple_id: coupleId,
        role: oneOf(sel(u, "role"), ["owner", "member"], "member"),
      });
    if (error) throw new Error(`profiles ${email}: ${error.message}`);
    userMap.set(u.id, authId);
    if (coupleId) userCouple.set(authId, coupleId);
  }

  // El usuario "A" es el de id menor. Al cambiar de ids de Notion a UUID el orden puede
  // invertirse: en ese caso hay que intercambiar splitShareA/B de cada gasto.
  const swapCouple = new Set<string>();
  for (const [oldCouple, newCouple] of coupleMap) {
    const members = users.filter((u) => rel(u, "couple") === oldCouple && userMap.has(u.id)).map((u) => u.id);
    if (members.length < 2) continue;
    const oldA = [...members].sort()[0];
    const newA = members.map((m) => userMap.get(m)!).sort()[0];
    if (userMap.get(oldA) !== newA) swapCouple.add(newCouple);
  }

  for (const c of categories) {
    const coupleId = coupleMap.get(rel(c, "couple"));
    if (!coupleId) continue;
    const id = await insert("categories", {
      couple_id: coupleId,
      name: text(c, "Name") || "Sin nombre",
      icon: text(c, "icon") || "🏷️",
      color: text(c, "color") || "blue",
      kind: oneOf(sel(c, "kind"), ["shared", "personal", "both"], "shared"),
      is_archived: bool(c, "isArchived"),
    });
    categoryMap.set(c.id, id);
  }

  let skipped = 0;
  for (const i of incomes) {
    const userId = userMap.get(rel(i, "user"));
    const coupleId = userId && userCouple.get(userId);
    if (!userId || !coupleId) { skipped++; continue; }
    await insert("incomes", {
      couple_id: coupleId,
      user_id: userId,
      name: text(i, "Name") || "Ingreso",
      amount: num(i, "amount"),
      currency: oneOf(sel(i, "currency"), CURRENCIES, "PEN"),
      type: oneOf(sel(i, "type"), ["salary", "freelance", "bonus", "other"], "other"),
      period: oneOf(sel(i, "period"), ["monthly", "one_time"], "monthly"),
      effective_date: date(i, "effectiveDate") ?? i.created_time.slice(0, 10),
      is_active: bool(i, "isActive"),
      notes: text(i, "notes"),
    });
  }

  for (const e of expenses) {
    const paidBy = userMap.get(rel(e, "paidBy")) ?? userMap.get(rel(e, "createdBy"));
    const coupleId = paidBy && userCouple.get(paidBy);
    if (!paidBy || !coupleId) { skipped++; continue; }
    let a = num(e, "splitShareA");
    let b = num(e, "splitShareB");
    if (swapCouple.has(coupleId)) [a, b] = [b, a];
    await insert("expenses", {
      couple_id: coupleId,
      name: text(e, "Name") || "Gasto",
      amount: num(e, "amount"),
      currency: oneOf(sel(e, "currency"), CURRENCIES, "PEN"),
      amount_base: num(e, "amountBase") || num(e, "amount"),
      fx_rate: num(e, "fxRate") || 1,
      fx_date: date(e, "fxDate") ?? e.created_time.slice(0, 10),
      date: date(e, "date") ?? e.created_time.slice(0, 10),
      category_id: categoryMap.get(rel(e, "category")) ?? null,
      paid_by: paidBy,
      created_by: userMap.get(rel(e, "createdBy")) ?? paidBy,
      split_mode: oneOf(sel(e, "splitMode"), ["proportional", "equal", "custom", "owner_100"], "proportional"),
      split_share_a: a,
      split_share_b: b,
      is_shared: bool(e, "isShared"),
      is_settled: bool(e, "isSettled"),
      notes: text(e, "notes"),
    });
  }

  for (const g of goals) {
    const coupleId = coupleMap.get(rel(g, "couple"));
    if (!coupleId) { skipped++; continue; }
    // El trigger sumará los aportes migrados; partimos del saldo "no explicado" por ellos.
    const contribSum = contribs
      .filter((c) => rel(c, "goal") === g.id)
      .reduce((s, c) => s + num(c, "amount"), 0);
    const id = await insert("goals", {
      couple_id: coupleId,
      name: text(g, "Name") || "Meta",
      target_amount: num(g, "targetAmount"),
      current_amount: Math.max(0, num(g, "currentAmount") - contribSum),
      currency: oneOf(sel(g, "currency"), CURRENCIES, "PEN"),
      target_date: date(g, "targetDate"),
      contribution_mode: oneOf(sel(g, "contributionMode"), ["proportional", "equal", "custom"], "proportional"),
      icon: text(g, "icon") || "🎯",
      is_achieved: bool(g, "isAchieved"),
    });
    goalMap.set(g.id, { id, coupleId });
  }

  for (const c of contribs) {
    const goal = goalMap.get(rel(c, "goal"));
    const userId = userMap.get(rel(c, "user"));
    if (!goal || !userId || num(c, "amount") <= 0) { skipped++; continue; }
    await insert("goal_contributions", {
      couple_id: goal.coupleId,
      goal_id: goal.id,
      user_id: userId,
      name: text(c, "Name") || "Aporte",
      amount: num(c, "amount"),
      currency: oneOf(sel(c, "currency"), CURRENCIES, "PEN"),
      date: date(c, "date") ?? c.created_time.slice(0, 10),
    });
  }

  console.log(`\n✅ Migración completa. Registros omitidos (sin usuario/pareja/meta válidos): ${skipped}`);
  if (swapCouple.size) console.log(`↔️  Reparto A/B ajustado en ${swapCouple.size} pareja(s) por el cambio de ids.`);
  if (tempPasswords.length) {
    console.log("\n🔑 Contraseñas temporales (compártelas de forma privada y cámbienlas en Ajustes):");
    for (const line of tempPasswords) console.log("   " + line);
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
