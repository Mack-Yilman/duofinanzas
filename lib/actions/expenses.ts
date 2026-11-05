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
import { deferDelete } from "../undo";
import { createExpense, createExpenses, updateExpense, deleteExpense } from "../repos/expenses";
import { recordSettlement } from "../repos/settlements";
import type { ImportRow } from "../domain/import";
import { buildSettlements, calculateEquity, calculateExpenseSplit } from "../domain/split";
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
async function warnBudget(me: User, categoryId: string, isShared: boolean) {
  if (!categoryId) return;
  const data = await getCoupleDataCached(me.coupleId, true);
  const period = getPeriodRange(data.couple.cutoffDay || 1);
  const visible = data.expenses.filter((e) => e.isShared || e.paidById === me.id);
  const st = computeBudgets(data.budgets, data.categories, visible, period).find((b) => b.categoryId === categoryId && b.personal === !isShared);
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
  await warnBudget(me, draft.categoryId, draft.isShared);
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

/** Eliminar con "Deshacer" (5 s): las constancias se borran solo al confirmarse. */
export async function deleteExpenseAction(fd: FormData) {
  const id = str(fd, "id");
  deferDelete({
    id,
    label: "Gasto eliminado",
    commit: async () => {
      const paths = await receiptPathsFor({ expenseId: id });
      await deleteExpense(id);
      await removeReceiptFiles(paths);
    },
  });
}

/**
 * Registra en el historial la liquidación de los gastos indicados (una fila por moneda) y los
 * marca como pagados. Devuelve los planes registrados.
 */
async function settle(data: CoupleData, me: User, expenseIds: string[]) {
  const partner = data.users.find((u) => u.id !== me.id);
  if (!partner) throw new Error("Tu pareja aún no se ha unido");
  const userAId = calculateEquity(
    data.incomes,
    BASE_CURRENCY,
    (a, from, to) => convertSync(a, from, to, data.couple.fxRate),
    data.users.map((u) => u.id)
  ).userA;
  const wanted = new Set(expenseIds);
  const plans = buildSettlements(data.expenses.filter((e) => wanted.has(e.id)), me.id, partner.id, userAId);
  for (const p of plans) await recordSettlement(p);
  return plans;
}

/** Marca como pagado; opcionalmente adjunta la constancia de la transferencia. */
export const settleExpenseAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const id = str(fd, "id");
  const data = await getCoupleDataCached(me.coupleId, true);
  if (!(await settle(data, me, [id])).length) return "Este gasto ya estaba liquidado";
  await attachReceipt(optionalFile(fd, "receipt"), me.coupleId, { kind: "settlement", expenseId: id });
}, "Gasto marcado como pagado");

/**
 * Liquidar todo: registra la liquidación (por moneda) de todos los gastos compartidos pendientes.
 * La constancia (opcional) se asocia al gasto pendiente más reciente, porque cada constancia
 * de liquidación pertenece a un gasto.
 */
export const settleAllAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const data = await getCoupleDataCached(me.coupleId, true);
  const pending = data.expenses.filter((e) => e.isShared && !e.isSettled).sort((a, b) => b.date.getTime() - a.date.getTime());
  if (!pending.length) return "No hay gastos pendientes";
  await settle(data, me, pending.map((e) => e.id));
  await attachReceipt(optionalFile(fd, "receipt"), me.coupleId, { kind: "settlement", expenseId: pending[0].id });
  return pending.length === 1 ? "1 gasto liquidado" : `${pending.length} gastos liquidados`;
});

/**
 * Importa filas ya validadas (ver lib/domain/import.ts) con el mismo cálculo de tipo de cambio
 * y reparto que un gasto manual. Los gastos personales se asignan siempre a quien importa.
 */
export async function importExpenses(rows: ImportRow[]): Promise<number> {
  const me = await requireCoupleUser();
  const data = await getCoupleDataCached(me.coupleId, true);
  const list = [];
  for (const r of rows) {
    const paidBy = r.isShared ? (r.payerId ?? me.id) : me.id;
    const fields = await computeExpenseFields(
      { name: r.name, amount: r.amount, currency: r.currency, date: r.date, categoryId: r.categoryId, isShared: r.isShared, splitMode: "proportional" },
      data,
      paidBy
    );
    list.push({ ...fields, paidById: paidBy, isSettled: false, notes: "Importado desde CSV" });
  }
  await createExpenses(list);
  return list.length;
}

