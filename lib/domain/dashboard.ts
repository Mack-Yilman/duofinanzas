import type { CoupleData } from "../couple-data";
import { calculateEquity, calculatePersonalLiquidity, calculateBalanceBreakdown } from "./split";
import { getPeriodRange, isInPeriod, daysUntilEnd, SETTLE_REMINDER_DAYS } from "./period";
import { computeBudgets } from "./budgets";
import { comparePeriods, evolutionSeries, projectPeriod, savingsRate } from "./stats";
import { convertSync } from "./fx";

export type DashboardView = "current" | "global";

/** Cálculo puro del dashboard (antes vivía en un Server Action). */
export function computeDashboard(
  data: CoupleData,
  currentUserId: string,
  opts: { view?: DashboardView; offset?: number } = {},
  now: Date = new Date()
) {
  const view: DashboardView = opts.view === "global" ? "global" : "current";
  const offset = Number.isFinite(opts.offset) ? (opts.offset as number) : 0;
  const { incomes, expenses, categories, users, couple, contributions } = data;
  const fxRate = couple.fxRate;

  const memberIds = users.map((u) => u.id);
  const userIds = new Set(memberIds);
  const coupleContribs = contributions.filter((c) => userIds.has(c.userId));

  // Gastos visibles para el usuario: compartidos + personales propios.
  const userExpenses = expenses.filter((e) => e.isShared || e.paidById === currentUserId);

  const equity = calculateEquity(incomes, "PEN", (a, from, to) => convertSync(a, from, to, fxRate), memberIds);

  // Estado de cuentas: siempre sobre lo no liquidado, sin filtrar por periodo.
  const breakdown = calculateBalanceBreakdown(userExpenses, currentUserId, equity.userA);

  const cutoffDay = couple.cutoffDay || 1;
  const currentPeriod = getPeriodRange(cutoffDay, now, 0);
  const selectedPeriod = getPeriodRange(cutoffDay, now, offset);

  // Liquidez: siempre del periodo actual.
  const periodIncomes = incomes.filter(
    (i) => i.isActive && (i.period === "monthly" || isInPeriod(i.effectiveDate, currentPeriod))
  );
  const liquidity = calculatePersonalLiquidity(
    periodIncomes,
    userExpenses.filter((e) => isInPeriod(e.date, currentPeriod)),
    currentUserId,
    equity.userA,
    fxRate,
    coupleContribs
      .filter((c) => isInPeriod(c.date, currentPeriod))
      .map((c) => ({ userId: c.userId, amount: c.amount, currency: c.currency }))
  );

  const statsExpenses =
    view === "global" ? userExpenses : userExpenses.filter((e) => isInPeriod(e.date, selectedPeriod));

  const nameOf = (id: string, fallback: string) => users.find((u) => u.id === id)?.name || fallback;

  // Índices para la UI (evita búsquedas repetidas en cada tarjeta).
  const receiptsByExpense: Record<string, CoupleData["receipts"]> = {};
  for (const r of data.receipts ?? []) {
    if (r.expenseId) (receiptsByExpense[r.expenseId] ??= []).push(r);
  }
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));

  // Estadísticas del periodo seleccionado frente al anterior (en "global", el periodo actual).
  function computeStats() {
    const base = view === "global" ? currentPeriod : selectedPeriod;
    const previous = getPeriodRange(cutoffDay, base.start, -1);
    const isCurrent = base.start.getTime() === currentPeriod.start.getTime();
    const comparison = comparePeriods(userExpenses, categories, base, previous);
    const budgetTotal = (data.budgets ?? []).reduce((s, b) => s + b.amount, 0);
    return {
      comparison,
      previousLabel: previous.label,
      projection: isCurrent ? projectPeriod(comparison.total, base, now, budgetTotal) : null,
      savings: savingsRate(incomes, userExpenses, currentUserId, equity.userA, base, (a, c) => convertSync(a, c, "PEN", fxRate)),
      evolution: evolutionSeries(userExpenses, base, previous, now),
    };
  }

  return {
    equity: { ...equity, nameA: nameOf(equity.userA, "Usuario A"), nameB: nameOf(equity.userB, "Usuario B") },
    expenses: [...statsExpenses].sort((a, b) => b.date.getTime() - a.date.getTime()),
    breakdown,
    liquidity,
    categories,
    users,
    currentUserId,
    partnerName: users.find((u) => u.id !== currentUserId)?.name || "Tu pareja",
    userAId: equity.userA,
    view,
    offset,
    periodLabel: selectedPeriod.label,
    currentPeriodLabel: currentPeriod.label,
    cutoffDay,
    receiptsByExpense,
    categoryById,
    names,
    stats: computeStats(),
    pendingCount: userExpenses.filter((e) => e.isShared && !e.isSettled).length,
    // Presupuestos: siempre del periodo actual.
    budgets: computeBudgets(data.budgets ?? [], categories, userExpenses, currentPeriod),
    settleReminder: settleReminder(breakdown, currentPeriod, now),
  };
}

/** Aviso de liquidación: faltan pocos días para el cierre y hay saldos pendientes. */
function settleReminder(
  breakdown: Record<string, { owedToYou: number; youOwe: number }>,
  period: ReturnType<typeof getPeriodRange>,
  now: Date
) {
  const daysLeft = daysUntilEnd(period, now);
  const pending = Object.values(breakdown).some((b) => b.owedToYou > 0 || b.youOwe > 0);
  return pending && daysLeft <= SETTLE_REMINDER_DAYS ? { daysLeft } : null;
}
