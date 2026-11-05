import { action, str } from "./safe";
import { requireCoupleUser } from "../session";
import { deleteBudget, upsertBudget } from "../repos/budgets";

/**
 * Guarda el presupuesto de una categoría; vacío o 0 lo elimina.
 * `scope=personal` lo guarda como presupuesto personal (solo cuenta y ve tus gastos personales).
 */
export const saveBudgetAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const categoryId = str(fd, "categoryId");
  const userId = str(fd, "scope") === "personal" ? me.id : undefined;
  const raw = str(fd, "amount");
  const amount = raw ? Number(raw) : 0;
  if (!Number.isFinite(amount) || amount < 0 || amount >= 1e9) throw new Error("El presupuesto debe ser un número positivo");
  if (amount === 0) {
    await deleteBudget(categoryId, userId);
    return "Presupuesto eliminado";
  }
  await upsertBudget(me.coupleId, categoryId, Math.round(amount * 100) / 100, userId);
  return userId ? "Presupuesto personal guardado" : "Presupuesto guardado";
});
