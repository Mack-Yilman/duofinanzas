import { action, str, positiveNumber, optionalFile } from "./safe";
import { attachReceipt } from "./receipt-helpers";
import { receiptPathsFor, removeReceiptFiles } from "../repos/receipts";
import { navigate } from "../nav";
import { requireCoupleUser } from "../session";
import { getCoupleDataCached } from "../couple-data";
import { createExpense, updateExpense, deleteExpense, settleExpense } from "../repos/expenses";
import { calculateEquity, calculateExpenseSplit } from "../domain/split";
import { convertSync, getRate } from "../domain/fx";
import { roundMoney } from "../domain/money";
import { CurrencySchema, SplitModeSchema } from "../types";
import type { User } from "../types";

const BASE_CURRENCY = "PEN";

/**
 * Lee el formulario y calcula monto base + reparto. Se usa tanto al crear como al
 * EDITAR (antes la edición guardaba amountBase = amount y no recalculaba el split).
 */
async function buildExpense(fd: FormData, me: User, paidById: string) {
  const name = str(fd, "name");
  if (!name) throw new Error("La descripción es obligatoria");
  const amount = positiveNumber(fd, "amount", "El monto");
  const currency = CurrencySchema.parse(str(fd, "currency") || "PEN");
  const isShared = str(fd, "isShared") !== "false";
  const splitMode = isShared ? SplitModeSchema.parse(str(fd, "splitMode") || "proportional") : "owner_100";
  const dateStr = str(fd, "date");
  const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();

  const data = await getCoupleDataCached(me.coupleId);
  const fxRateUsdPen = data.couple.fxRate;
  const rate = await getRate(currency, BASE_CURRENCY, fxRateUsdPen);
  const amountBase = roundMoney(amount * rate);

  const equity = calculateEquity(
    data.incomes,
    BASE_CURRENCY,
    (a, from, to) => convertSync(a, from, to, fxRateUsdPen),
    data.users.map((u) => u.id)
  );
  const { quotaA } = calculateExpenseSplit(amountBase, splitMode, equity.shareA, equity.shareB, undefined, undefined, paidById, equity.userA);
  const splitShareA = amountBase > 0 ? roundMoney((quotaA / amountBase) * 100) : 50;

  return {
    name,
    amount,
    currency,
    amountBase,
    fxRate: rate,
    fxDate: new Date(),
    date,
    categoryId: str(fd, "categoryId"),
    splitMode,
    splitShareA,
    splitShareB: roundMoney(100 - splitShareA),
    isShared,
  };
}

export const createExpenseAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const fields = await buildExpense(fd, me, me.id);
  const id = await createExpense({ ...fields, paidById: me.id, isSettled: false, notes: "" });
  await attachReceipt(optionalFile(fd, "receipt"), me.coupleId, { kind: "expense", expenseId: id });
  navigate("/expenses");
}, "Gasto guardado");

export const updateExpenseAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const paidById = str(fd, "paidById") || me.id;
  const fields = await buildExpense(fd, me, paidById);
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
