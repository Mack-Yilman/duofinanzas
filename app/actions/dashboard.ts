"use server";

import { auth } from "@/auth";
import { getIncomes } from "@/lib/repos/incomes";
import { getExpenses } from "@/lib/repos/expenses";
import {
  calculateEquity,
  calculatePersonalLiquidity,
  calculateBalanceBreakdown,
} from "@/lib/domain/split";
import { getPeriodRange, isInPeriod } from "@/lib/domain/period";
import { getCategories } from "@/lib/repos/categories";
import { getUsersByCoupleId } from "@/lib/repos/users";
import { getCouple } from "@/lib/repos/couples";
import { getAllGoalContributions } from "@/lib/repos/goal-contributions";

export type DashboardView = "current" | "global";

export async function getDashboardData(opts?: { view?: DashboardView; offset?: number }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const coupleId = (session.user as any).coupleId;
  const currentUserId = session.user.id;
  if (!currentUserId || !coupleId) throw new Error("Invalid user session");

  const view: DashboardView = opts?.view === "global" ? "global" : "current";
  const offset = Number.isFinite(opts?.offset as number) ? (opts!.offset as number) : 0;

  // Lecturas de Notion en paralelo.
  const [incomes, allExpensesRaw, categories, users, couple, allContribs] = await Promise.all([
    getIncomes(),
    getExpenses(coupleId),
    getCategories(coupleId),
    getUsersByCoupleId(coupleId),
    getCouple(coupleId),
    getAllGoalContributions(),
  ]);

  const userIds = new Set(users.map((u) => u.id));
  const coupleContribs = allContribs.filter((c) => userIds.has(c.userId));

  // Gastos del usuario: compartidos + personales propios.
  const userExpenses = allExpensesRaw.filter((exp) => exp.isShared || exp.paidById === currentUserId);

  const equity = calculateEquity(incomes, "PEN", (a) => a);

  // Deuda (Estado de Cuentas): SIEMPRE sobre lo no liquidado, sin filtrar por periodo.
  const breakdown = calculateBalanceBreakdown(userExpenses, currentUserId, equity.userA);

  // Periodos según día de corte.
  const cutoffDay = couple.cutoffDay || 1;
  const now = new Date();
  const currentPeriod = getPeriodRange(cutoffDay, now, 0);
  const selectedPeriod = getPeriodRange(cutoffDay, now, offset);

  // Liquidez: SIEMPRE del periodo ACTUAL (lo disponible ahora).
  const periodIncomes = incomes.filter(
    (i) => i.isActive && (i.period === "monthly" || isInPeriod(i.effectiveDate, currentPeriod))
  );
  const currentPeriodExpenses = userExpenses.filter((e) => isInPeriod(e.date, currentPeriod));
  const currentPeriodContribs = coupleContribs
    .filter((c) => isInPeriod(c.date, currentPeriod))
    .map((c) => ({ userId: c.userId, amount: c.amount, currency: c.currency }));
  const liquidity = calculatePersonalLiquidity(
    periodIncomes,
    currentPeriodExpenses,
    currentUserId,
    equity.userA,
    couple.fxRate,
    currentPeriodContribs
  );

  // Lista + gráficos: periodo seleccionado (Mensual) o todo (Global).
  const statsExpenses =
    view === "global" ? userExpenses : userExpenses.filter((e) => isInPeriod(e.date, selectedPeriod));

  const userA = users.find((u) => u.id === equity.userA)?.name || "Usuario A";
  const userB = users.find((u) => u.id === equity.userB)?.name || "Usuario B";
  const partnerName = users.find((u) => u.id !== currentUserId)?.name || "Tu pareja";

  return {
    equity: { ...equity, nameA: userA, nameB: userB },
    expenses: statsExpenses.sort((a, b) => b.date.getTime() - a.date.getTime()),
    breakdown,
    liquidity,
    categories,
    users: users.map((u) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor })),
    currentUserId,
    partnerName,
    userAId: equity.userA,
    view,
    offset,
    periodLabel: selectedPeriod.label,
    currentPeriodLabel: currentPeriod.label,
    cutoffDay,
  };
}
