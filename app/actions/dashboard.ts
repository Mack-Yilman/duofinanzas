"use server";

import { auth } from "@/auth";
import { getIncomes } from "@/lib/repos/incomes";
import { getExpenses } from "@/lib/repos/expenses";
import { calculateEquity, calculateSettlementBalance, calculatePersonalLiquidity } from "@/lib/domain/split";
import { getCategories } from "@/lib/repos/categories";
import { getUsersByCoupleId } from "@/lib/repos/users";
import { unstable_cache } from "next/cache";

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  const coupleId = (session.user as any).coupleId;
  const currentUserId = session.user.id;
  
  if (!currentUserId || !coupleId) throw new Error("Invalid user session");
  
  // Fetch data
  const incomes = await getIncomes();
  const allExpenses = await getExpenses(coupleId);
  const categories = await getCategories(coupleId);
  const users = await getUsersByCoupleId(coupleId);
  const { getCouple } = await import("@/lib/repos/couples");
  const couple = await getCouple(coupleId);
  
  // Filter expenses: shared expenses + personal expenses of the current user
  const expenses = allExpenses.filter(exp => exp.isShared || exp.paidById === currentUserId);
  
  // Calculate Equity
  const equity = calculateEquity(incomes, "PEN", (amount) => amount);
  
  // Calculate balances
  const balance = calculateSettlementBalance(expenses, currentUserId);
  const liquidity = calculatePersonalLiquidity(incomes, expenses, currentUserId, equity.userA, couple.fxRate);

  const userA = users.find(u => u.id === equity.userA)?.name || "Usuario A";
  const userB = users.find(u => u.id === equity.userB)?.name || "Usuario B";

  return {
    equity: { ...equity, nameA: userA, nameB: userB },
    expenses: expenses.sort((a, b) => b.date.getTime() - a.date.getTime()),
    balance,
    liquidity,
    categories
  };
}
