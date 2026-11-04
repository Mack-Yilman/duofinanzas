import { action, str, positiveNumber, optionalFile } from "./safe";
import { attachReceipt } from "./receipt-helpers";
import { receiptPathsFor, removeReceiptFiles } from "../repos/receipts";
import { navigate } from "../nav";
import { requireCoupleUser } from "../session";
import { getCoupleDataCached } from "../couple-data";
import { createGoal, deleteGoal, getGoal, updateGoal } from "../repos/goals";
import { createGoalContribution, deleteGoalContribution, getGoalContributions } from "../repos/goal-contributions";
import { getRate } from "../domain/fx";
import { roundMoney } from "../domain/money";
import { CurrencySchema } from "../types";

export const addGoalAction = action(async (fd: FormData) => {
  await requireCoupleUser();
  const dateStr = str(fd, "targetDate");
  await createGoal({
    name: str(fd, "name"),
    targetAmount: positiveNumber(fd, "targetAmount", "El monto objetivo"),
    currency: CurrencySchema.parse(str(fd, "currency") || "PEN"),
    targetDate: dateStr ? new Date(`${dateStr}T00:00:00`) : undefined,
    icon: str(fd, "icon") || "🎯",
    contributionMode: "proportional",
  });
  navigate("/goals");
}, "Meta creada");

export const updateGoalAction = action(async (fd: FormData) => {
  await updateGoal(str(fd, "id"), {
    name: str(fd, "name"),
    targetAmount: positiveNumber(fd, "targetAmount", "El monto objetivo"),
    currency: CurrencySchema.parse(str(fd, "currency") || "PEN"),
    icon: str(fd, "icon"),
  });
  navigate("/goals");
}, "Meta actualizada");

export const deleteGoalAction = action(async (fd: FormData) => {
  if (!confirm("¿Eliminar esta meta, su historial de aportes y sus constancias?")) return;
  const id = str(fd, "id");
  const contributions = await getGoalContributions(id);
  const paths = await receiptPathsFor({ contributionIds: contributions.map((c) => c.id) });
  await deleteGoal(id);
  await removeReceiptFiles(paths);
  return "Meta eliminada";
});

/** El aporte se guarda en la moneda de la meta; un trigger suma current_amount. */
export const contributeToGoalAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const goal = await getGoal(str(fd, "id"));
  const contribution = positiveNumber(fd, "contribution", "El aporte");
  const from = CurrencySchema.parse(str(fd, "contributionCurrency") || goal.currency);
  const { couple } = await getCoupleDataCached(me.coupleId);
  const rate = await getRate(from, goal.currency, couple.fxRate);

  const contributionId = await createGoalContribution({
    name: `Aporte de ${me.name || "Usuario"}`,
    goalId: goal.id,
    userId: me.id,
    amount: roundMoney(contribution * rate),
    currency: goal.currency,
    date: new Date(),
  });
  await attachReceipt(optionalFile(fd, "receipt"), me.coupleId, { kind: "goal_contribution", contributionId });
}, "Aporte registrado");

export const deleteContributionAction = action(async (fd: FormData) => {
  if (!confirm("¿Eliminar este aporte y sus constancias?")) return;
  const id = str(fd, "id");
  const paths = await receiptPathsFor({ contributionIds: [id] });
  await deleteGoalContribution(id);
  await removeReceiptFiles(paths);
  return "Aporte eliminado";
});
