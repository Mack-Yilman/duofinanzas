// Edge Function: borra constancias huérfanas del bucket `receipts`.
// La invocan (a) un administrador desde /admin (JWT + is_admin, solo desde el sitio) o
// (b) el job semanal de pg_cron con la cabecera `x-cron-secret` (secreto en Vault, validado
// por la RPC `verify_cron_secret`, solo service_role).
// Storage no permite borrar con SQL; aquí se usa la API de Storage con la service role.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://mack-yilman.github.io", "http://localhost:3000"];

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405, origin);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let actorId: string | null = null; // null = sistema (cron)
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== null) {
    // (b) pg_cron: sin Origin; el secreto de 64 hex se valida contra Vault.
    if (!/^[0-9a-f]{64}$/.test(cronSecret)) return json({ error: "No autorizado" }, 401, origin);
    const { data: ok } = await admin.rpc("verify_cron_secret", { p_secret: cronSecret });
    if (ok !== true) return json({ error: "No autorizado" }, 401, origin);
  } else {
    // (a) administrador desde el sitio.
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: "Origen no permitido" }, 403, origin);
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "No autenticado" }, 401, origin);
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (isAdmin !== true) return json({ error: "Solo un administrador puede limpiar el almacenamiento." }, 403, origin);
    actorId = userData.user.id;
  }
  const { data: rows, error } = await admin.rpc("orphan_receipt_paths");
  if (error) return json({ error: "No se pudieron listar los archivos" }, 500, origin);

  const paths = ((rows ?? []) as { name: string }[]).map((r) => r.name);
  let removed = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { data, error: rmErr } = await admin.storage.from("receipts").remove(batch);
    if (rmErr) return json({ error: "Error al borrar archivos", removed }, 500, origin);
    removed += data?.length ?? 0;
  }

  await admin.rpc("log_system_action", {
    p_admin: actorId,
    p_action: "cleanup_receipts",
    p_detail: { removed, source: actorId ? "admin" : "cron" },
  });
  return json({ removed }, 200, origin);
});
