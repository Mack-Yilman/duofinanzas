"use server";

import { auth } from "@/auth";
import { getIncomes } from "@/lib/repos/incomes";
import { getExpenses } from "@/lib/repos/expenses";
import {
  calculateEquity,
  calculateSettlementBalance,
  calculatePersonalLiquidity,
  calculateContributions,
} from "@/lib/domain/split";
import { getCategories } from "@/lib/repos/categories";
import { getUsersByCoupleId } from "@/lib/repos/users";
import { getCouple } from "@/lib/repos/couples";

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const coupleId = (session.user as any).coupleId;
  const currentUserId = session.user.id;

  if (!currentUserId || !coupleId) throw new Error("Invalid user session");

  // Lecturas de Notion en PARALELO (antes eran 5 llamadas en secuencia → lento).
  const [incomes, allExpenses, categories, users, couple] = await Promise.all([
    getIncomes(),
    getExpenses(coupleId),
    getCategories(coupleId),
    getUsersByCoupleId(coupleId),
    getCouple(coupleId),
  ]);

  // Filter expenses: shared expenses + personal expenses of the current user
  const expenses = allExpenses.filter(exp => exp.isShared || exp.paidById === currentUserId);

  // Calculate Equity
  const equity = calculateEquity(incomes, "PEN", (amount) => amount);

  // Balance neto consistente para el usuario logueado + aportes de cada lado
  const balance = calculateSettlementBalance(expenses, currentUserId, equity.userA);
  const contributions = calculateContributions(expenses, currentUserId);
  const liquidity = calculatePersonalLiquidity(incomes, expenses, currentUserId, equity.userA, couple.fxRate);

  const userA = users.find(u => u.id === equity.userA)?.name || "Usuario A";
  const userB = users.find(u => u.id === equity.userB)?.name || "Usuario B";
  const partnerName = users.find(u => u.id !== currentUserId)?.name || "Tu pareja";

  return {
    equity: { ...equity, nameA: userA, nameB: userB },
    expenses: expenses.sort((a, b) => b.date.getTime() - a.date.getTime()),
    balance,
    contributions,
    liquidity,
    categories,
    users: users.map(u => ({ id: u.id, name: u.name, avatarColor: u.avatarColor })),
    currentUserId,
    partnerName,
    userAId: equity.userA,
  };
}
