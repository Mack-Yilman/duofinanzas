// Edge Function: invitar usuarios (solo administradores).
// La service role key existe únicamente en el entorno de la función; nunca llega al navegador.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://mack-yilman.github.io", "http://localhost:3000"];
const SITE_BY_ORIGIN: Record<string, string> = {
  "https://mack-yilman.github.io": "https://mack-yilman.github.io/duofinanzas",
  "http://localhost:3000": "http://localhost:3000",
};

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

const MESSAGES: Record<string, [number, string]> = {
  forbidden: [403, "Solo un administrador puede invitar."],
  invalid_email: [400, "Correo no válido."],
  rate_limited: [429, "Límite de invitaciones alcanzado. Intenta en una hora."],
  already_active: [409, "Ese correo ya tiene una cuenta activa."],
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405, origin);
  if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: "Origen no permitido" }, 403, origin);

  const authHeader = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1) Identidad del que llama (con SU token) y verificación de rol admin.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "No autenticado" }, 401, origin);
  const { data: isAdmin } = await userClient.rpc("is_admin");
  if (isAdmin !== true) return json({ error: MESSAGES.forbidden[1] }, 403, origin);

  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return json({ error: "Solicitud inválida" }, 400, origin);
  }
  if (!email || email.length > 254) return json({ error: MESSAGES.invalid_email[1] }, 400, origin);

  // 2) Registro/validación de la invitación en la BD (límites + auditoría).
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: prep, error: prepErr } = await admin.rpc("prepare_invitation", {
    p_email: email,
    p_admin: userData.user.id,
  });
  if (prepErr) return json({ error: "No se pudo preparar la invitación" }, 500, origin);
  const status = (prep as { status: string; pending_user: string | null }).status;
  if (status !== "ok") {
    const [code, msg] = MESSAGES[status] ?? [400, "No se pudo invitar"];
    return json({ error: msg }, code, origin);
  }

  // 3) Reenvío: si existía una cuenta pendiente (nunca usada) se recrea.
  const pending = (prep as { pending_user: string | null }).pending_user;
  if (pending) await admin.auth.admin.deleteUser(pending);

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_BY_ORIGIN[origin]}/accept-invite/`,
  });
  if (inviteErr) {
    // Si el correo no salió, la invitación no debe quedar vigente (evita pre-registros).
    await admin.rpc("cancel_invitation", { p_email: email });
    const limited = /rate limit/i.test(inviteErr.message);
    return json(
      { error: limited ? "Límite de correos de Supabase alcanzado. Intenta más tarde." : "No se pudo enviar el correo de invitación." },
      limited ? 429 : 502,
      origin
    );
  }
  return json({ ok: true }, 200, origin);
});
