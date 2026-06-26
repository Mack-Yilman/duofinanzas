import { describe, it, expect } from 'vitest';
import { roundMoney, formatMoney } from './money';

describe('money', () => {
  it('rounds money correctly', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10.00);
    expect(roundMoney(10.5)).toBe(10.50);
  });

  it('formats money correctly', () => {
    // Note: spaces might vary based on locale implementation (narrow vs non-breaking)
    const formatted = formatMoney(10.5, 'PEN', 'es-PE');
    expect(formatted).toContain('10.50');
    expect(formatted).toContain('S/');
  });
});
