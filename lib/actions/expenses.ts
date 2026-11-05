import { action, str, positiveNumber, optionalFile } from "./safe";
import { attachReceipt } from "./receipt-helpers";
import { receiptPathsFor, removeReceiptFiles } from "../repos/receipts";
import { navigate } from "../nav";
import { requireCoupleUser } from "../session";
import { getCoupleDataCached, type CoupleData } from "../couple-data";
import { createRecurring } from "../repos/recurring";
import { computeBudgets } from "../domain/budgets";
import { getPeriodRange } from "../domain/period";
import { nextMonthly } from "../domain/recurring";
import { toast } from "sonner";
import { createExpense, updateExpense, deleteExpense, settleExpense } from "../repos/expenses";
import { calculateEquity, calculateExpenseSplit } from "../domain/split";
import { convertSync, getRate } from "../domain/fx";
import { roundMoney, formatMoney } from "../domain/money";
import { CurrencySchema, SplitModeSchema } from "../types";
import type { Currency, SplitMode, User } from "../types";

const BASE_CURRENCY = "PEN";

export interface ExpenseDraft {
  name: string;
  amount: number;
  currency: Currency;
  date: Date;
  categoryId: string;
  isShared: boolean;
  splitMode: SplitMode;
}

/**
 * Monto base (PEN) + reparto de un gasto. Lo usan crear, editar y los gastos recurrentes,
 * así todos calculan igual el tipo de cambio y la proporción por ingresos.
 */
export async function computeExpenseFields(draft: ExpenseDraft, data: CoupleData, paidById: string) {
  const splitMode = draft.isShared ? draft.splitMode : "owner_100";
  const fxRateUsdPen = data.couple.fxRate;
  const rate = await getRate(draft.currency, BASE_CURRENCY, fxRateUsdPen);
  const amountBase = roundMoney(draft.amount * rate);

  const equity = calculateEquity(
    data.incomes,
    BASE_CURRENCY,
    (a, from, to) => convertSync(a, from, to, fxRateUsdPen),
    data.users.map((u) => u.id)
  );
  const { quotaA } = calculateExpenseSplit(amountBase, splitMode, equity.shareA, equity.shareB, undefined, undefined, paidById, equity.userA);
  const splitShareA = amountBase > 0 ? roundMoney((quotaA / amountBase) * 100) : 50;

  return {
    ...draft,
    splitMode,
    amountBase,
    fxRate: rate,
    fxDate: new Date(),
    splitShareA,
    splitShareB: roundMoney(100 - splitShareA),
  };
}

/** Lee y valida el formulario de gasto. */
function readDraft(fd: FormData): ExpenseDraft {
  const name = str(fd, "name");
  if (!name) throw new Error("La descripción es obligatoria");
  const amount = positiveNumber(fd, "amount", "El monto");
  const currency = CurrencySchema.parse(str(fd, "currency") || "PEN");
  const isShared = str(fd, "isShared") !== "false";
  const splitMode = isShared ? SplitModeSchema.parse(str(fd, "splitMode") || "proportional") : "owner_100";
  const dateStr = str(fd, "date");
  const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  return { name, amount, currency, date, categoryId: str(fd, "categoryId"), isShared, splitMode };
}

/** Avisa si el gasto deja su categoría al 80 % o más del presupuesto del periodo. */
async function warnBudget(me: User, categoryId: string) {
  if (!categoryId) return;
  const data = await getCoupleDataCached(me.coupleId, true);
  const period = getPeriodRange(data.couple.cutoffDay || 1);
  const visible = data.expenses.filter((e) => e.isShared || e.paidById === me.id);
  const st = computeBudgets(data.budgets, data.categories, visible, period).find((b) => b.categoryId === categoryId);
  if (!st || st.level === "ok") return;
  const msg = `${st.icon} ${st.name}: ${st.pct} % del presupuesto (${formatMoney(st.spent, "PEN")} de ${formatMoney(st.limit, "PEN")}).`;
  if (st.level === "over") toast.error(`Presupuesto superado · ${msg}`);
  else toast.warning(`Cerca del límite · ${msg}`);
}

export const createExpenseAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const draft = readDraft(fd);
  const fields = await computeExpenseFields(draft, await getCoupleDataCached(me.coupleId), me.id);
  const id = await createExpense({ ...fields, paidById: me.id, isSettled: false, notes: "" });
  await attachReceipt(optionalFile(fd, "receipt"), me.coupleId, { kind: "expense", expenseId: id });
  // "Repetir cada mes": crea la plantilla; el gasto de hoy ya quedó registrado.
  if (str(fd, "repeatMonthly") === "on") {
    const day = Math.min(draft.date.getDate(), 28);
    await createRecurring({
      name: draft.name,
      amount: draft.amount,
      currency: draft.currency,
      categoryId: draft.categoryId,
      paidById: me.id,
      splitMode: fields.splitMode,
      isShared: draft.isShared,
      dayOfMonth: day,
      nextDate: nextMonthly(draft.date, day),
    });
  }
  await warnBudget(me, draft.categoryId);
  navigate("/expenses");
}, "Gasto guardado");

export const updateExpenseAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const paidById = str(fd, "paidById") || me.id;
  const fields = await computeExpenseFields(readDraft(fd), await getCoupleDataCached(me.coupleId), paidById);
  await updateExpense(str(fd, "id"), fields);
  await attachReceipt(optionalFile(fd, "receipt"), me.coupleId, { kind: "expense", expenseId: str(fd, "id") });
  navigate("/expenses");
}, "Gasto actualizado");

export const deleteExpenseAction = action(async (fd: FormData) => {
  if (!confirm("¿Eliminar este gasto y sus constancias?")) return;
  const id = str(fd, "id");
  const paths = await receiptPathsFor({ expenseId: id });
  await deleteExpense(id);
  await removeReceiptFiles(paths);
  return "Gasto eliminado";
});

/** Marca como pagado; opcionalmente adjunta la constancia de la transferencia. */
export const settleExpenseAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const id = str(fd, "id");
  await settleExpense(id);
  await attachReceipt(optionalFile(fd, "receipt"), me.coupleId, { kind: "settlement", expenseId: id });
}, "Gasto marcado como pagado");
