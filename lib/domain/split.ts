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

/**
 * Devuelve la cuota (monto que le corresponde aportar) de cada lado para un gasto,
 * en la moneda del gasto. `quotaA` corresponde al usuario A estable (id que ordena primero),
 * `quotaB` al usuario B. Para gastos personales, la cuota total recae en quien pagó.
 */
export function getExpenseShares(exp: Expense, userAId: string) {
  if (!exp.isShared) {
    const paidByA = exp.paidById === userAId;
    return { quotaA: paidByA ? exp.amount : 0, quotaB: paidByA ? 0 : exp.amount };
  }
  const quotaA = roundMoney(exp.amount * (exp.splitShareA / 100));
  const quotaB = roundMoney(exp.amount - quotaA);
  return { quotaA, quotaB };
}

/**
 * Balance neto del usuario logueado respecto a su pareja, por moneda.
 * Positivo  => el usuario actual LE DEBE a su pareja.
 * Negativo  => la pareja le debe al usuario actual.
 *
 * Calcula la cuota correcta del usuario actual (A o B) y le resta lo que realmente pagó,
 * de modo que el resultado sea consistente para AMBOS miembros (no invertido para el segundo).
 */
export function calculateSettlementBalance(expenses: Expense[], currentUserId: string, userAId: string) {
  const balances: Record<string, number> = {};

  for (const exp of expenses) {
    if (!exp.isShared || exp.isSettled) continue;

    const currency = exp.currency;
    if (!balances[currency]) balances[currency] = 0;

    const isCurrentA = currentUserId === userAId;
    const currentShare = isCurrentA ? exp.splitShareA : exp.splitShareB;
    const currentQuota = roundMoney(exp.amount * (currentShare / 100));
    const currentPaid = exp.paidById === currentUserId ? exp.amount : 0;

    // Lo que el usuario debía aportar menos lo que realmente puso.
    balances[currency] += (currentQuota - currentPaid);
  }

  for (const key in balances) {
    balances[key] = roundMoney(balances[key]);
  }

  return balances;
}

/**
 * Desglose BRUTO por moneda (no se netea en un solo número):
 *  - owedToYou: cuánto te deben en total (la pareja debe reembolsarte su cuota de lo que TÚ pagaste).
 *  - youOwe:    cuánto debes en total (tu cuota de lo que pagó la pareja).
 * El neto = owedToYou - youOwe.
 */
export function calculateBalanceBreakdown(expenses: Expense[], currentUserId: string, userAId: string) {
  const result: Record<string, { owedToYou: number; youOwe: number }> = {};

  for (const exp of expenses) {
    if (!exp.isShared || exp.isSettled) continue;
    const c = exp.currency;
    if (!result[c]) result[c] = { owedToYou: 0, youOwe: 0 };

    const isCurrentA = currentUserId === userAId;
    const currentQuota = roundMoney(exp.amount * ((isCurrentA ? exp.splitShareA : exp.splitShareB) / 100));
    const partnerQuota = roundMoney(exp.amount - currentQuota);

    if (exp.paidById === currentUserId) {
      // Tú pagaste el total → tu pareja te debe su cuota.
      result[c].owedToYou += partnerQuota;
    } else {
      // Pagó tu pareja → le debes tu cuota.
      result[c].youOwe += currentQuota;
    }
  }

  for (const k in result) {
    result[k].owedToYou = roundMoney(result[k].owedToYou);
    result[k].youOwe = roundMoney(result[k].youOwe);
  }

  return result;
}

/**
 * Cuánto puso realmente cada lado (el usuario actual vs su pareja) en los gastos
 * compartidos abiertos (no liquidados), por moneda. Sirve para la vista "global" de aportes.
 */
export function calculateContributions(expenses: Expense[], currentUserId: string) {
  const result: Record<string, { current: number; partner: number }> = {};

  for (const exp of expenses) {
    if (!exp.isShared || exp.isSettled) continue;
    const c = exp.currency;
    if (!result[c]) result[c] = { current: 0, partner: 0 };
    if (exp.paidById === currentUserId) result[c].current += exp.amount;
    else result[c].partner += exp.amount;
  }

  for (const k in result) {
    result[k].current = roundMoney(result[k].current);
    result[k].partner = roundMoney(result[k].partner);
  }

  return result;
}

export function calculatePersonalLiquidity(incomes: Income[], expenses: Expense[], userId: string, userAId: string, fxRate: number = 3.80) {
  const liquidity: Record<string, number> = {};

  // Add incomes
  for (const inc of incomes) {
    if (!inc.isActive) continue;
    if (inc.userId !== userId) continue;
    
    if (!liquidity[inc.currency]) liquidity[inc.currency] = 0;
    liquidity[inc.currency] += inc.amount;
  }

  // Deduct expenses
  for (const exp of expenses) {
    if (!exp.isShared) {
      if (exp.paidById === userId) {
        if (!liquidity[exp.currency]) liquidity[exp.currency] = 0;
        liquidity[exp.currency] -= exp.amount;
      }
    } else {
      if (!liquidity[exp.currency]) liquidity[exp.currency] = 0;
      const sharePct = userId === userAId ? exp.splitShareA : exp.splitShareB;
      const quota = roundMoney(exp.amount * (sharePct / 100));
      liquidity[exp.currency] -= quota;
    }
  }

  // Apply FX conversion for negative balances
  const currencies = Object.keys(liquidity);
  
  if (currencies.includes("USD") && liquidity["USD"] < 0 && liquidity["PEN"] > 0) {
    // We have negative USD, but positive PEN
    const deficitUSD = Math.abs(liquidity["USD"]);
    const equivalentPEN = deficitUSD * fxRate;
    
    if (liquidity["PEN"] >= equivalentPEN) {
      liquidity["PEN"] -= equivalentPEN;
      liquidity["USD"] = 0;
    } else {
      // PEN doesn't cover all USD deficit
      const coveredUSD = liquidity["PEN"] / fxRate;
      liquidity["USD"] += coveredUSD;
      liquidity["PEN"] = 0;
    }
  } else if (currencies.includes("PEN") && liquidity["PEN"] < 0 && liquidity["USD"] > 0) {
    // We have negative PEN, but positive USD
    const deficitPEN = Math.abs(liquidity["PEN"]);
    const equivalentUSD = deficitPEN / fxRate;
    
    if (liquidity["USD"] >= equivalentUSD) {
      liquidity["USD"] -= equivalentUSD;
      liquidity["PEN"] = 0;
    } else {
      // USD doesn't cover all PEN deficit
      const coveredPEN = liquidity["USD"] * fxRate;
      liquidity["PEN"] += coveredPEN;
      liquidity["USD"] = 0;
    }
  }

  for (const key in liquidity) {
    liquidity[key] = roundMoney(liquidity[key]);
  }

  return liquidity;
}
