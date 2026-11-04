import { action, str, positiveNumber } from "./safe";
import { navigate } from "../nav";
import { requireCoupleUser } from "../session";
import { createIncome, deleteIncome } from "../repos/incomes";
import { CurrencySchema, IncomeTypeSchema, IncomePeriodSchema } from "../types";

export const addIncomeAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const dateStr = str(fd, "effectiveDate");
  await createIncome({
    name: str(fd, "name"),
    amount: positiveNumber(fd, "amount", "El monto"),
    currency: CurrencySchema.parse(str(fd, "currency") || "PEN"),
    type: IncomeTypeSchema.parse(str(fd, "type") || "salary"),
    period: IncomePeriodSchema.parse(str(fd, "period") || "monthly"),
    userId: me.id,
    isActive: true,
    effectiveDate: dateStr ? new Date(`${dateStr}T00:00:00`) : new Date(),
  });
  navigate("/income");
}, "Ingreso guardado");

export const deleteIncomeAction = action(async (fd: FormData) => {
  if (!confirm("¿Eliminar este ingreso?")) return;
  await deleteIncome(str(fd, "id"));
  return "Ingreso eliminado";
});
