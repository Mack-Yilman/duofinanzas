import { CurrencySchema, SplitModeSchema, IncomeTypeSchema, IncomePeriodSchema, GoalContributionModeSchema, CategoryKindSchema, UserRoleSchema } from "../types";
import type { Category, Expense, Goal, GoalContribution, Income, User } from "../types";
import { parseLocalDate } from "../domain/dates";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const pick = <T extends string>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, v: unknown, fallback: T): T => {
  const r = schema.safeParse(v);
  return r.success ? (r.data as T) : fallback;
};
const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export const toUser = (r: Row): User => ({
  id: r.id,
  name: r.name ?? "",
  email: r.email ?? "",
  avatarColor: r.avatar_color ?? "indigo",
  coupleId: r.couple_id ?? "",
  role: pick(UserRoleSchema, r.role, "member"),
  createdAt: new Date(r.created_at ?? Date.now()),
});

export const toCategory = (r: Row): Category => ({
  id: r.id,
  name: r.name,
  icon: r.icon ?? "🏷️",
  color: r.color ?? "blue",
  kind: pick(CategoryKindSchema, r.kind, "shared"),
  coupleId: r.couple_id,
  isArchived: !!r.is_archived,
});

export const toIncome = (r: Row): Income => ({
  id: r.id,
  name: r.name,
  userId: r.user_id,
  amount: num(r.amount),
  currency: pick(CurrencySchema, r.currency, "PEN"),
  type: pick(IncomeTypeSchema, r.type, "salary"),
  period: pick(IncomePeriodSchema, r.period, "monthly"),
  effectiveDate: parseLocalDate(r.effective_date),
  isActive: !!r.is_active,
  notes: r.notes ?? "",
});

export const toExpense = (r: Row): Expense => ({
  id: r.id,
  name: r.name,
  amount: num(r.amount),
  currency: pick(CurrencySchema, r.currency, "PEN"),
  amountBase: num(r.amount_base),
  fxRate: num(r.fx_rate) || 1,
  fxDate: parseLocalDate(r.fx_date),
  date: parseLocalDate(r.date),
  categoryId: r.category_id ?? "",
  paidById: r.paid_by ?? "",
  splitMode: pick(SplitModeSchema, r.split_mode, "proportional"),
  splitShareA: num(r.split_share_a),
  splitShareB: num(r.split_share_b),
  isShared: !!r.is_shared,
  isSettled: !!r.is_settled,
  notes: r.notes ?? "",
  createdById: r.created_by ?? "",
  createdAt: new Date(r.created_at ?? Date.now()),
});

export const toGoal = (r: Row): Goal => ({
  id: r.id,
  name: r.name,
  targetAmount: num(r.target_amount),
  currentAmount: num(r.current_amount),
  currency: pick(CurrencySchema, r.currency, "PEN"),
  targetDate: parseLocalDate(r.target_date),
  contributionMode: pick(GoalContributionModeSchema, r.contribution_mode, "proportional"),
  icon: r.icon ?? "🎯",
  coupleId: r.couple_id,
  isAchieved: !!r.is_achieved,
});

export const toGoalContribution = (r: Row): GoalContribution => ({
  id: r.id,
  name: r.name ?? "Aporte",
  goalId: r.goal_id,
  userId: r.user_id,
  amount: num(r.amount),
  currency: pick(CurrencySchema, r.currency, "PEN"),
  date: parseLocalDate(r.date),
});
