import type { Category, Expense, Goal, GoalContribution, Income } from "../types";
import { isInPeriod, type PeriodRange } from "./period";
import { roundMoney } from "./money";

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Variación porcentual; null si no hay base de comparación. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Días del periodo (end exclusivo) y días transcurridos hasta hoy incluido. */
export function periodDays(period: PeriodRange, now: Date = new Date()) {
  const total = Math.round((period.end.getTime() - period.start.getTime()) / DAY);
  const elapsed = Math.min(total, Math.max(0, Math.floor((startOfDay(now).getTime() - period.start.getTime()) / DAY) + 1));
  return { total, elapsed };
}

const sumBase = (xs: Expense[]) => roundMoney(xs.reduce((s, e) => s + e.amountBase, 0));

/** E1 · Total y top categorías del periodo frente al anterior (PEN). */
export function comparePeriods(expenses: Expense[], categories: Category[], current: PeriodRange, previous: PeriodRange, top = 5) {
  const cur = expenses.filter((e) => isInPeriod(e.date, current));
  const prev = expenses.filter((e) => isInPeriod(e.date, previous));
  const byCat = (xs: Expense[]) => {
    const m = new Map<string, number>();
    for (const e of xs) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amountBase);
    return m;
  };
  const curCat = byCat(cur);
  const prevCat = byCat(prev);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const byCategory = [...curCat.entries()]
    .map(([id, amount]) => {
      const c = catById.get(id);
      const before = roundMoney(prevCat.get(id) ?? 0);
      return { id, name: c ? `${c.icon} ${c.name}` : "Sin categoría", amount: roundMoney(amount), previous: before, deltaPct: deltaPct(amount, before) };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, top);
  const total = sumBase(cur);
  const prevTotal = sumBase(prev);
  return { total, prevTotal, deltaPct: deltaPct(total, prevTotal), byCategory };
}

/** E2 · Proyección lineal al cierre del periodo según el ritmo diario actual. */
export function projectPeriod(spent: number, period: PeriodRange, now: Date = new Date(), budgetTotal = 0) {
  const { total, elapsed } = periodDays(period, now);
  const projected = elapsed > 0 ? roundMoney((spent / elapsed) * total) : 0;
  return {
    projected,
    dailyAvg: elapsed > 0 ? roundMoney(spent / elapsed) : 0,
    daysElapsed: elapsed,
    daysTotal: total,
    budgetTotal,
    pctOfBudget: budgetTotal > 0 ? Math.round((projected / budgetTotal) * 100) : null,
  };
}

/**
 * E3 · Tasa de ahorro del periodo (PEN).
 *  - Personal: (mis ingresos − mi cuota de lo compartido − mis gastos personales) / mis ingresos.
 *  - Pareja:   (ingresos de ambos − gastos compartidos) / ingresos de ambos.
 * Los aportes a metas cuentan como ahorro (no como gasto). `toPen` convierte ingresos.
 */
export function savingsRate(
  incomes: Income[],
  expenses: Expense[],
  me: string,
  userAId: string,
  period: PeriodRange,
  toPen: (amount: number, currency: string) => number
) {
  const inPeriodIncome = incomes.filter((i) => i.isActive && (i.period === "monthly" || isInPeriod(i.effectiveDate, period)));
  const myIncome = inPeriodIncome.filter((i) => i.userId === me).reduce((s, i) => s + toPen(i.amount, i.currency), 0);
  const coupleIncome = inPeriodIncome.reduce((s, i) => s + toPen(i.amount, i.currency), 0);
  const pe = expenses.filter((e) => isInPeriod(e.date, period));
  const shared = pe.filter((e) => e.isShared);
  const myShareOfShared = shared.reduce((s, e) => s + e.amountBase * ((me === userAId ? e.splitShareA : e.splitShareB) / 100), 0);
  const myPersonal = pe.filter((e) => !e.isShared && e.paidById === me).reduce((s, e) => s + e.amountBase, 0);
  const rate = (inc: number, out: number) => (inc > 0 ? Math.round(((inc - out) / inc) * 100) : null);
  return {
    me: { income: roundMoney(myIncome), spent: roundMoney(myShareOfShared + myPersonal), rate: rate(myIncome, myShareOfShared + myPersonal) },
    couple: { income: roundMoney(coupleIncome), spent: sumBase(shared), rate: rate(coupleIncome, sumBase(shared)) },
  };
}

/**
 * E4 · Fecha estimada para completar una meta según el promedio mensual de aportes
 * de los últimos 3 meses (en la moneda de la meta).
 */
export function goalEta(goal: Goal, contributions: GoalContribution[], now: Date = new Date()) {
  const remaining = roundMoney(goal.targetAmount - goal.currentAmount);
  if (remaining <= 0) return { status: "done" as const };
  const since = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const recent = contributions.filter((c) => c.goalId === goal.id && c.currency === goal.currency && c.date >= since && c.date <= now);
  const monthly = recent.reduce((s, c) => s + c.amount, 0) / 3;
  if (monthly <= 0) return { status: "no_pace" as const, remaining };
  const months = remaining / monthly;
  const eta = new Date(now.getTime() + months * 30.44 * DAY);
  const late = !!goal.targetDate && eta.getTime() > goal.targetDate.getTime();
  return { status: "eta" as const, eta, monthly: roundMoney(monthly), remaining, months: Math.ceil(months), late };
}

/** M2 · Gasto acumulado por día del periodo (día 1..N), opcionalmente cortado en hoy. */
export function dailyCumulative(expenses: Expense[], period: PeriodRange, until?: Date): number[] {
  const { total } = periodDays(period);
  const perDay = new Array<number>(total).fill(0);
  for (const e of expenses) {
    if (!isInPeriod(e.date, period)) continue;
    const i = Math.floor((startOfDay(e.date).getTime() - period.start.getTime()) / DAY);
    if (i >= 0 && i < total) perDay[i] += e.amountBase;
  }
  const lastIdx = until ? periodDays(period, until).elapsed : total;
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < lastIdx; i++) {
    acc += perDay[i];
    out.push(roundMoney(acc));
  }
  return out;
}

/** Serie para el gráfico: periodo actual (hasta hoy) frente al anterior, por día. */
export function evolutionSeries(expenses: Expense[], current: PeriodRange, previous: PeriodRange, now: Date = new Date()) {
  const cur = dailyCumulative(expenses, current, now);
  const prev = dailyCumulative(expenses, previous);
  const days = Math.max(periodDays(current).total, prev.length);
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    actual: i < cur.length ? cur[i] : null,
    anterior: i < prev.length ? prev[i] : null,
  }));
}
