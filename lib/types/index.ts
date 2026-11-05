import { z } from "zod";

// ISO 4217 Currency Codes
export const CurrencySchema = z.enum(["PEN", "USD", "EUR"]); // Extensible as needed
export type Currency = z.infer<typeof CurrencySchema>;

export const SplitModeSchema = z.enum(["proportional", "equal", "custom", "owner_100"]);
export type SplitMode = z.infer<typeof SplitModeSchema>;

export const UserRoleSchema = z.enum(["owner", "member"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Couples
export const CoupleSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseCurrency: CurrencySchema,
  splitDefaultMode: SplitModeSchema,
  memberIds: z.array(z.string()), // Length 2
  inviteCode: z.string(),
  fxRate: z.number().optional(),
  createdAt: z.date(),
});
export type Couple = z.infer<typeof CoupleSchema>;

// Users
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  passwordHash: z.string().optional(), // Omitted in public user
  avatarColor: z.string(),
  coupleId: z.string(),
  role: UserRoleSchema,
  createdAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const PublicUserSchema = UserSchema.omit({ passwordHash: true });
export type PublicUser = z.infer<typeof PublicUserSchema>;

// Incomes
export const IncomeTypeSchema = z.enum(["salary", "freelance", "bonus", "other"]);
export const IncomePeriodSchema = z.enum(["monthly", "one_time"]);

export const IncomeSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
  type: IncomeTypeSchema,
  period: IncomePeriodSchema,
  effectiveDate: z.date(),
  isActive: z.boolean(),
  notes: z.string().optional(),
});
export type Income = z.infer<typeof IncomeSchema>;

// Categories
export const CategoryKindSchema = z.enum(["shared", "personal", "both"]);

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  kind: CategoryKindSchema,
  coupleId: z.string(),
  isArchived: z.boolean(),
});
export type Category = z.infer<typeof CategorySchema>;

// Expenses
export const ExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
  amountBase: z.number(),
  fxRate: z.number(),
  fxDate: z.date(),
  date: z.date(),
  categoryId: z.string(),
  paidById: z.string(),
  splitMode: SplitModeSchema,
  splitShareA: z.number(), // 0 to 100
  splitShareB: z.number(),
  isShared: z.boolean(),
  isSettled: z.boolean(),
  settlementId: z.string().optional(),
  recurringSourceId: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
  createdById: z.string(),
  createdAt: z.date(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

// Goals
export const GoalContributionModeSchema = z.enum(["proportional", "equal", "custom"]);

export const GoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  currency: CurrencySchema,
  targetDate: z.date(),
  contributionMode: GoalContributionModeSchema,
  icon: z.string(),
  coupleId: z.string(),
  isAchieved: z.boolean(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const GoalContributionSchema = z.object({
  id: z.string(),
  name: z.string(),
  goalId: z.string(),
  userId: z.string(),
  amount: z.number(),
  currency: CurrencySchema,
  date: z.date(),
});
export type GoalContribution = z.infer<typeof GoalContributionSchema>;

// Presupuestos (límite por categoría y periodo de corte, en PEN)
export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
}

// Gastos recurrentes (plantillas mensuales)
export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  categoryId: string;
  paidById: string;
  splitMode: SplitMode;
  isShared: boolean;
  dayOfMonth: number;
  nextDate: Date;
  isActive: boolean;
}
