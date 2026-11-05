import { supabase, unwrap } from "../supabase/client";
import { toSettlement } from "./mappers";
import type { Settlement } from "../types";
import type { SettlementPlan } from "../domain/split";

export async function getSettlements(coupleId: string): Promise<Settlement[]> {
  const rows = unwrap(
    await supabase.from("settlements").select("*").eq("couple_id", coupleId).order("created_at", { ascending: false })
  );
  return (rows ?? []).map(toSettlement);
}

/**
 * Registra la liquidación y marca sus gastos como pagados en UNA transacción
 * (RPC `record_settlement`, SECURITY INVOKER: RLS aplica igual que desde la app).
 */
export async function recordSettlement(plan: SettlementPlan): Promise<string> {
  return unwrap(
    await supabase.rpc("record_settlement", {
      p_currency: plan.currency,
      p_from: plan.fromUserId,
      p_to: plan.toUserId,
      p_amount: plan.amount,
      p_expense_ids: plan.expenseIds,
    })
  ) as string;
}
