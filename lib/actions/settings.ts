import { action, str, positiveNumber } from "./safe";
import { requireCoupleUser } from "../session";
import { updateCouple, updateCoupleCutoffDay } from "../repos/couples";
import { supabase } from "../supabase/client";

export const updateFxRateAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  await updateCouple(me.coupleId, positiveNumber(fd, "fxRate", "La tasa de cambio"));
}, "Tasa de cambio actualizada");

export const updateCutoffDayAction = action(async (fd: FormData) => {
  const me = await requireCoupleUser();
  const day = parseInt(str(fd, "cutoffDay"), 10);
  if (!Number.isFinite(day)) throw new Error("Día de corte inválido");
  await updateCoupleCutoffDay(me.coupleId, Math.min(Math.max(day, 1), 31));
}, "Día de corte actualizado");

export const changePasswordAction = action(async (fd: FormData) => {
  const password = str(fd, "password");
  if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
  if (password !== str(fd, "confirm")) throw new Error("Las contraseñas no coinciden");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}, "Contraseña actualizada");
