import { supabase, unwrap } from "../supabase/client";
import { compressReceipt, validateReceipt } from "../image";

export type ReceiptKind = "expense" | "settlement" | "goal_contribution";

export interface Receipt {
  id: string;
  kind: ReceiptKind;
  expenseId: string | null;
  contributionId: string | null;
  path: string;
  uploadedBy: string | null;
  createdAt: Date;
}

const BUCKET = "receipts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const toReceipt = (r: any): Receipt => ({
  id: r.id,
  kind: r.kind,
  expenseId: r.expense_id,
  contributionId: r.contribution_id,
  path: r.path,
  uploadedBy: r.uploaded_by,
  createdAt: new Date(r.created_at),
});

export async function getCoupleReceipts(coupleId: string): Promise<Receipt[]> {
  const rows = unwrap(
    await supabase.from("receipts").select("*").eq("couple_id", coupleId).order("created_at", { ascending: false })
  );
  return (rows ?? []).map(toReceipt);
}

/** Comprime, sube a `<couple_id>/<uuid>.<ext>` y registra la constancia. */
export async function uploadReceipt(
  file: File,
  coupleId: string,
  target: { kind: ReceiptKind; expenseId?: string; contributionId?: string }
) {
  const invalid = validateReceipt(file);
  if (invalid) throw new Error(invalid);
  const { blob, type, ext } = await compressReceipt(file);
  const path = `${coupleId}/${crypto.randomUUID()}.${ext}`;

  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false });
  if (up.error) throw new Error(`No se pudo subir la constancia: ${up.error.message}`);

  const res = await supabase.from("receipts").insert({
    kind: target.kind,
    expense_id: target.expenseId ?? null,
    contribution_id: target.contributionId ?? null,
    path,
  });
  if (res.error) {
    await supabase.storage.from(BUCKET).remove([path]); // no dejar archivos huérfanos
    throw new Error(res.error.message);
  }
}

/** URLs firmadas de corta duración (5 min): el bucket es privado. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 300);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

/** Borra los archivos de Storage (la API es obligatoria: SQL no puede borrar objetos). */
export async function removeReceiptFiles(paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function deleteReceipt(r: Receipt) {
  unwrap(await supabase.from("receipts").delete().eq("id", r.id));
  await removeReceiptFiles([r.path]);
}

/** Rutas de constancias asociadas a gastos o aportes (para limpiar antes de borrar). */
export async function receiptPathsFor(filter: { expenseId?: string; contributionIds?: string[] }) {
  let q = supabase.from("receipts").select("path");
  if (filter.expenseId) q = q.eq("expense_id", filter.expenseId);
  else if (filter.contributionIds?.length) q = q.in("contribution_id", filter.contributionIds);
  else return [];
  const rows = unwrap(await q);
  return (rows ?? []).map((r: { path: string }) => r.path);
}
