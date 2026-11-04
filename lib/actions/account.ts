import { supabase, unwrap } from "../supabase/client";
import { queryClient } from "../query-client";
import { navigate } from "../nav";
import { requireUser } from "../session";
import { updateMyName } from "../repos/users";
import { removeReceiptFiles } from "../repos/receipts";
import { action, str } from "./safe";

/** Rectificación (ARCO): editar el nombre. */
export const updateNameAction = action(async (fd: FormData) => {
  const me = await requireUser();
  const name = str(fd, "name").slice(0, 80);
  if (!name) throw new Error("El nombre no puede estar vacío");
  await updateMyName(me.id, name);
}, "Nombre actualizado");

/** Acceso (ARCO): descarga en JSON de todos los datos visibles para el titular. */
export async function exportMyData() {
  const me = await requireUser();
  const { data: { user } } = await supabase.auth.getUser();
  const q = async (table: string) => unwrap(await supabase.from(table).select("*")) ?? [];
  const [profiles, couples, incomes, expenses, goals, contributions, categories, receipts] = await Promise.all([
    q("profiles"), q("couples"), q("incomes"), q("expenses"), q("goals"), q("goal_contributions"), q("categories"), q("receipts"),
  ]);
  const payload = {
    generado: new Date().toISOString(),
    nota: "Datos personales de tu cuenta en DúoFinanzas (Ley N.º 29733 – derecho de acceso). Incluye los datos compartidos con tu pareja.",
    cuenta: { id: me.id, email: user?.email, creada: user?.created_at, ultimo_acceso: user?.last_sign_in_at },
    perfiles: profiles, pareja: couples, ingresos: incomes, gastos: expenses, categorias: categories,
    metas: goals, aportes: contributions, constancias: receipts,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `duofinanzas-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Cancelación (ARCO): elimina la cuenta. Si eras el último miembro de la pareja,
 * primero se borran las imágenes de constancias del almacenamiento.
 */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const me = await requireUser();
  if (me.coupleId) {
    const members = unwrap(await supabase.from("profiles").select("id").eq("couple_id", me.coupleId)) ?? [];
    if (members.length <= 1) {
      const rows = unwrap(await supabase.from("receipts").select("path")) ?? [];
      await removeReceiptFiles(rows.map((r: { path: string }) => r.path));
    }
  }
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  queryClient.clear();
  navigate("/login");
  return {};
}
