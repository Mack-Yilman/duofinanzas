import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./query-client";
import { getIncomes } from "./repos/incomes";
import { getExpenses } from "./repos/expenses";
import { getCategories } from "./repos/categories";
import { getUsersByCoupleId } from "./repos/users";
import { getCouple } from "./repos/couples";
import { getAllGoalContributions } from "./repos/goal-contributions";
import { getCoupleReceipts } from "./repos/receipts";
import { getBudgets } from "./repos/budgets";
import { getRecurring } from "./repos/recurring";
import { getSettlements } from "./repos/settlements";
import { getCategoryRules } from "./repos/category-rules";

export const coupleDataKey = (coupleId: string) => ["couple-data", coupleId] as const;

/**
 * Todo lo que necesitan dashboard, gastos e ingresos en 11 consultas PARALELAS a
 * Postgres (antes: decenas de peticiones paginadas a Notion limitadas a ~3 req/s).
 * Cambiar de periodo o vista no vuelve a consultar: se recalcula en memoria.
 */
export async function fetchCoupleData(coupleId: string) {
  const [incomes, expenses, categories, users, couple, contributions, receipts, budgets, recurring, settlements, categoryRules] = await Promise.all([
    getIncomes(coupleId),
    getExpenses(coupleId),
    getCategories(coupleId),
    getUsersByCoupleId(coupleId),
    getCouple(coupleId),
    getAllGoalContributions(coupleId),
    getCoupleReceipts(coupleId),
    getBudgets(coupleId),
    getRecurring(coupleId),
    getSettlements(coupleId),
    getCategoryRules(coupleId),
  ]);
  return { incomes, expenses, categories, users, couple, contributions, receipts, budgets, recurring, settlements, categoryRules };
}

export type CoupleData = Awaited<ReturnType<typeof fetchCoupleData>>;

export function useCoupleData(coupleId: string | undefined) {
  return useQuery({
    queryKey: coupleDataKey(coupleId || "none"),
    queryFn: () => fetchCoupleData(coupleId!),
    enabled: !!coupleId,
  });
}

/** Datos de la pareja desde la caché; `fresh` fuerza releer (p. ej. tras guardar un gasto). */
export function getCoupleDataCached(coupleId: string, fresh = false) {
  return queryClient.fetchQuery({
    queryKey: coupleDataKey(coupleId),
    queryFn: () => fetchCoupleData(coupleId),
    ...(fresh ? { staleTime: 0 } : {}),
  });
}
