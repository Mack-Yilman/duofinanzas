import { toast } from "sonner";
import { queryClient } from "./query-client";
import { fetchCoupleData } from "./couple-data";
import { computeExpenseFields } from "./actions/expenses";
import { createExpense } from "./repos/expenses";
import { advanceRecurring } from "./repos/recurring";
import { dueOccurrences } from "./domain/recurring";
import type { User } from "./types";

let running: Promise<number> | null = null;

/**
 * Registra los gastos recurrentes vencidos (no hay servidor: lo hace el navegador al abrir la app).
 * Idempotente: el índice único (recurring_id, date) descarta el duplicado si la pareja abre la app
 * a la vez, y la próxima fecha solo avanza si nadie la avanzó antes. Una sola ejecución por carga.
 */
export function runRecurring(me: User): Promise<number> {
  running ??= materialize(me).catch(() => 0);
  return running;
}

async function materialize(me: User): Promise<number> {
  if (!me.coupleId) return 0;
  const data = await fetchCoupleData(me.coupleId);
  let created = 0;
  for (const t of data.recurring) {
    if (!t.isActive) continue;
    const { due, next } = dueOccurrences(t.nextDate, t.dayOfMonth);
    if (!due.length) continue;
    for (const date of due) {
      const fields = await computeExpenseFields(
        { name: t.name, amount: t.amount, currency: t.currency, date, categoryId: t.categoryId, isShared: t.isShared, splitMode: t.splitMode },
        data,
        t.paidById
      );
      try {
        await createExpense({ ...fields, paidById: t.paidById, isSettled: false, notes: "Gasto recurrente", recurringSourceId: t.id });
        created++;
      } catch (err) {
        // 23505 = ya lo registró la otra persona; cualquier otro error se reintenta en la próxima carga.
        if (!(err instanceof Error && /duplicate|23505/i.test(err.message))) throw err;
      }
    }
    await advanceRecurring(t.id, t.nextDate, next);
  }
  if (created > 0) {
    await queryClient.invalidateQueries();
    toast.success(created === 1 ? "Se registró 1 gasto recurrente" : `Se registraron ${created} gastos recurrentes`);
  }
  return created;
}
