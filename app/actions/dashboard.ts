"use server";

import { auth } from "@/auth";
import { getIncomes } from "@/lib/repos/incomes";
import { getExpenses } from "@/lib/repos/expenses";
import { calculateEquity, calculateSettlementBalance, calculatePersonalLiquidity } from "@/lib/domain/split";
import { getCategories } from "@/lib/repos/categories";
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
  const categories = await getCategories(coupleId);
  
  // Calculate Equity
  const equity = calculateEquity(incomes, "PEN", (amount) => amount);
  
  // Calculate balances
  const balance = calculateSettlementBalance(expenses, currentUserId);

  // Calculate personal liquidity
  const liquidity = calculatePersonalLiquidity(incomes, expenses, currentUserId, equity.userA);
  
  return {
    equity,
    expenses: expenses.sort((a, b) => b.date.getTime() - a.date.getTime()),
    balance,
    liquidity,
    categories
  };
}
