import { action, str, positiveNumber } from "./safe";
import { navigate } from "../nav";
import { deferDelete } from "../undo";
import { requireCoupleUser } from "../session";
import { createIncome, deleteIncome, updateIncome } from "../repos/incomes";
import { CurrencySchema, IncomeTypeSchema, IncomePeriodSchema } from "../types";

export const addIncomeAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  await createIncome({ ...readIncome(fd), userId: me.id, isActive: true });
  navigate("/income");
}, "Ingreso guardado");

/** Lee los campos comunes del formulario de ingreso. */
function readIncome(fd: FormData) {
  const name = str(fd, "name");
  if (!name) throw new Error("La descripción es obligatoria");
  const dateStr = str(fd, "effectiveDate");
  return {
    name,
    amount: positiveNumber(fd, "amount", "El monto"),
    currency: CurrencySchema.parse(str(fd, "currency") || "PEN"),
    type: IncomeTypeSchema.parse(str(fd, "type") || "salary"),
    period: IncomePeriodSchema.parse(str(fd, "period") || "monthly"),
    effectiveDate: dateStr ? new Date(`${dateStr}T00:00:00`) : new Date(),
  };
}

export const updateIncomeAction = action(async (fd: FormData) => {
  await requireCoupleUser();
  await updateIncome(str(fd, "id"), { ...readIncome(fd), isActive: str(fd, "isActive") === "on" });
  navigate("/income");
}, "Ingreso actualizado");

/** Eliminar con "Deshacer" (5 s). */
export async function deleteIncomeAction(fd: FormData) {
  const id = str(fd, "id");
  deferDelete({ id, label: "Ingreso eliminado", commit: () => deleteIncome(id) });
}
