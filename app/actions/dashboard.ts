"use server";

import { auth } from "@/auth";
import { getIncomes } from "@/lib/repos/incomes";
import { getExpenses } from "@/lib/repos/expenses";
import { calculateEquity, calculateSettlementBalance } from "@/lib/domain/split";
import { unstable_cache } from "next/cache";

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  const coupleId = (session.user as any).coupleId;
  const currentUserId = session.user.id;
  
  if (!currentUserId || !coupleId) throw new Error("Invalid user session");
  
  // Fetch data
  const incomes = await getIncomes();
  const expenses = await getExpenses(coupleId);
  
  // Calculate Equity
  // Simplification for prototype: 1:1 FX rate
  const equity = calculateEquity(incomes, "PEN", (amount) => amount);
  
  // Calculate balances
  // Positive balance means the current user owes money.
  const balance = calculateSettlementBalance(expenses, currentUserId);
  
  return {
    equity,
    expenses: expenses.sort((a, b) => b.date.getTime() - a.date.getTime()),
    balance
  };
}
