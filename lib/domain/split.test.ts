import { describe, it, expect } from 'vitest';
import { calculateEquity, calculateExpenseSplit, calculateSettlementBalance, calculatePersonalLiquidity } from './split';
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

  it('calculates settlement balance consistently for both users (A pays everything)', () => {
    // User A pays 2500. Quota was A=1000 (40%), B=1500 (60%).
    const expenses: Partial<Expense>[] = [
      {
        isShared: true,
        isSettled: false,
        amount: 2500,
        currency: 'PEN',
        splitShareA: 40,
        splitShareB: 60,
        paidById: 'userA',
      },
    ];

    // Perspectiva de A: debía 1000, pagó 2500 → -1500 (la pareja le debe 1500).
    const balanceA = calculateSettlementBalance(expenses as Expense[], 'userA', 'userA');
    expect(balanceA['PEN']).toBe(-1500);

    // Perspectiva de B: debía 1500, pagó 0 → +1500 (B le debe 1500 a A).
    // Esto valida que el cálculo NO se invierte mal para el segundo usuario.
    const balanceB = calculateSettlementBalance(expenses as Expense[], 'userB', 'userA');
    expect(balanceB['PEN']).toBe(1500);
  });

  it('liquidez: flujo de caja según quién pagó y estado de liquidación', () => {
    const incomes: Income[] = [
      { id: '1', name: 'A', userId: 'userA', amount: 5500, currency: 'PEN', type: 'salary', period: 'monthly', effectiveDate: new Date(), isActive: true },
      { id: '2', name: 'B', userId: 'userB', amount: 4500, currency: 'PEN', type: 'salary', period: 'monthly', effectiveDate: new Date(), isActive: true },
    ];
    // Gasto compartido de 180 (55/45) pagado por A, NO liquidado.
    const unsettled: Partial<Expense>[] = [
      { isShared: true, isSettled: false, amount: 180, currency: 'PEN', splitShareA: 55, splitShareB: 45, paidById: 'userA' },
    ];

    // A fronteó los 180 completos; B aún no ve afectada su liquidez.
    expect(calculatePersonalLiquidity(incomes, unsettled as Expense[], 'userA', 'userA')['PEN']).toBe(5320);
    expect(calculatePersonalLiquidity(incomes, unsettled as Expense[], 'userB', 'userA')['PEN']).toBe(4500);

    // Una vez LIQUIDADO, cada uno asume su cuota (A recupera la parte de B).
    const settled = unsettled.map(e => ({ ...e, isSettled: true })) as Expense[];
    expect(calculatePersonalLiquidity(incomes, settled, 'userA', 'userA')['PEN']).toBe(5401); // 5500 - 99
    expect(calculatePersonalLiquidity(incomes, settled, 'userB', 'userA')['PEN']).toBe(4419); // 4500 - 81
  });

  it('liquidez: los aportes a metas descuentan de la persona que aportó', () => {
    const incomes: Income[] = [
      { id: '1', name: 'A', userId: 'userA', amount: 1000, currency: 'PEN', type: 'salary', period: 'monthly', effectiveDate: new Date(), isActive: true },
    ];
    const contribs = [{ userId: 'userA', amount: 100, currency: 'PEN' }];
    expect(calculatePersonalLiquidity(incomes, [], 'userA', 'userA', 3.8, contribs)['PEN']).toBe(900);
    // A otro usuario no le afecta.
    expect(calculatePersonalLiquidity(incomes, [], 'userB', 'userA', 3.8, contribs)['PEN'] ?? 0).toBe(0);
  });
});
