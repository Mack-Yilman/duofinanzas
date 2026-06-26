import { Expense, Income, SplitMode } from "../types";
import { roundMoney } from "./money";

export function calculateEquity(incomes: Income[], baseCurrency: string, fxConvert: (amount: number, from: string, to: string) => number) {
  const activeMonthlyIncomes = incomes.filter(i => i.isActive && i.period === "monthly");
  
  const userIncomes = new Map<string, number>();
  for (const inc of activeMonthlyIncomes) {
    const baseAmount = fxConvert(inc.amount, inc.currency, baseCurrency);
    userIncomes.set(inc.userId, (userIncomes.get(inc.userId) || 0) + baseAmount);
  }

  const userIds = Array.from(userIncomes.keys()).sort();
  const idA = userIds[0] || "userA";
  const idB = userIds[1] || "userB";

  const incomeA = userIncomes.get(idA) || 0;
  const incomeB = userIncomes.get(idB) || 0;

  const total = incomeA + incomeB;
  
  if (total === 0) {
    return { shareA: 0.5, shareB: 0.5, incomeA: 0, incomeB: 0, userA: idA, userB: idB };
  }

  // Calculate percentages (0 to 1)
  const shareA = roundMoney(incomeA / total);
  const shareB = roundMoney(1 - shareA); // Ensure they sum to 1 exactly

  return {
    shareA,
    shareB,
    incomeA,
    incomeB,
    userA: idA,
    userB: idB
  };
}

export function calculateExpenseSplit(
  amount: number,
  mode: SplitMode,
  shareA: number, // 0 to 1
  shareB: number, // 0 to 1
  customShareA?: number, // 0 to 100
  customShareB?: number, // 0 to 100
  paidById?: string,
  userAId?: string
) {
  let quotaA = 0;
  let quotaB = 0;

  switch (mode) {
    case "proportional":
      quotaA = roundMoney(amount * shareA);
      quotaB = roundMoney(amount - quotaA);
      break;
    case "equal":
      quotaA = roundMoney(amount / 2);
      quotaB = roundMoney(amount - quotaA);
      break;
    case "custom":
      if (customShareA !== undefined && customShareB !== undefined) {
        quotaA = roundMoney(amount * (customShareA / 100));
        quotaB = roundMoney(amount - quotaA);
      }
      break;
    case "owner_100":
      if (paidById === userAId) {
        quotaA = amount;
        quotaB = 0;
      } else {
        quotaA = 0;
        quotaB = amount;
      }
      break;
  }

  return { quotaA, quotaB };
}

export function calculateSettlementBalance(expenses: Expense[], userAId: string) {
  let balanceA = 0;

  for (const exp of expenses) {
    if (!exp.isShared) continue;

    // A's required quota
    const quotaA = roundMoney(exp.amountBase * (exp.splitShareA / 100));
    
    // What A actually paid
    const paidByA = exp.paidById === userAId ? exp.amountBase : 0;
    
    // Balance for this expense: what A should have paid minus what A actually paid
    // If balanceA > 0, A owes money. If balanceA < 0, A overpaid (is owed money).
    balanceA += (quotaA - paidByA);
  }

  return roundMoney(balanceA);
}
