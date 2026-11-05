import { action, str, positiveNumber } from "./safe";
import { requireCoupleUser } from "../session";
import { createRecurring, deleteRecurring, setRecurringActive } from "../repos/recurring";
import { firstOccurrence } from "../domain/recurring";
import { CurrencySchema, SplitModeSchema } from "../types";

export const createRecurringAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const name = str(fd, "name");
  if (!name) throw new Error("La descripción es obligatoria");
  const day = Number(str(fd, "dayOfMonth"));
  if (!Number.isInteger(day) || day < 1 || day > 28) throw new Error("El día debe estar entre 1 y 28");
  const isShared = str(fd, "isShared") !== "false";
  await createRecurring({
    name,
    amount: positiveNumber(fd, "amount", "El monto"),
    currency: CurrencySchema.parse(str(fd, "currency") || "PEN"),
    categoryId: str(fd, "categoryId"),
    paidById: me.id,
    splitMode: isShared ? SplitModeSchema.parse(str(fd, "splitMode") || "proportional") : "owner_100",
    isShared,
    dayOfMonth: day,
    nextDate: firstOccurrence(day, new Date()),
  });
}, "Gasto recurrente creado");

export const toggleRecurringAction = action(async (fd: FormData) => {
  const active = str(fd, "active") === "true";
  // Al reactivar se recalcula la próxima fecha para no generar los meses en pausa.
  const day = Number(str(fd, "dayOfMonth"));
  await setRecurringActive(str(fd, "id"), active, active ? firstOccurrence(day, new Date()) : undefined);
  return active ? "Gasto recurrente reactivado" : "Gasto recurrente en pausa";
});

export const deleteRecurringAction = action(async (fd: FormData) => {
  if (!confirm("¿Eliminar este gasto recurrente? Los gastos ya registrados se conservan.")) return;
  await deleteRecurring(str(fd, "id"));
  return "Gasto recurrente eliminado";
});
