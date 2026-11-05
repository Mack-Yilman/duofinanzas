import { supabase, unwrap } from "../supabase/client";

export interface CoupleInfo {
  id: string;
  name: string;
  inviteCode: string;
  fxRate: number;
  cutoffDay: number;
}

export async function getCouple(id: string): Promise<CoupleInfo> {
  const r = unwrap(await supabase.from("couples").select("*").eq("id", id).single());
  return {
    id: r.id,
    name: r.name,
    inviteCode: r.invite_code,
    fxRate: Number(r.fx_rate) || 3.8,
    cutoffDay: r.cutoff_day || 1,
  };
}

export async function createCouple(name: string): Promise<string> {
  return unwrap(await supabase.rpc("create_couple", { p_name: name })) as string;
}

/**
 * La RPC devuelve NULL (sin error) si el código no existe o la pareja está completa: el mismo
 * mensaje para ambos casos no revela qué códigos son válidos. Tras 10 intentos/hora la BD bloquea.
 */
export async function joinCouple(inviteCode: string): Promise<string> {
  const id = unwrap(await supabase.rpc("join_couple", { p_code: inviteCode })) as string | null;
  if (!id) throw new Error("Código inválido o la pareja ya está completa.");
  return id;
}

export async function updateCouple(id: string, fxRate: number) {
  unwrap(await supabase.from("couples").update({ fx_rate: fxRate }).eq("id", id));
}

export async function updateCoupleCutoffDay(id: string, cutoffDay: number) {
  unwrap(await supabase.from("couples").update({ cutoff_day: cutoffDay }).eq("id", id));
}
