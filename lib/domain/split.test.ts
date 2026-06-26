import { describe, it, expect } from 'vitest';
import { calculateEquity, calculateExpenseSplit, calculateSettlementBalance } from './split';
import { Income, Expense } from '../types';

describe('split domain logic', () => {
  it('calculates equity correctly', () => {
    const incomes: Income[] = [
      {
        id: '1', name: 'Sueldo A', userId: 'userA', amount: 42000, currency: 'PEN', 
        type: 'salary', period: 'monthly', effectiveDate: new Date(), isActive: true
      },
      {
        id: '2', name: 'Sueldo B', userId: 'userB', amount: 63000, currency: 'PEN', 
        type: 'salary', period: 'monthly', effectiveDate: new Date(), isActive: true
      }
    ];

    const { shareA, shareB, incomeA, incomeB } = calculateEquity(incomes, 'PEN', (amt) => amt);

    expect(incomeA).toBe(42000);
    expect(incomeB).toBe(63000);
    expect(shareA).toBe(0.40);
    expect(shareB).toBe(0.60);
  });

  it('fallback to 50/50 if total income is 0', () => {
    const { shareA, shareB } = calculateEquity([], 'PEN', (amt) => amt);
    expect(shareA).toBe(0.5);
    expect(shareB).toBe(0.5);
  });

  it('calculates expense split properly (proportional)', () => {
    const amount = 2500;
    const { quotaA, quotaB } = calculateExpenseSplit(amount, 'proportional', 0.40, 0.60);
    expect(quotaA).toBe(1000);
    expect(quotaB).toBe(1500);
  });

  it('calculates expense split properly (equal)', () => {
    const amount = 2500;
    const { quotaA, quotaB } = calculateExpenseSplit(amount, 'equal', 0.40, 0.60);
    expect(quotaA).toBe(1250);
    expect(quotaB).toBe(1250);
  });

  it('calculates settlement balance correctly (A pays everything)', () => {
    // User A pays 2500. Quota was A=1000, B=1500.
    // So balanceA should be 1000 - 2500 = -1500. (Meaning B owes A 1500)
    const expenses: Partial<Expense>[] = [
      {
        isShared: true,
        amountBase: 2500,
        splitShareA: 40, // 40%
        splitShareB: 60,
        paidById: 'userA'
      }
    ];

    const balanceA = calculateSettlementBalance(expenses as Expense[], 'userA');
    expect(balanceA).toBe(-1500);
  });
});
